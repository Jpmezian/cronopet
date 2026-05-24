import { supabase } from './supabase';
import type { CronoPetUser } from '@/types/auth';
import { identifyUser, resetAnalytics } from './analytics';
import { identifyPurchasesUser, resetPurchases } from './purchases';
import { applyDevPremiumIfMatch, checkRemotePremiumGrant } from '@/lib/devPremium';
import { hydrateFromCloud } from './SyncService';

/**
 * Aplica Premium fora do RevenueCat em 2 camadas:
 *   1. Hardcoded síncrono (lib/devPremium.ts → founders/sócios).
 *      Funciona offline. Cobre cold start em modo avião.
 *   2. Remoto async (Edge Function check-premium-grant → tabela
 *      premium_grants). Permite adicionar email via SQL sem rebuild.
 *
 * Fire-and-forget — não bloqueia o fluxo de auth. Se a chamada remota
 * falhar (rede off, função fora do ar), o user fica com o último
 * estado conhecido em MMKV + o hardcoded que já rodou.
 *
 * Lazy-importa o store pra evitar circular AuthService ↔ store.
 */
function maybeApplyDevPremium(email: string | undefined): void {
  if (!email) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePetStore } = require('@/store/usePetStore');
  const setPremiumStatus = usePetStore.getState().setPremiumStatus;

  // 1) Hardcoded fallback — síncrono, offline-safe
  applyDevPremiumIfMatch(email, setPremiumStatus);

  // 2) Backend grant — async, sobrescreve com dados mais recentes
  //    Não usa await: não bloqueia signIn/signUp/getSession
  checkRemotePremiumGrant(setPremiumStatus).catch(() => {
    // já tratado dentro da função; engole pra TS feliz
  });
}

/**
 * Hidrata o store local com dados da nuvem após login.
 *
 * Cenários:
 *   - signIn em device novo (reinstalou app, trocou de aparelho):
 *     MMKV vazio + cloud tem dados → adota tudo do cloud
 *   - signIn em device que já tinha sessão local:
 *     MMKV tem dados + cloud tem dados → merge (local prevalece em
 *     conflito por id, ver mergeById em usePetStore.hydrateFromCloud)
 *   - signUp recém-feito:
 *     trigger 011 cria personal group, mas sem pets/logs → no-op
 *
 * Fire-and-forget: não bloqueia auth (se rede off, próximo cold-start
 * tenta de novo via getSession).
 */
function hydrateStoreFromCloud(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePetStore } = require('@/store/usePetStore');
  const hydrate = usePetStore.getState().hydrateFromCloud;

  hydrateFromCloud()
    .then((snapshot) => {
      if (!snapshot) return;
      hydrate({
        pet:           snapshot.pet,
        actionLogs:    snapshot.actionLogs,
        vaccines:      snapshot.vaccines,
        appointments:  snapshot.appointments,
        weightHistory: snapshot.weightHistory,
      });
    })
    .catch(() => {
      // rede off / Supabase fora — silencioso. Próximo getSession refaz.
    });
}

// ─── Sign Up ──────────────────────────────────────────────────

export async function signUp(
  email:    string,
  password: string,
  nome:     string,
): Promise<CronoPetUser> {
  const { data, error } = await supabase.auth.signUp({
    email:   email.trim().toLowerCase(),
    password,
    options: { data: { nome } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Cadastro falhou — tente novamente.');

  // Cria perfil público (best-effort, pode já existir)
  await supabase.from('profiles').upsert({
    id:    data.user.id,
    email: email.trim().toLowerCase(),
    nome,
  }).throwOnError();

  // Identifica nos analytics + purchases (não-bloqueante)
  identifyUser(data.user.id);
  identifyPurchasesUser(data.user.id).catch(() => {});
  maybeApplyDevPremium(data.user.email);
  hydrateStoreFromCloud();

  return { id: data.user.id, email: data.user.email!, nome };
}

// ─── Sign In ──────────────────────────────────────────────────

export async function signIn(
  email:    string,
  password: string,
): Promise<CronoPetUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Login falhou — tente novamente.');

  identifyUser(data.user.id);
  identifyPurchasesUser(data.user.id).catch(() => {});
  maybeApplyDevPremium(data.user.email);
  hydrateStoreFromCloud();

  const nome = data.user.user_metadata?.nome as string | undefined;
  return { id: data.user.id, email: data.user.email!, nome };
}

// ─── Sign Out ─────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  resetAnalytics();
  await resetPurchases().catch(() => {});
}

// ─── Session ─────────────────────────────────────────────────

// ─── Excluir conta (R-L1: Apple §5.1.1(v) + Google) ──────────
/**
 * Solicita ao backend a exclusão DEFINITIVA da conta + todos os
 * dados associados (CASCADE em pets, action_logs, vaccines, etc).
 *
 * Implementação: chama Edge Function `delete-account` que valida o
 * JWT do user e faz DELETE FROM cada tabela WHERE user_id = auth.uid().
 *
 * **Estado atual**: Edge Function ainda não deployada. Esta função
 * faz best-effort — se falhar (404 / Edge não existe), retorna sem
 * throw. Caller (settings.tsx) continua o fluxo local de limpeza:
 * signOut + resetStore + clearSupabaseAuth + delete Keychain key.
 * Dados ficam órfãos no Supabase mas inacessíveis via JWT (sessão
 * deslogada). Operação manual pode ser feita pelo admin.
 *
 * **TODO v1.1**: deployar Edge Function `delete-account` em
 * supabase/functions/delete-account/index.ts com:
 *   - verify_jwt = true
 *   - extrai user.id do header Authorization
 *   - executa DELETE em pets, action_logs, vaccines, appointments,
 *     weight_entries, family_members WHERE user_id = X
 *   - chama supabase.auth.admin.deleteUser(X) com service-role key
 *   - retorna 204 No Content
 */
export async function deleteRemoteAccount(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return; // user não tem conta — só limpeza local basta

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`
    : '';
  if (!url) return; // env não configurada — pula

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    // Não checamos status — função best-effort, signOut depois invalida
  } catch {
    // Network/timeout — caller continua limpando local
  }
}

export async function getSession(): Promise<CronoPetUser | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  const u = data.session.user;
  // Garante que dev premium funcione também em cold start (não só
  // em login fresh). Idempotente — só seta se ainda não foi.
  maybeApplyDevPremium(u.email);
  return { id: u.id, email: u.email!, nome: u.user_metadata?.nome };
}

