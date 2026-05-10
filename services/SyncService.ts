import * as Sentry from '@sentry/react-native';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { FamilyGroup, FamilyMember } from '@/types/auth';
import type {
  ActionKey, ActionLog, PetProfile, MedicalEvent,
  Vaccine, Appointment, WeightEntry,
} from '@/types/pet';

// ─── Canal ativo (singleton) ──────────────────────────────────

let activeChannel: RealtimeChannel | null = null;

// ─── Helpers ──────────────────────────────────────────────────

async function getUid(): Promise<string> {
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

  // Sobe perfil do pet (foto_url somente se for URL remota)
  await supabase.from('pets').insert({
    group_id:   group.id,
    nome:       pet.nome,
    tipo:       pet.tipo,
    raca:       pet.raca || null,
    foto_url:   pet.foto?.startsWith('http') ? pet.foto : null,
    nascimento: pet.nascimento ?? null,
  }).throwOnError();

  return {
    id:         group.id,
    nome:       group.nome,
    inviteCode: group.invite_code,
    ownerId:    group.owner_id,
  };
}

/**
 * Entra em um grupo existente pelo código de 8 dígitos.
 */
export async function joinFamilyGroup(code: string): Promise<FamilyGroup> {
  const uid = await getUid();

  const { data: group, error } = await supabase
    .from('family_groups')
    .select()
    .eq('invite_code', code.toUpperCase().trim())
    .single();
  if (error || !group) throw new Error('Código inválido ou não encontrado.');

  await supabase.from('family_members')
    .upsert({ group_id: group.id, user_id: uid, role: 'member' })
    .throwOnError();

  return {
    id:         group.id,
    nome:       group.nome,
    inviteCode: group.invite_code,
    ownerId:    group.owner_id,
  };
}

/**
 * Retorna o grupo do usuário logado (null se não estiver em nenhum).
 */
export async function getMyFamilyGroup(): Promise<FamilyGroup | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('family_members')
    .select('family_groups(id, nome, invite_code, owner_id)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!data) return null;
  const g = data.family_groups as any;
  if (!g) return null;
  return { id: g.id, nome: g.nome, inviteCode: g.invite_code, ownerId: g.owner_id };
}

/**
 * Lista os membros de um grupo com nome e e-mail.
 */
export async function getFamilyMembers(groupId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('role, joined_at, profiles(id, nome, email)')
    .eq('group_id', groupId);
  if (error || !data) return [];

  return data.map((m: any) => ({
    userId:   m.profiles.id,
    nome:     m.profiles.nome ?? m.profiles.email.split('@')[0],
    email:    m.profiles.email,
    role:     m.role as 'owner' | 'member',
    joinedAt: m.joined_at,
  }));
}

// ─── Sync — push data ─────────────────────────────────────────

/** Sincroniza um registro de ação para a nuvem (fire-and-forget). */
export function pushActionLog(groupId: string, userId: string, log: ActionLog): void {
  // SECURITY: timeout de 10s — não deixar sync hangar indefinidamente.
  const op = supabase.from('action_logs').upsert({
    id:        log.id,
    group_id:  groupId,
    user_id:   userId,
    key:       log.key,
    timestamp: log.timestamp,
    note:      log.note ?? null,
    // foto não sincronizada nesta versão — requer Supabase Storage
  });
  const timer = setTimeout(() => {
    Sentry.captureMessage('[Sync] pushActionLog timeout (10s)', 'warning');
  }, 10_000);
  op.then(({ error }) => {
    clearTimeout(timer);
    if (error) {
      Sentry.captureException(new Error(error.message), { tags: { op: 'pushActionLog' } });
    }
  });
}

/** Sincroniza todo o histórico de ações (bulk upsert). */
export async function pushAllActionLogs(
  groupId: string,
  userId:  string,
  logs:    ActionLog[],
): Promise<void> {
  if (!logs.length) return;
  const rows = logs.map((l) => ({
    id: l.id, group_id: groupId, user_id: userId,
    key: l.key, timestamp: l.timestamp, note: l.note ?? null,
  }));
  const { error } = await supabase.from('action_logs').upsert(rows);
  if (error) {
    Sentry.captureException(new Error(error.message), { tags: { op: 'pushAllActionLogs' } });
  }
}

/** Sincroniza vacinas. */
export async function pushVaccines(groupId: string, vaccines: Vaccine[]): Promise<void> {
  if (!vaccines.length) return;
  await supabase.from('vaccines').upsert(
    vaccines.map((v) => ({
      id: v.id, group_id: groupId,
      nome: v.nome, data: v.data,
      proxima: v.proxima ?? null, veterinario: v.veterinario ?? null,
      lote: v.lote ?? null, nota: v.nota ?? null,
    }))
  );
}

/** Sincroniza consultas. */
export async function pushAppointments(groupId: string, appts: Appointment[]): Promise<void> {
  if (!appts.length) return;
  await supabase.from('appointments').upsert(
    appts.map((a) => ({
      id: a.id, group_id: groupId,
      titulo: a.titulo, data: a.data,
      hora: a.hora ?? null, veterinario: a.veterinario ?? null, nota: a.nota ?? null,
    }))
  );
}

/** Sincroniza histórico de peso. */
export async function pushWeightHistory(groupId: string, entries: WeightEntry[]): Promise<void> {
  if (!entries.length) return;
  await supabase.from('weight_entries').upsert(
    entries.map((w) => ({
      id: w.id, group_id: groupId,
      peso: w.peso, data: w.data, nota: w.nota ?? null,
    }))
  );
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

  activeChannel = supabase
    .channel(`cronopet-group-${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'action_logs', filter: `group_id=eq.${groupId}` },
      (payload) => {
        const r = payload.new as any;
        // Ignora logs do próprio usuário (já inseridos localmente)
        if (r.user_id === myUserId) return;
        onInsert({
          id:        r.id,
          key:       r.key,
          timestamp: r.timestamp,
          ...(r.note ? { note: r.note } : {}),
        });
      },
    )
    .subscribe();
}

/** Cancela todas as assinaturas realtime. */
export function unsubscribeAll(): void {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
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

  const actionLogs: ActionLog[] = (logsRes.data ?? []).map((r: any) => ({
    id:        r.id,
    key:       r.key as ActionKey,
    timestamp: r.timestamp,
    ...(r.note ? { note: r.note } : {}),
  }));

  const vaccines: Vaccine[] = (vaccinesRes.data ?? []).map((r: any) => ({
    id:   r.id,
    nome: r.nome,
    data: r.data,
    ...(r.proxima     ? { proxima:     r.proxima }     : {}),
    ...(r.veterinario ? { veterinario: r.veterinario } : {}),
    ...(r.lote        ? { lote:        r.lote }        : {}),
    ...(r.nota        ? { nota:        r.nota }        : {}),
  }));

  const appointments: Appointment[] = (apptsRes.data ?? []).map((r: any) => ({
    id:     r.id,
    titulo: r.titulo,
    data:   r.data,
    ...(r.hora        ? { hora:        r.hora }        : {}),
    ...(r.veterinario ? { veterinario: r.veterinario } : {}),
    ...(r.nota        ? { nota:        r.nota }        : {}),
  }));

  const weightHistory: WeightEntry[] = (weightRes.data ?? []).map((r: any) => ({
    id:   r.id,
    peso: Number(r.peso),
    data: r.data,
    ...(r.nota ? { nota: r.nota } : {}),
  }));

  return { actionLogs, vaccines, appointments, weightHistory };
}
