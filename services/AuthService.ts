import { getSupabase, clearSupabaseAuthStorage } from './supabase';
import type { CronoPetUser } from '@/types/auth';
import { identifyUser, resetAnalytics } from './analytics';
import { identifyPurchasesUser, resetPurchases } from './purchases';
import { checkRemotePremiumGrant } from '@/lib/devPremium';
import { hydrateFromCloud } from './SyncService';

/**
 * Aplica Premium consultando a tabela `premium_grants` via Edge Function.
 *
 * Após cleanup Fase 4 (2026-05-25): hardcoded `applyDevPremiumIfMatch`
 * removido. Founders agora têm grant ativo em `premium_grants` (seed
 * migration 005 + trigger claim_premium_grant_on_confirm) — ativam Pro
 * via remote check normalmente.
 *
 * Fire-and-forget — não bloqueia o fluxo de auth. Se a chamada falhar
 * (rede off, função fora do ar), o user fica com o último estado
 * conhecido em MMKV. Próximo cold-start (getSession) refaz.
 *
 * Lazy-importa o store pra evitar circular AuthService ↔ store.
 */
function maybeApplyDevPremium(_email: string | undefined): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePetStore } = require('@/store/usePetStore');
  const setPremiumStatus = usePetStore.getState().setPremiumStatus;

  // Async, fire-and-forget — não bloqueia signIn/getSession
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
 * Mudança 2026-05-27: agora RETORNA a Promise. Callers podem await
 * pra gatear UI (ex: `_layout.tsx` aguarda + 5s timeout antes de
 * liberar FAB de ações). Internamente continua silenciosa em erro
 * (resolve sem propagar throw) pra não quebrar fluxo de signIn.
 */
export function hydrateStoreFromCloud(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePetStore } = require('@/store/usePetStore');
  const hydrate = usePetStore.getState().hydrateFromCloud;

  return hydrateFromCloud()
    .then((snapshot) => {
      if (!snapshot) return;
      hydrate({
        pet:           snapshot.pet,
        pets:          snapshot.pets,
        actionLogs:    snapshot.actionLogs,
        vaccines:      snapshot.vaccines,
        appointments:  snapshot.appointments,
        weightHistory: snapshot.weightHistory,
      });
    })
    .catch(() => {
      // rede off / Supabase fora — silencioso. Caller (_layout) seta
      // _cloudHydrated=true mesmo em erro pra liberar UI.
    });
}

// ─── Sign Up ──────────────────────────────────────────────────

export async function signUp(
  email:    string,
  password: string,
  nome:     string,
): Promise<CronoPetUser> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email:   email.trim().toLowerCase(),
    password,
    options: { data: { nome } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Cadastro falhou — tente novamente.');

  // Bug fix (2026-05-26): Supabase com `mailer_autoconfirm: false`
  // tem comportamento anti-enumeração: signUp com email já cadastrado
  // retorna `data.user` SEM erro e com `identities = []` vazio.
  // Sem este check, o app trata como sucesso → loga "user fantasma"
  // que (combinado com bug 1) herda os dados do MMKV anterior.
  // Ref: https://supabase.com/docs/reference/javascript/auth-signup
  if (data.user.identities && data.user.identities.length === 0) {
    throw new Error(
      'Esse e-mail já está cadastrado. Use "Já tenho conta" para entrar — ou recupere a senha se esqueceu.',
    );
  }

  // NÃO fazer upsert manual em `profiles` aqui (bug build #15):
  //   - O trigger `handle_new_user` JÁ insere profile com nome+email
  //     do raw_user_meta_data (SECURITY DEFINER bypass RLS, sempre roda).
  //   - Com email-confirmation ON (default), signUp NÃO cria session
  //     imediata → role corrente = anon → upsert quebra na RLS.
  //   - Trigger é authoritative; app não deve duplicar trabalho.
  //
  // NÃO chamar hydrateStoreFromCloud aqui:
  //   - Signup novo = personal group recém-criado pelo trigger,
  //     sem pets/logs/etc. Não há nada pra hidratar.
  //   - Sem session = chamadas Supabase falhariam silenciosamente.
  //   - Próximo signIn ou getSession (após email confirmation) hidrata.
  //
  // NÃO chamar checkRemotePremiumGrant aqui:
  //   - Edge Function tem verify_jwt=true → sem session = 401.
  //   - Founders ativam Pro via trigger claim_premium_grant_on_confirm
  //     (roda quando email é confirmado) + remote check no signIn.

  identifyUser(data.user.id);
  identifyPurchasesUser(data.user.id).catch(() => {});
  // NÃO chamar checkRemotePremiumGrant aqui — sem session ainda
  // (email confirmation ON). Remote check roda no primeiro signIn /
  // getSession após o user confirmar o email.

  return { id: data.user.id, email: data.user.email!, nome };
}

// ─── Sign In ──────────────────────────────────────────────────

export async function signIn(
  email:    string,
  password: string,
): Promise<CronoPetUser> {
  const supabase = await getSupabase();
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

/**
 * Logout completo — desloga do Supabase, limpa MMKV de auth E
 * reseta TODO o state local (pets, premium, family, etc).
 *
 * Bug fix (2026-05-26): antes só fazia `supabase.auth.signOut()`.
 * MMKV permanecia → próximo signUp/signIn herdava pets, logs,
 * status Pro da conta anterior. Era o pior tipo de bug: dados
 * de um user "vazavam" pra próximo user no mesmo device.
 *
 * Ordem importa:
 *   1. supabase.auth.signOut() — invalida o JWT antes de qualquer
 *      sync auto-disparar com a sessão velha.
 *   2. clearSupabaseAuthStorage() — apaga session/refresh do MMKV
 *      separado de auth (não cobre o store).
 *   3. usePetStore.resetStore() — zera estado do app (pets, logs,
 *      premium, family, milestones, etc).
 *   4. resetAnalytics + resetPurchases — desliga PostHog/RevenueCat
 *      do user antigo (sem await em purchases pra não bloquear UX).
 *
 * NÃO apaga a chave de criptografia do SecureStore — ela é por
 * device, não por conta. Próximo signUp/signIn reutiliza o MMKV
 * (já limpo de dados de usuário) com mesma chave.
 */
export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // Lazy require pra evitar circular import store ↔ AuthService.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePetStore } = require('@/store/usePetStore');
  usePetStore.getState().resetStore();

  clearSupabaseAuthStorage();

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
  const supabase = await getSupabase();
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
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  const u = data.session.user;
  // Garante que dev premium funcione também em cold start (não só
  // em login fresh). Idempotente — só seta se ainda não foi.
  maybeApplyDevPremium(u.email);
  // Sprint AUTH fix bug #D: cold start em device novo (instalou app,
  // tinha sessão MMKV persistida) precisa hidratar do cloud.
  // Antes ficava só pra signIn fresh → user reinstalava, sessão voltava,
  // mas pet/logs não vinham. Idempotente: merge preserva local edits.
  hydrateStoreFromCloud();
  return { id: u.id, email: u.email!, nome: u.user_metadata?.nome };
}

