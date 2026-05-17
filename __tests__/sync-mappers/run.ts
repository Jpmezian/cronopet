/**
 * Suite — services/syncMappers.ts
 *
 * Mappers Domain↔Row do Supabase. Bug aqui = dados perdidos ou corrompidos
 * na sincronização família-sharing. Casos cobertos:
 *
 *  Domain → Row:
 *   - actionLogToRow inclui groupId/userId; note opcional vira null
 *   - vaccineToRow: 4 campos opcionais (proxima, veterinario, lote, nota)
 *     viram null quando undefined
 *   - appointmentToRow: hora/veterinario/nota null-safe
 *   - weightEntryToRow: nota null-safe
 *   - petProfileToRow: foto LOCAL vira null (regra crítica de privacidade)
 *   - petProfileToRow: foto REMOTA (http://) sobe como foto_url
 *
 *  Row → Domain:
 *   - rowToActionLog: note opcional só vem se string não-vazia
 *   - rowToVaccine: 4 campos opcionais aplicam mesma regra
 *   - rowToWeightEntry: peso aceito como string ou number (Supabase numeric)
 *   - rowToAppointment: todos opcionais coerentes
 *
 *  Round-trip: domain → row → domain idempotente pros campos comuns.
 *
 *  Family group/member:
 *   - dbGroupToFamilyGroup: snake_case → camelCase (invite_code → inviteCode)
 *   - dbMemberToFamilyMember: profile faltante = fallback razoável
 *   - dbMemberToFamilyMember: role normaliza pra owner|member
 *
 *  Realtime:
 *   - echo do próprio usuário vira null (ignorado)
 *   - log de outro membro vira ActionLog
 */

import {
  actionLogToRow, vaccineToRow, appointmentToRow, weightEntryToRow,
  petProfileToRow,
  rowToActionLog, rowToVaccine, rowToAppointment, rowToWeightEntry,
  dbGroupToFamilyGroup, dbMemberToFamilyMember,
  realtimePayloadToActionLog,
} from '@/services/syncMappers';
import {
  assertEq, assertNull, assertNotNull, assertTrue, runSuite,
} from '../_lib/assert';

const GROUP = 'g-abc';
const USER = 'u-xyz';

runSuite('services/syncMappers', [
  // ─── Domain → Row ───────────────────────────────────────────

  {
    name: '01. actionLogToRow inclui groupId+userId; note undefined → null',
    fn: () => {
      const row = actionLogToRow(
        { id: 'a1', key: 'comida', timestamp: 1700000000000 },
        GROUP, USER,
      );
      assertEq(row.group_id, GROUP);
      assertEq(row.user_id, USER);
      assertEq(row.key, 'comida');
      assertEq(row.timestamp, 1700000000000);
      assertEq(row.note, null, 'note ausente vira null');
    },
  },

  {
    name: '02. vaccineToRow: 4 opcionais undefined viram null',
    fn: () => {
      const row = vaccineToRow(
        { id: 'v1', nome: 'V10', data: '2026-01-15' },
        GROUP,
      );
      assertEq(row.proxima, null);
      assertEq(row.veterinario, null);
      assertEq(row.lote, null);
      assertEq(row.nota, null);
    },
  },

  {
    name: '03. appointmentToRow preserva opcionais quando preenchidos',
    fn: () => {
      const row = appointmentToRow(
        { id: 'ap1', titulo: 'Check-up', data: '2026-06-15', hora: '14:30', nota: 'jejum' },
        GROUP,
      );
      assertEq(row.hora, '14:30');
      assertEq(row.nota, 'jejum');
      assertEq(row.veterinario, null, 'não preenchido vira null');
    },
  },

  {
    name: '04. weightEntryToRow: nota null-safe',
    fn: () => {
      const r1 = weightEntryToRow({ id: 'w1', peso: 6.5, data: '2026-05-17' }, GROUP);
      assertEq(r1.nota, null);
      const r2 = weightEntryToRow({ id: 'w2', peso: 6.4, data: '2026-05-18', nota: 'após banho' }, GROUP);
      assertEq(r2.nota, 'após banho');
    },
  },

  {
    name: '05. petProfileToRow: foto LOCAL nunca sobe (privacidade)',
    fn: () => {
      // URI file:// é local — não pode ir pra nuvem nesta versão
      const row = petProfileToRow(
        { nome: 'Bidu', tipo: 'cachorro', raca: 'Labrador', foto: 'file:///var/mobile/photo.jpg' },
        GROUP,
      );
      assertEq(row.foto_url, null, 'URI local NUNCA vira foto_url — bloqueio de privacidade');
      assertEq(row.nome, 'Bidu');
    },
  },

  {
    name: '06. petProfileToRow: foto REMOTA (http://) é permitida',
    fn: () => {
      const row = petProfileToRow(
        { nome: 'Bidu', tipo: 'cachorro', raca: 'Labrador', foto: 'https://images.example.com/x.jpg' },
        GROUP,
      );
      assertEq(row.foto_url, 'https://images.example.com/x.jpg');
    },
  },

  // ─── Row → Domain ───────────────────────────────────────────

  {
    name: '07. rowToActionLog: note só aparece quando string não-vazia',
    fn: () => {
      const log1 = rowToActionLog({ id: 'a1', key: 'agua', timestamp: 1700000000000 });
      assertEq(log1.note, undefined, 'note ausente fica undefined (não null)');

      const log2 = rowToActionLog({ id: 'a2', key: 'agua', timestamp: 1700000000000, note: '' });
      assertEq(log2.note, undefined, 'string vazia também vira undefined');

      const log3 = rowToActionLog({ id: 'a3', key: 'agua', timestamp: 1700000000000, note: 'bebeu pouco' });
      assertEq(log3.note, 'bebeu pouco');
    },
  },

  {
    name: '08. rowToVaccine: 4 opcionais aplicam regra string-não-vazia',
    fn: () => {
      const v = rowToVaccine({
        id: 'v1', nome: 'V10', data: '2026-01-15',
        proxima: null, veterinario: '', lote: 'LOTE-X', nota: undefined,
      });
      assertEq(v.proxima, undefined, 'null → undefined');
      assertEq(v.veterinario, undefined, 'string vazia → undefined');
      assertEq(v.lote, 'LOTE-X', 'string válida preservada');
      assertEq(v.nota, undefined);
    },
  },

  {
    name: '09. rowToWeightEntry: peso aceito como string OU number (Postgres numeric)',
    fn: () => {
      const w1 = rowToWeightEntry({ id: 'w1', peso: 6.5, data: '2026-05-17' });
      assertEq(w1.peso, 6.5);

      // Supabase às vezes serializa numeric como string
      const w2 = rowToWeightEntry({ id: 'w2', peso: '6.42', data: '2026-05-17' });
      assertEq(w2.peso, 6.42, 'string numérica é coerced via Number()');
    },
  },

  {
    name: '10. rowToAppointment: round-trip preserva todos os campos',
    fn: () => {
      const original = {
        id: 'ap1', titulo: 'Vacina V10', data: '2026-06-15',
        hora: '09:00', veterinario: 'Dra. Ana', nota: 'levar carteirinha',
      };
      const row = appointmentToRow(original, GROUP);
      const restored = rowToAppointment(row);
      assertEq(restored.id, original.id);
      assertEq(restored.titulo, original.titulo);
      assertEq(restored.data, original.data);
      assertEq(restored.hora, original.hora);
      assertEq(restored.veterinario, original.veterinario);
      assertEq(restored.nota, original.nota);
    },
  },

  // ─── Family group/member ────────────────────────────────────

  {
    name: '11. dbGroupToFamilyGroup: snake_case → camelCase (invite_code → inviteCode)',
    fn: () => {
      const g = dbGroupToFamilyGroup({
        id: 'g-abc', nome: 'Família Silva',
        invite_code: 'AB12CDEF', owner_id: 'u-xyz',
      });
      assertEq(g.id, 'g-abc');
      assertEq(g.nome, 'Família Silva');
      assertEq(g.inviteCode, 'AB12CDEF', 'rename crítico — UI lê inviteCode');
      assertEq(g.ownerId, 'u-xyz');
    },
  },

  {
    name: '12. dbMemberToFamilyMember: fallback nome quando só tem email',
    fn: () => {
      const m = dbMemberToFamilyMember({
        role: 'member',
        joined_at: '2026-01-15T10:00:00Z',
        profiles: { id: 'u-1', nome: null, email: 'joao.silva@example.com' },
      });
      assertEq(m.userId, 'u-1');
      assertEq(m.nome, 'joao.silva', 'fallback pra local-part do email quando nome=null');
      assertEq(m.email, 'joao.silva@example.com');
      assertEq(m.role, 'member');
    },
  },

  {
    name: '13. dbMemberToFamilyMember: profile faltante = fallback gracioso',
    fn: () => {
      // Caso edge: profile não carregou no join
      const m = dbMemberToFamilyMember({
        role: 'owner',
        joined_at: '2026-01-15',
        user_id: 'u-fallback',
        profiles: null,
      });
      assertEq(m.userId, 'u-fallback', 'usa user_id direto se profile null');
      assertEq(m.role, 'owner');
      assertTrue(typeof m.nome === 'string', 'nome sempre tem fallback (não crash)');
    },
  },

  {
    name: '14. dbMemberToFamilyMember: role inválido vira "member" (default seguro)',
    fn: () => {
      const m = dbMemberToFamilyMember({
        role: 'admin-injected', // valor inesperado
        joined_at: '2026-01-15',
        profiles: { id: 'u-1', email: 'a@b.co' },
      });
      assertEq(m.role, 'member', 'role desconhecido vira member, não dá acesso de owner');
    },
  },

  // ─── Realtime ───────────────────────────────────────────────

  {
    name: '15. realtimePayloadToActionLog: eco do próprio user → null (ignorar)',
    fn: () => {
      const log = realtimePayloadToActionLog(
        { id: 'a1', key: 'comida', timestamp: 1700000000000, user_id: 'me' },
        'me',
      );
      assertNull(log, 'meu próprio insert volta como echo do Supabase realtime');
    },
  },

  {
    name: '16. realtimePayloadToActionLog: log de outro membro vira ActionLog',
    fn: () => {
      const log = realtimePayloadToActionLog(
        { id: 'a2', key: 'agua', timestamp: 1700000000000, user_id: 'wife', note: 'pet teve sede' },
        'me',
      );
      assertNotNull(log);
      assertEq(log.id, 'a2');
      assertEq(log.key, 'agua');
      assertEq(log.note, 'pet teve sede');
    },
  },
]);
