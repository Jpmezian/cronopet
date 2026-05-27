// ─── devPremium — Premium fora do RevenueCat ─────────────────
//
// Sistema único após cleanup (Fase 4, 2026-05-25):
//   1) REMOTO (única fonte de verdade): tabela `public.premium_grants`
//      consultada via Edge Function `check-premium-grant`. Permite
//      adicionar/remover grants via SQL sem rebuild.
//   2) DEV-only override: em `__DEV__` builds, Pro é forçado pra não
//      bloquear teste de features pagas. NO-OP em production.
//
// REMOVIDO: hardcoded `DEV_PREMIUM_EMAILS_RAW` + `applyDevPremiumIfMatch`.
// Motivo: era account-squat surface — atacante criando conta com email
// listado ganhava Pro sem confirmar email. Com `mailer_autoconfirm=false`
// (Fase 2) o squat ficaria impossível, mas mantemos o sistema mais
// simples: 1 caminho só (remote grants).
//
// Founders (rocha3751, viniciusvrcoutinho) JÁ TÊM grant ativo em
// `premium_grants` (seed migration 005 + trigger claim_premium_grant_on_confirm).
// Continuam Pro automaticamente via remote check após signIn/getSession.
//
// Como conceder Pro pra alguém HOJE: legal/PREMIUM_GRANTS.md
//   INSERT INTO public.premium_grants (email, plan, reason, granted_by)
//   VALUES ('beta@x.com', 'annual', 'beta_tester', 'jp');

import { getSupabase } from '@/services/supabase';

type SetPremium = (args: {
  isPremium: boolean;
  plan?: 'monthly' | 'annual' | null;
  expiresAt?: number | null;
}) => void;

const LIFETIME_EXPIRES_AT = (): number =>
  Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;

/**
 * Consulta Edge Function `check-premium-grant`. Async.
 * Se backend retornar `granted: true`, seta o store. Senão NÃO
 * desativa Premium do user (RevenueCat e DEV auto-grant podem ter
 * concedido por outro caminho — não queremos derrubar).
 *
 * Falha de rede / função fora do ar: silent no-op. Último estado
 * MMKV permanece. Próximo getSession refaz.
 */
export async function checkRemotePremiumGrant(
  setPremiumStatus: SetPremium,
): Promise<boolean> {
  try {
    const supabase = await getSupabase();
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
      expiresAt: data.expiresAt ?? LIFETIME_EXPIRES_AT(),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-grant Premium em DEV builds (Expo Go, dev client, simulator).
 *
 * Motivação: o sistema remote só ativa Premium APÓS login + grant
 * remoto. Em desenvolvimento isso vira fricção porque toda vez que
 * você limpa MMKV / reinstala, perde Pro e tem que re-logar pra
 * testar features pagas.
 *
 * Solução: em `__DEV__` (Metro substitui por `false` em build de
 * produção), chamamos `setPremiumStatus(true)` direto no cold start.
 *
 * **Não roda em production builds (TestFlight, App Store)** — `__DEV__`
 * vira `false` no bundle de release. Pra ter Pro em TestFlight você
 * precisa ter grant ativo em `premium_grants`.
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
