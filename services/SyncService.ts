import * as Sentry from '@sentry/react-native';
import { getSupabase } from './supabase';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { FamilyGroup, FamilyMember } from '@/types/auth';
import type {
  ActionLog, PetProfile,
  Vaccine, Appointment, WeightEntry,
} from '@/types/pet';
import {
  actionLogToRow, vaccineToRow, appointmentToRow, weightEntryToRow,
  petProfileToRow,
  rowToActionLog, rowToVaccine, rowToAppointment, rowToWeightEntry,
  rowToPetProfile,
  dbGroupToFamilyGroup, dbMemberToFamilyMember,
  realtimePayloadToActionLog,
} from './syncMappers';

// ─── Canal ativo (singleton) ──────────────────────────────────

let activeChannel: RealtimeChannel | null = null;

// ─── Helpers ──────────────────────────────────────────────────
//
// Cache local do client pra permitir acesso síncrono em
// `unsubscribeAll` (após primeira chamada async, qualquer acesso
// é cheap). `getSupabase()` já é singleton-promise, mas guardar
// a ref resolvida evita um await desnecessário em hot paths.

let _client: SupabaseClient | null = null;
async function client(): Promise<SupabaseClient> {
  if (_client) return _client;
  _client = await getSupabase();
  return _client;
}

async function getUid(): Promise<string> {
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return user.id;
}

// ─── Family Group ─────────────────────────────────────────────

/**
 * Cria um grupo familiar e sincroniza o perfil local do pet.
 * Retorna o grupo criado com o código de convite.
 */
export async function createFamilyGroup(
  groupNome: string,
  pet:       PetProfile,
): Promise<FamilyGroup> {
  const uid = await getUid();
  const supabase = await client();

  const { data: group, error } = await supabase
    .from('family_groups')
    .insert({ nome: groupNome, owner_id: uid })
    .select()
    .single();
  if (error) throw error;

  // Owner entra como membro imediatamente
  await supabase.from('family_members')
    .insert({ group_id: group.id, user_id: uid, role: 'owner' })
    .throwOnError();

  await supabase.from('pets').insert(petProfileToRow(pet, group.id)).throwOnError();

  return dbGroupToFamilyGroup(group);
}

/**
 * Entra em um grupo existente pelo código de convite.
 *
 * SECURITY (auditoria 2026-05-24, finding #16): usa RPC
 * `redeem_invite_code` em vez de SELECT direto. Motivos:
 *   1. RLS de family_groups bloqueia SELECT pra non-members → SELECT
 *      direto retornava 0 rows sempre. Feature era inoperante.
 *   2. RPC tem rate limit interno (5 attempts/min/user) → bloqueia
 *      enumeration attack (36^6 = 2.17B combos / brute-force).
 *   3. RPC retorna mesma mensagem pra inválido/expirado/rate-limited →
 *      sem oracle de timing/conteúdo.
 *   4. INSERT em family_members vira atômico dentro da RPC.
 */
export async function joinFamilyGroup(code: string): Promise<FamilyGroup> {
  await getUid(); // valida que está autenticado (RPC também valida)
  const supabase = await client();

  const { data, error } = await supabase.rpc('redeem_invite_code', {
    p_code: code,
  });

  if (error) {
    // RPC levanta exception com message 'invalid_code' tanto pra
    // inválido quanto pra rate-limited. Cliente mostra mensagem genérica.
    if (error.message?.includes('invalid_code')) {
      throw new Error('Código inválido ou não encontrado.');
    }
    if (error.message?.includes('unauthenticated')) {
      throw new Error('Você precisa estar logado para entrar em um grupo.');
    }
    throw new Error('Não foi possível entrar no grupo. Tente novamente.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.out_group_id) {
    throw new Error('Código inválido ou não encontrado.');
  }

  // Carrega o grupo completo (incluindo invite_code, owner_id) — agora
  // tem permissão de SELECT porque a RPC já fez o INSERT em members.
  const { data: group, error: gErr } = await supabase
    .from('family_groups')
    .select()
    .eq('id', row.out_group_id)
    .single();
  if (gErr || !group) throw new Error('Não foi possível carregar o grupo.');

  return dbGroupToFamilyGroup(group);
}

/**
 * Retorna o grupo do usuário logado (null se não estiver em nenhum).
 */
export async function getMyFamilyGroup(): Promise<FamilyGroup | null> {
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('family_members')
    .select('family_groups(id, nome, invite_code, owner_id)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!data || !data.family_groups) return null;
  return dbGroupToFamilyGroup(data.family_groups);
}

/**
 * Lista os membros de um grupo com nome e e-mail.
 */
export async function getFamilyMembers(groupId: string): Promise<FamilyMember[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('family_members')
    .select('role, joined_at, profiles(id, nome, email)')
    .eq('group_id', groupId);
  if (error || !data) return [];

  return data.map(dbMemberToFamilyMember);
}

// ─── Sync — push data ─────────────────────────────────────────

/** Sincroniza um registro de ação para a nuvem (fire-and-forget). */
export function pushActionLog(groupId: string, userId: string, log: ActionLog): void {
  // SECURITY: timeout de 10s — não deixar sync hangar indefinidamente.
  // foto não sincronizada nesta versão — requer Supabase Storage.
  // Fire-and-forget mantido — só `await client()` pra resolver o singleton.
  client().then((supabase) => {
    const op = supabase.from('action_logs').upsert(actionLogToRow(log, groupId, userId));
    const timer = setTimeout(() => {
      Sentry.captureMessage('[Sync] pushActionLog timeout (10s)', 'warning');
    }, 10_000);
    op.then(({ error }) => {
      clearTimeout(timer);
      if (error) {
        Sentry.captureException(new Error(error.message), { tags: { op: 'pushActionLog' } });
      }
    });
  }).catch((err) => {
    Sentry.captureException(err, { tags: { op: 'pushActionLog.clientInit' } });
  });
}

/** Sincroniza todo o histórico de ações (bulk upsert). */
export async function pushAllActionLogs(
  groupId: string,
  userId:  string,
  logs:    ActionLog[],
): Promise<void> {
  if (!logs.length) return;
  const supabase = await client();
  const rows = logs.map((l) => actionLogToRow(l, groupId, userId));
  const { error } = await supabase.from('action_logs').upsert(rows);
  if (error) {
    Sentry.captureException(new Error(error.message), { tags: { op: 'pushAllActionLogs' } });
  }
}

/** Sincroniza vacinas. */
export async function pushVaccines(groupId: string, vaccines: Vaccine[]): Promise<void> {
  if (!vaccines.length) return;
  const supabase = await client();
  await supabase.from('vaccines').upsert(vaccines.map((v) => vaccineToRow(v, groupId)));
}

/** Sincroniza consultas. */
export async function pushAppointments(groupId: string, appts: Appointment[]): Promise<void> {
  if (!appts.length) return;
  const supabase = await client();
  await supabase.from('appointments').upsert(appts.map((a) => appointmentToRow(a, groupId)));
}

/** Sincroniza histórico de peso. */
export async function pushWeightHistory(groupId: string, entries: WeightEntry[]): Promise<void> {
  if (!entries.length) return;
  const supabase = await client();
  await supabase.from('weight_entries').upsert(entries.map((w) => weightEntryToRow(w, groupId)));
}

/**
 * Sincroniza TODOS os dados locais ao entrar/criar um grupo.
 * Chamado uma vez no momento do onboarding premium.
 */
export async function initialFullSync(
  groupId:      string,
  userId:       string,
  actionLogs:   ActionLog[],
  vaccines:     Vaccine[],
  appointments: Appointment[],
  weightHistory: WeightEntry[],
): Promise<void> {
  await Promise.all([
    pushAllActionLogs(groupId, userId, actionLogs),
    pushVaccines(groupId, vaccines),
    pushAppointments(groupId, appointments),
    pushWeightHistory(groupId, weightHistory),
  ]);
}

// ─── Realtime ─────────────────────────────────────────────────

/**
 * Abre canal realtime para receber logs de outros membros em tempo real.
 * `onInsert` é chamado com cada novo log vindo da nuvem.
 * O log do próprio usuário não precisa ser tratado (já está no store local).
 */
export async function subscribeToFamilyLogs(
  groupId:  string,
  myUserId: string,
  onInsert: (log: ActionLog) => void,
): Promise<void> {
  unsubscribeAll();
  const supabase = await client();

  activeChannel = supabase
    .channel(`cronopet-group-${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'action_logs', filter: `group_id=eq.${groupId}` },
      (payload) => {
        const log = realtimePayloadToActionLog(payload.new, myUserId);
        if (log) onInsert(log);
      },
    )
    .subscribe();
}

/**
 * Cancela todas as assinaturas realtime.
 * SÍNCRONO porque cleanup paths (route unmount, signOut) precisam
 * rodar sem await. Usa o cache local `_client` populado em qualquer
 * chamada async anterior — se ainda for null (caller antes do client
 * resolver), é no-op porque também não há activeChannel.
 */
export function unsubscribeAll(): void {
  if (activeChannel && _client) {
    _client.removeChannel(activeChannel);
    activeChannel = null;
  }
}

/**
 * Baixa todos os dados de um grupo da nuvem.
 * Usado quando um membro entra em um grupo existente para hidratar o store local.
 */
export async function pullGroupData(groupId: string): Promise<{
  actionLogs:    ActionLog[];
  vaccines:      Vaccine[];
  appointments:  Appointment[];
  weightHistory: WeightEntry[];
}> {
  const supabase = await client();
  const [logsRes, vaccinesRes, apptsRes, weightRes] = await Promise.all([
    supabase.from('action_logs')
      .select('*').eq('group_id', groupId).order('timestamp', { ascending: false }),
    supabase.from('vaccines')
      .select('*').eq('group_id', groupId).order('data', { ascending: false }),
    supabase.from('appointments')
      .select('*').eq('group_id', groupId).order('data', { ascending: false }),
    supabase.from('weight_entries')
      .select('*').eq('group_id', groupId).order('data', { ascending: false }),
  ]);

  return {
    actionLogs:    (logsRes.data     ?? []).map(rowToActionLog),
    vaccines:      (vaccinesRes.data ?? []).map(rowToVaccine),
    appointments:  (apptsRes.data    ?? []).map(rowToAppointment),
    weightHistory: (weightRes.data   ?? []).map(rowToWeightEntry),
  };
}

/**
 * Pulla o pet do grupo familiar. MVP: assume 1 pet por grupo (futuro
 * multi-pet pulla array). Retorna null se group ainda sem pet.
 */
/**
 * DEPRECATED (mantido pra compat): pulla apenas o primeiro pet.
 * Use pullPets() pra multi-pet (DB-002 onda 4).
 */
export async function pullPet(groupId: string): Promise<PetProfile | null> {
  const all = await pullPets(groupId);
  return all[0] ?? null;
}

/**
 * DB-002 onda 4: pulla TODOS os pets ativos do group (não-deletados).
 * Usado pelo hydrateFromCloud pra popular pets{} no store.
 */
export async function pullPets(groupId: string): Promise<PetProfile[]> {
  const supabase = await client();
  const { data } = await supabase
    .from('pets')
    .select('*')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return (data ?? []).map(rowToPetProfile);
}

/**
 * Upsert do pet no Supabase. MVP: 1 pet por grupo identificado por nome.
 * Quando schema suportar pet.id no client, trocar pra upsert por id.
 * Fire-and-forget — não bloqueia UI. Erros vão pro Sentry.
 */
export function pushPet(groupId: string, pet: PetProfile): void {
  const row = petProfileToRow(pet, groupId);
  // Fire-and-forget mantido. Inner promise chain resolve o client.
  client().then((supabase) => {
    // Upsert: se já tem pet pro group, update; senão insert.
    // DB-002: pets PK agora é id (não group_id). Upsert por id permite
    // multi-pet sem colisão entre pets do mesmo group.
    supabase
      .from('pets')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: false })
      .then(({ error }) => {
        if (error) {
          Sentry.captureException(new Error(error.message), { tags: { op: 'pushPet' } });
        }
      });
  }).catch((err) => {
    Sentry.captureException(err, { tags: { op: 'pushPet.clientInit' } });
  });
}

// ─── Auto-sync helpers (Sprint AUTH Fase 4) ──────────────────
//
// Wrappers fire-and-forget chamados pelo store em cada mutação. Cada
// um faz: get session → get group → push. Se !session OU !group ou
// erro → silencioso (Sentry registra). Não bloqueia a UI.
//
// Custo: ~2 round-trips Supabase por mutação (getSession + push).
// getSession() é cached pelo SDK, então tipicamente é 1 RTT real.
// Pra throughput crítico (bulk register), considerar batching no futuro.

async function getSessionUser(): Promise<{ uid: string; groupId: string } | null> {
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // getMyFamilyGroup já chama getUser internamente — eficiente
  const group = await getMyFamilyGroup();
  if (!group) return null;
  return { uid: user.id, groupId: group.id };
}

/** Auto-sync pet: chamado em completeOnboarding e updatePetProfile. */
export function autoSyncPet(pet: PetProfile): void {
  getSessionUser().then((ctx) => {
    if (!ctx) return;
    pushPet(ctx.groupId, pet);
  }).catch(() => { /* silencioso */ });
}

/** Auto-sync action log: chamado em addActionLog. */
export function autoSyncActionLog(log: ActionLog): void {
  getSessionUser().then((ctx) => {
    if (!ctx) return;
    pushActionLog(ctx.groupId, ctx.uid, log);
  }).catch(() => { /* silencioso */ });
}

/** Auto-sync delete de action log: chamado em removeActionLog. */
export function autoSyncDeleteActionLog(logId: string): void {
  getSessionUser().then(async (ctx) => {
    if (!ctx) return;
    const supabase = await client();
    supabase.from('action_logs').delete().eq('id', logId).then(({ error }) => {
      if (error) {
        Sentry.captureException(new Error(error.message), { tags: { op: 'autoSyncDeleteActionLog' } });
      }
    });
  }).catch(() => { /* silencioso */ });
}

/** Auto-sync vacina (insert/update via upsert). */
export function autoSyncVaccine(v: Vaccine): void {
  getSessionUser().then((ctx) => {
    if (!ctx) return;
    pushVaccines(ctx.groupId, [v]).catch(() => {});
  }).catch(() => { /* silencioso */ });
}

/** Auto-sync consulta. */
export function autoSyncAppointment(a: Appointment): void {
  getSessionUser().then((ctx) => {
    if (!ctx) return;
    pushAppointments(ctx.groupId, [a]).catch(() => {});
  }).catch(() => { /* silencioso */ });
}

/** Auto-sync entrada de peso. */
export function autoSyncWeightEntry(w: WeightEntry): void {
  getSessionUser().then((ctx) => {
    if (!ctx) return;
    pushWeightHistory(ctx.groupId, [w]).catch(() => {});
  }).catch(() => { /* silencioso */ });
}

/**
 * Hidratação completa após login (em device novo ou re-login).
 * Pulla: family_group → pet → action_logs → vaccines → appointments → weight.
 *
 * Retorna snapshot pronto pra passar pro store.hydrateFromCloud.
 *
 * SEMÂNTICA: se user não tem group ainda (signup recém-feito, trigger
 * 011 não rodou por algum motivo), retorna null. Caller decide o que
 * fazer (esperar, criar group manualmente, mostrar erro).
 */
export async function hydrateFromCloud(): Promise<{
  /** DEPRECATED: primeiro pet do group (mantido pra back-compat com
   *  callers antigos). Use `pets` pra multi-pet. */
  pet:           PetProfile | null;
  /** DB-002 onda 4: array de todos os pets ativos do group. */
  pets:          PetProfile[];
  groupId:       string;
  actionLogs:    ActionLog[];
  vaccines:      Vaccine[];
  appointments:  Appointment[];
  weightHistory: WeightEntry[];
} | null> {
  const group = await getMyFamilyGroup();
  if (!group) {
    Sentry.captureMessage('[hydrateFromCloud] user logado sem family_group', 'warning');
    return null;
  }

  const [pets, groupData] = await Promise.all([
    pullPets(group.id),
    pullGroupData(group.id),
  ]);

  return {
    pet: pets[0] ?? null,
    pets,
    groupId: group.id,
    ...groupData,
  };
}
