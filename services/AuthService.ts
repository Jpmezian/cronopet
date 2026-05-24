import { supabase } from './supabase';
import type { CronoPetUser } from '@/types/auth';
import { identifyUser, resetAnalytics } from './analytics';
import { identifyPurchasesUser, resetPurchases } from './purchases';
import { applyDevPremiumIfMatch } from '@/lib/devPremium';

/**
 * Aplica premium dev se o email do user logado bater com a lista
 * hardcoded em `lib/devPremium.ts`. Helper interno chamado em
 * signUp/signIn/getSession pra cobrir todos os caminhos de auth.
 *
 * Lazy-importa o store pra evitar circular AuthService ↔ store.
 */
function maybeApplyDevPremium(email: string | undefined): void {
  if (!email) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePetStore } = require('@/store/usePetStore');
  applyDevPremiumIfMatch(email, usePetStore.getState().setPremiumStatus);
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

