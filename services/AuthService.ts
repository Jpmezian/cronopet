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

export async function getSession(): Promise<CronoPetUser | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  const u = data.session.user;
  // Garante que dev premium funcione também em cold start (não só
  // em login fresh). Idempotente — só seta se ainda não foi.
  maybeApplyDevPremium(u.email);
  return { id: u.id, email: u.email!, nome: u.user_metadata?.nome };
}

