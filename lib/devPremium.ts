// ─── devPremium — concessão de Premium fora do RevenueCat ────
//
// Dois caminhos complementares:
//
// 1) HARDCODED (lib/devPremium.ts → DEV_PREMIUM_EMAILS)
//    Fallback offline. Roda síncrono no signIn/signUp/getSession.
//    Garante que founders nunca dependam de rede pra entrar Premium
//    (cold start em avião, edge function caída, etc).
//
// 2) REMOTO (Edge Function `check-premium-grant` → tabela
//    `public.premium_grants` no Supabase)
//    Roda assíncrono depois de aplicar hardcoded. Permite adicionar/
//    remover grants via SQL Editor sem rebuild do app. Útil pra beta
//    testers, influencers, parceiros, família estendida.
//
// Como adicionar email:
//   - Hardcoded (founder/sócio): editar `DEV_PREMIUM_EMAILS_RAW` →
//     EAS build + submit.
//   - Remoto (tudo o resto): `INSERT INTO premium_grants ...` no
//     Supabase SQL Editor. Próximo login já pega. Ver
//     legal/PREMIUM_GRANTS.md pra cookbook.
//
// SEGURANÇA:
//   - Hardcoded não é à prova de adversário (basta criar conta com
//     email). Por isso só founders/sócios vão aqui.
//   - Remoto usa JWT-validated email (Edge Function lê do token, não
//     do body). Mas mesmo assim: atacante que crie conta com email
//     listado ganha. Supabase exige email-confirm → mitiga reivindicação
//     de email alheio.

import { supabase } from '@/services/supabase';

const DEV_PREMIUM_EMAILS_RAW: readonly string[] = [
  'rocha3751@gmail.com',          // founder
  'viniciusvrcoutinho@gmail.com', // sócio
];

const DEV_PREMIUM_EMAILS = new Set<string>(
  DEV_PREMIUM_EMAILS_RAW.map((e) => e.trim().toLowerCase()),
);

function isDevPremiumEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEV_PREMIUM_EMAILS.has(email.trim().toLowerCase());
}

type SetPremium = (args: {
  isPremium: boolean;
  plan?: 'monthly' | 'annual' | null;
  expiresAt?: number | null;
}) => void;

const LIFETIME_EXPIRES_AT = (): number =>
  Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;

/**
 * Hardcoded fallback. Síncrono. Idempotente.
 * Aplicado primeiro pra garantir founders premium mesmo offline.
 */
export function applyDevPremiumIfMatch(
  email: string | null | undefined,
  setPremiumStatus: SetPremium,
): boolean {
  if (!isDevPremiumEmail(email)) return false;
  setPremiumStatus({
    isPremium: true,
    plan: 'annual',
    expiresAt: LIFETIME_EXPIRES_AT(),
  });
  return true;
}

/**
 * Auto-grant Premium em DEV builds (Expo Go, dev client, simulator).
 *
 * Motivação: o sistema email-based só ativa Premium APÓS login. Mas o
 * app funciona offline sem conta — em desenvolvimento isso vira fricção
 * porque toda vez que você limpa MMKV / reinstala, perde Pro e tem que
 * re-logar pra testar features pagas.
 *
 * Solução: em `__DEV__` (Metro substitui por `false` em build de
 * produção), chamamos `setPremiumStatus(true)` direto no cold start.
 *
 * **Não roda em production builds (TestFlight, App Store)** — `__DEV__`
 * vira `false` no bundle de release. Pra ter Pro em TestFlight você
 * precisa logar uma vez com um dos emails da lista hardcoded ou ter
 * grant em `premium_grants`.
 *
 * Idempotente: se já tá Premium, no-op (mas seta de novo, é cheap).
 */
export function applyDevAutoGrant(setPremiumStatus: SetPremium): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (global as any).__DEV__ === true;
  if (!isDev) return false;
  setPremiumStatus({
    isPremium: true,
    plan: 'annual',
    expiresAt: LIFETIME_EXPIRES_AT(),
  });
  return true;
}

/**
 * Consulta Edge Function `check-premium-grant`. Async.
 * Se backend retornar `granted: true`, seta o store. Senão NÃO
 * desativa Premium do user (RevenueCat e hardcoded podem ter
 * concedido por outro caminho — não queremos derrubar).
 *
 * Falha de rede / função fora do ar: silent no-op. Último estado
 * MMKV permanece.
 */
export async function checkRemotePremiumGrant(
  setPremiumStatus: SetPremium,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      granted: boolean;
      plan?: 'monthly' | 'annual';
      expiresAt?: number | null;
    }>('check-premium-grant', {
      method: 'POST',
    });

    if (error || !data?.granted) return false;

    setPremiumStatus({
      isPremium: true,
      plan: data.plan ?? 'annual',
      // null vindo do backend = lifetime → traduz pra 100 anos pra ficar
      // consistente com `computePremiumStatus` (que aceita null e nunca expira,
      // mas o hardcoded grava 100y; padronizar pra um valor concreto evita
      // bugs de comparação)
      expiresAt: data.expiresAt ?? LIFETIME_EXPIRES_AT(),
    });
    return true;
  } catch {
    // Rede off, função caída, etc — segue com último estado conhecido
    return false;
  }
}
