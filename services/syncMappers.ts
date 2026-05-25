/**
 * services/syncMappers.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Mappers puros entre domínio (types/pet.ts, types/auth.ts) e linhas do
 * Supabase. Extraído do SyncService pra ser testável sem mock de Supabase.
 *
 * Princípios:
 *  - DB-side: snake_case (`group_id`, `invite_code`, `foto_url`)
 *  - Domain-side: camelCase (`groupId`, `inviteCode`, `foto`)
 *  - Nullable: domínio usa `undefined` (optional fields), DB usa `null`
 *  - Round-trip: domain → row → domain deve ser idempotente pros campos
 *    que existem em ambos os lados (modulo a foto_url, que tem regra
 *    especial: só sobe se for URL remota)
 *
 * Type safety: `unknown` ao invés de `any` nos rows vindos do Supabase.
 * Cada mapper faz narrow explícito do shape esperado. Erros de shape
 * (campo faltando) viram fallback razoável, não throw.
 */

import type {
  ActionKey, ActionLog, MedicalEvent, MedicalEventType,
  Vaccine, Appointment, WeightEntry, PetProfile,
} from '@/types/pet';
import type { FamilyGroup, FamilyMember } from '@/types/auth';

// ─── Util — narrow seguro ──────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object') ? (v as Record<string, unknown>) : {};
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

// ─── Domain → Row ─────────────────────────────────────────────────────

export function actionLogToRow(log: ActionLog, groupId: string, userId: string) {
  return {
    id:        log.id,
    group_id:  groupId,
    user_id:   userId,
    // DB-002: associa ação ao pet (multi-pet). Nullable pra back-compat
    // com logs antigos sem petId (pré-migration).
    pet_id:    log.petId ?? null,
    key:       log.key,
    timestamp: log.timestamp,
    note:      log.note ?? null,
    // foto fica fora — requer Supabase Storage; ver SECURITY no SyncService
  };
}

export function vaccineToRow(v: Vaccine, groupId: string) {
  return {
    id:          v.id,
    group_id:    groupId,
    nome:        v.nome,
    data:        v.data,
    proxima:     v.proxima     ?? null,
    veterinario: v.veterinario ?? null,
    lote:        v.lote        ?? null,
    nota:        v.nota        ?? null,
  };
}

export function appointmentToRow(a: Appointment, groupId: string) {
  return {
    id:          a.id,
    group_id:    groupId,
    titulo:      a.titulo,
    data:        a.data,
    hora:        a.hora        ?? null,
    veterinario: a.veterinario ?? null,
    nota:        a.nota        ?? null,
  };
}

export function weightEntryToRow(w: WeightEntry, groupId: string) {
  return {
    id:       w.id,
    group_id: groupId,
    peso:     w.peso,
    data:     w.data,
    nota:     w.nota ?? null,
  };
}

export function petProfileToRow(pet: PetProfile, groupId: string) {
  return {
    // DB-002: id agora é PK no schema (migration 017). Cliente passa o
    // UUID gerado em store.addPet/completeOnboarding. Permite upsert
    // por id (multi-pet) sem colisões com outros pets do mesmo group.
    ...(pet.id ? { id: pet.id } : {}),
    group_id:   groupId,
    nome:       pet.nome,
    tipo:       pet.tipo,
    raca:       pet.raca || null,
    // Regra especial: só sobe foto remota (URL). URI local não vai
    // pra nuvem nesta versão (precisa de Supabase Storage).
    foto_url:   pet.foto?.startsWith('http') ? pet.foto : null,
    nascimento: pet.nascimento ?? null,
  };
}

/**
 * Row → PetProfile. Usado pela hidratação ao logar em device novo.
 * Foto vem como URL remota (Supabase nunca persiste URI local).
 * Campos nutricionais não são sincronizados nesta versão (ficam
 * só no MMKV local) — adicionar quando schema do Supabase suportar.
 */
export function rowToPetProfile(raw: unknown): PetProfile {
  const r = asRecord(raw);
  return {
    ...(optStr(r.id) ? { id: optStr(r.id)! } : {}),
    nome:       asStr(r.nome),
    tipo:       (asStr(r.tipo, 'cachorro') as PetProfile['tipo']),
    raca:       asStr(r.raca, ''),
    foto:       asStr(r.foto_url, ''),
    ...(optStr(r.nascimento) ? { nascimento: optStr(r.nascimento)! } : {}),
  };
}

// ─── Row → Domain ─────────────────────────────────────────────────────

export function rowToActionLog(raw: unknown): ActionLog {
  const r = asRecord(raw);
  return {
    id:        asStr(r.id),
    ...(optStr(r.pet_id) ? { petId: optStr(r.pet_id)! } : {}),
    key:       asStr(r.key) as ActionKey,
    timestamp: asNum(r.timestamp),
    ...(optStr(r.note) ? { note: optStr(r.note)! } : {}),
  };
}

export function rowToVaccine(raw: unknown): Vaccine {
  const r = asRecord(raw);
  return {
    id:   asStr(r.id),
    nome: asStr(r.nome),
    data: asStr(r.data),
    ...(optStr(r.proxima)     ? { proxima:     optStr(r.proxima)! }     : {}),
    ...(optStr(r.veterinario) ? { veterinario: optStr(r.veterinario)! } : {}),
    ...(optStr(r.lote)        ? { lote:        optStr(r.lote)! }        : {}),
    ...(optStr(r.nota)        ? { nota:        optStr(r.nota)! }        : {}),
  };
}

export function rowToAppointment(raw: unknown): Appointment {
  const r = asRecord(raw);
  return {
    id:     asStr(r.id),
    titulo: asStr(r.titulo),
    data:   asStr(r.data),
    ...(optStr(r.hora)        ? { hora:        optStr(r.hora)! }        : {}),
    ...(optStr(r.veterinario) ? { veterinario: optStr(r.veterinario)! } : {}),
    ...(optStr(r.nota)        ? { nota:        optStr(r.nota)! }        : {}),
  };
}

export function rowToWeightEntry(raw: unknown): WeightEntry {
  const r = asRecord(raw);
  return {
    id:   asStr(r.id),
    peso: asNum(r.peso),
    data: asStr(r.data),
    ...(optStr(r.nota) ? { nota: optStr(r.nota)! } : {}),
  };
}

// ─── Family group/member ──────────────────────────────────────────────

export function dbGroupToFamilyGroup(raw: unknown): FamilyGroup {
  const r = asRecord(raw);
  return {
    id:         asStr(r.id),
    nome:       asStr(r.nome),
    inviteCode: asStr(r.invite_code),
    ownerId:    asStr(r.owner_id),
  };
}

/**
 * `raw` é a row de `family_members` joined com `profiles`. Tolerante a
 * profiles missing — usa o user_id direto se profile não carregou.
 */
export function dbMemberToFamilyMember(raw: unknown): FamilyMember {
  const r = asRecord(raw);
  const profile = asRecord(r.profiles);
  const email = asStr(profile.email);
  return {
    userId:   asStr(profile.id) || asStr(r.user_id),
    nome:     asStr(profile.nome) || (email ? email.split('@')[0] : 'Membro'),
    email,
    role:     (r.role === 'owner' ? 'owner' : 'member'),
    joinedAt: asStr(r.joined_at),
  };
}

// ─── Realtime payload mapper ──────────────────────────────────────────

/**
 * Filtra payloads de realtime que devem ser ignorados (eco do próprio
 * usuário) e mapeia pra ActionLog. Retorna null se for pra ignorar.
 */
export function realtimePayloadToActionLog(
  raw: unknown,
  myUserId: string,
): ActionLog | null {
  const r = asRecord(raw);
  if (asStr(r.user_id) === myUserId) return null;
  return rowToActionLog(raw);
}
