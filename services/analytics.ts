/**
 * services/analytics.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Wrapper agnóstico de analytics. Pensado para PostHog mas trocável.
 *
 * Por que assim:
 * - Hoje: stub que loga em DEV e é no-op em PROD (sem dependência externa).
 * - Quando integrar PostHog: substituir o `track()` interno por `posthog.capture()`,
 *   sem mexer em call-sites espalhados pelo app.
 * - Eventos sempre tipados via `AnalyticsEvent` — nada de strings livres.
 *
 * PRIVACIDADE (LGPD):
 * - NUNCA logar valores sensíveis (peso real, nome do pet, email, fotos).
 * - Apenas metadados estruturais (booleans, contadores, enums).
 * - User ID é hash anônimo do user_id do Supabase, nunca o email.
 *
 * Setup futuro (quando habilitar PostHog):
 *   npx expo install posthog-react-native
 *   No _layout.tsx: <PostHogProvider apiKey={...} options={...}>
 */

import * as Sentry from '@sentry/react-native';

// ─── Eventos canônicos ──────────────────────────────────────────────────────
// Toda nova feature DEVE adicionar seus eventos aqui antes de chamar `track()`.
// Limitamos propositalmente a poucos eventos críticos pra não virar lixo.

export type PaywallSource =
  | 'settings_upgrade_card'
  | 'home_upgrade_card'
  | 'history_lock'
  | 'family_invite'
  | 'sync_promo'
  | 'insights_gate'
  | 'premium_trigger_sheet'
  | 'onboarding'
  | 'other';

export type AnalyticsEvent =
  // Onboarding & ativação
  | { name: 'onboarding_started' }
  | { name: 'onboarding_completed'; props: { petType: 'cachorro' | 'gato' | 'outro'; hasPhoto: boolean; hasBirthdate: boolean } }
  | { name: 'first_pet_added'; props: { source: 'onboarding' | 'manual' } }
  | { name: 'first_action_logged'; props: { actionKey: string; daysSinceOnboarding: number } }

  // Engagement core
  | { name: 'action_logged'; props: { actionKey: string; hasNote: boolean; hasQuantity: boolean } }
  | { name: 'daily_goals_completed'; props: { streak: number; petType: string } }
  | { name: 'weight_logged'; props: { hasNote: boolean } }
  | { name: 'vaccine_added' }
  | { name: 'appointment_added' }

  // Premium funnel
  | { name: 'paywall_viewed'; props: { source: PaywallSource } }
  | { name: 'premium_purchase_started'; props: { plan: 'monthly' | 'yearly' } }
  | { name: 'premium_purchase_completed'; props: { plan: 'monthly' | 'yearly' } }
  | { name: 'premium_purchase_failed'; props: { plan: 'monthly' | 'yearly'; reason: string } }
  | { name: 'trial_started'; props: { plan: 'monthly' | 'yearly' } }
  | { name: 'trial_converted'; props: { plan: 'monthly' | 'yearly' } }  // emitido server-side via revenuecat-webhook
  | { name: 'family_invite_created' }
  | { name: 'family_invite_accepted' }

  // Retenção / churn
  | { name: 'app_opened'; props: { coldStart: boolean } }
  | { name: 'notifications_enabled' }
  | { name: 'notifications_disabled' }
  | { name: 'account_deleted' }

  // Erros e UX rotos
  | { name: 'error_shown'; props: { context: string } }
  | { name: 'sync_failed'; props: { reason: string } };

// ─── Estado interno ─────────────────────────────────────────────────────────

let initialized = false;
let userIdHash: string | null = null;

interface AnalyticsBackend {
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

// Em produção, plugar aqui o cliente real (ex: posthog-react-native).
// Por enquanto: backend vazio, logs em DEV.
let backend: AnalyticsBackend | null = null;

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Inicializa analytics. Chamar uma vez no _layout.tsx, após hidratação.
 * Recebe um backend já configurado (PostHog, Mixpanel, etc) — opcional.
 */
export function initAnalytics(customBackend?: AnalyticsBackend) {
  if (initialized) return;
  backend = customBackend ?? null;
  initialized = true;
  if (__DEV__) {
    console.log('[analytics] initialized', { hasBackend: !!backend });
  }
}

/**
 * Identifica o usuário. Use o user_id do Supabase como base, NUNCA email.
 * Internamente usamos um hash simples pra não trafegar o ID puro.
 */
export function identifyUser(userId: string, traits?: { isPremium?: boolean; petType?: string }) {
  userIdHash = simpleHash(userId);
  if (backend) {
    backend.identify(userIdHash, traits as Record<string, unknown>);
  }
  if (__DEV__) console.log('[analytics] identify', userIdHash, traits);
}

/**
 * Reseta a identificação (chamar no logout / account deletion).
 */
export function resetAnalytics() {
  userIdHash = null;
  if (backend) backend.reset();
  if (__DEV__) console.log('[analytics] reset');
}

/**
 * Trackeia um evento tipado. Tudo passa por aqui — não chame backend direto.
 */
export function track(event: AnalyticsEvent) {
  try {
    const props = 'props' in event ? event.props : undefined;
    if (backend) {
      backend.capture(event.name, props as Record<string, unknown>);
    }
    if (__DEV__) {
      console.log(`[analytics] ${event.name}`, props ?? '');
    }
  } catch (err) {
    // Analytics nunca pode quebrar a UI
    Sentry.captureException(err, { tags: { source: 'analytics' } });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Hash determinístico mas não-reversível pra ID anônimo.
 * Suficiente pra agrupar eventos do mesmo usuário sem expor o user_id real.
 */
function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return `u_${Math.abs(h).toString(36)}`;
}
