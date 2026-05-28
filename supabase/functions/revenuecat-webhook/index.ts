// ═══════════════════════════════════════════════════════════════
// ═══ Edge Function: revenuecat-webhook                          ═══
// ═══════════════════════════════════════════════════════════════
//
// Recebe eventos da RevenueCat e sincroniza `public.subscriptions`
// pra que `is_pro()` server-side reflita compras IAP em tempo real.
//
// SEGURANÇA:
//   - verify_jwt = false (config.toml) — RC não envia JWT Supabase.
//   - RC envia Authorization: Bearer <token> custom, configurado
//     no dashboard RC. Validamos contra env REVENUECAT_WEBHOOK_AUTH_TOKEN.
//   - SERVICE_ROLE_KEY usado pra upsert (RLS bloqueia anon).
//   - Idempotência: upsert por (id) PK — RC pode reenviar mesmo evento.
//
// REVENUECAT EVENT REFERENCE:
//   https://www.revenuecat.com/docs/webhooks
//
// EVENT TYPES MAPEADOS:
//   INITIAL_PURCHASE       → status=active, is_trial=event.is_trial_conversion?false:true
//   RENEWAL                → status=active, atualiza expires_at
//   NON_RENEWING_PURCHASE  → status=active, expires_at=null
//   TRIAL_STARTED          → status=active, is_trial=true
//   TRIAL_CONVERTED        → status=active, is_trial=false
//   TRIAL_CANCELLED        → status=cancelled, cancelled_at=now
//   CANCELLATION           → status=cancelled, cancelled_at=now (válida até expires_at)
//   UNCANCELLATION         → status=active, cancelled_at=null
//   EXPIRATION             → status=expired
//   BILLING_ISSUE          → status=billing_retry
//   PRODUCT_CHANGE         → upsert product_id+expires_at novos
//   SUBSCRIBER_ALIAS       → log apenas (alias join, sem efeito em sub)
//   TRANSFER               → log apenas (edge case raro)
//
// USER MATCHING:
//   event.app_user_id é o UUID que `services/purchases.ts` passou
//   em `Purchases.configure({ appUserID })`. Bate diretamente com
//   `auth.users.id`. Se não encontrar → 200 OK + Sentry warning
//   (idempotência: NÃO retorna 4xx pra não fazer RC retentar).
//
// DEPLOY:
//   supabase functions deploy revenuecat-webhook \
//     --project-ref qhbsmvuwuiupdqdrrdov
//
// ENV VARS REQUIRED (set via Supabase Dashboard → Functions → secrets):
//   - REVENUECAT_WEBHOOK_AUTH_TOKEN  (gerar com `openssl rand -hex 32`)
//   - SUPABASE_URL                   (auto-injetado em prod)
//   - SUPABASE_SERVICE_ROLE_KEY      (auto-injetado em prod)
// ═══════════════════════════════════════════════════════════════

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_TOKEN   = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN') ?? '';

// ─── Helpers ──────────────────────────────────────────────────

function json(status: number, body: Record<string, any>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function ok(): Response {
  return json(200, { ok: true });
}

/** Tentativa best-effort de capturar exceção sem dep do Sentry
 *  (deno runtime tem Sentry oficial mas é overhead — log estruturado
 *  via console.error já vai pro dashboard Supabase + APM externo). */
function logError(tag: string, err: unknown, extra: Record<string, any> = {}): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({
    level: 'error',
    tag,
    message: msg,
    ...extra,
  }));
}

function logWarn(tag: string, message: string, extra: Record<string, any> = {}): void {
  console.warn(JSON.stringify({
    level: 'warn',
    tag,
    message,
    ...extra,
  }));
}

// ─── Mapeamento de payload RC → row local ─────────────────────

interface RCEvent {
  type: string;
  id: string;                          // event id
  app_user_id: string;                 // = auth.users.id no nosso schema
  original_app_user_id?: string;
  aliases?: string[];
  product_id: string;
  store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL' | string;
  environment?: 'SANDBOX' | 'PRODUCTION';
  event_timestamp_ms?: number;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  original_purchase_at_ms?: number;
  cancel_reason?: string;
  is_trial_conversion?: boolean;
  is_family_share?: boolean;
  period_type?: 'TRIAL' | 'INTRO' | 'NORMAL' | 'PROMOTIONAL';
  transaction_id?: string;
  original_transaction_id?: string;
  entitlement_ids?: string[];
  // ... outros campos. raw_event guarda tudo.
}

interface RCPayload {
  event: RCEvent;
  api_version?: string;
}

type Platform = 'app_store' | 'play_store' | 'stripe' | 'promotional';
type Status   = 'active' | 'expired' | 'cancelled' | 'billing_retry' | 'in_grace_period' | 'paused';

function mapPlatform(store: string): Platform {
  switch (store) {
    case 'APP_STORE':    return 'app_store';
    case 'PLAY_STORE':   return 'play_store';
    case 'STRIPE':       return 'stripe';
    case 'PROMOTIONAL':  return 'promotional';
    default:             return 'app_store'; // fallback defensivo (Apple é majoritário no Brasil)
  }
}

/** Mapa event_type → patch parcial pra upsert. Retorna null pra
 *  eventos que NÃO devem modificar subscription (apenas log). */
function eventToPatch(event: RCEvent): null | {
  status:     Status;
  is_trial?:  boolean;
  cancelled_at?: string | null;
  expires_at_override?: string | null | 'use_event';
} {
  const t = event.type;

  switch (t) {
    case 'INITIAL_PURCHASE':
      return { status: 'active', is_trial: event.period_type === 'TRIAL' };

    case 'RENEWAL':
      return { status: 'active', expires_at_override: 'use_event' };

    case 'NON_RENEWING_PURCHASE':
      return { status: 'active', expires_at_override: null };

    case 'TRIAL_STARTED':
      return { status: 'active', is_trial: true };

    case 'TRIAL_CONVERTED':
      return { status: 'active', is_trial: false };

    case 'TRIAL_CANCELLED':
      return { status: 'cancelled', cancelled_at: new Date().toISOString() };

    case 'CANCELLATION':
      return { status: 'cancelled', cancelled_at: new Date().toISOString() };

    case 'UNCANCELLATION':
      return { status: 'active', cancelled_at: null };

    case 'EXPIRATION':
      return { status: 'expired' };

    case 'BILLING_ISSUE':
      return { status: 'billing_retry' };

    case 'PRODUCT_CHANGE':
      // RC envia novo product_id + nova expires_at no mesmo evento.
      // Atualiza ambos via lógica padrão do upsert (product_id vem do
      // event diretamente, expires_at via 'use_event').
      return { status: 'active', expires_at_override: 'use_event' };

    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      // Apenas log — não afeta linha de subscription.
      return null;

    default:
      logWarn('rc_unknown_event_type', `Unknown RC event type: ${t}`, { eventId: event.id });
      return null;
  }
}

function tsFromMs(ms: number | null | undefined): string | null {
  if (ms == null) return null;
  return new Date(ms).toISOString();
}

// ─── Handler ──────────────────────────────────────────────────

serve(async (req) => {
  // Apenas POST. Sem OPTIONS preflight — RC é server-to-server.
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  // ─── Config sanity check ──────────────────────────────────
  if (!SUPABASE_URL || !SERVICE_ROLE || !WEBHOOK_TOKEN) {
    logError('rc_server_misconfigured', 'missing required env vars', {
      hasUrl: !!SUPABASE_URL, hasRole: !!SERVICE_ROLE, hasToken: !!WEBHOOK_TOKEN,
    });
    return json(500, { error: 'server_misconfigured' });
  }

  // ─── Auth: bearer token RC ────────────────────────────────
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${WEBHOOK_TOKEN}`;
  // Comparação constant-time pra evitar timing attack
  if (auth.length !== expected.length) {
    return json(401, { error: 'unauthorized' });
  }
  let mismatch = 0;
  for (let i = 0; i < auth.length; i++) {
    mismatch |= auth.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return json(401, { error: 'unauthorized' });
  }

  // ─── Parse payload ────────────────────────────────────────
  let payload: RCPayload;
  try {
    payload = await req.json();
  } catch (e) {
    logError('rc_invalid_json', e);
    return json(400, { error: 'invalid_json' });
  }

  const event = payload?.event;
  if (!event?.type || !event?.id || !event?.app_user_id || !event?.product_id) {
    logError('rc_invalid_payload', 'missing required event fields', {
      hasType: !!event?.type, hasId: !!event?.id, hasUser: !!event?.app_user_id,
    });
    return json(400, { error: 'invalid_payload' });
  }

  // ─── User matching ────────────────────────────────────────
  // app_user_id é o auth.users.id (purchases.ts passa userId direto).
  // Se não encontrar, devolve 200 OK (idempotência) + warning.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: userRow, error: userErr } = await admin
    .schema('auth' as any)
    .from('users')
    .select('id')
    .eq('id', event.app_user_id)
    .maybeSingle();

  if (userErr) {
    logError('rc_user_lookup_failed', userErr.message, { eventId: event.id });
    // Devolve 200 pra RC não retentar infinito por erro nosso transitório.
    // Próxima reconciliação via job manual pega o que faltou.
    return ok();
  }

  if (!userRow) {
    logWarn('rc_user_not_found', 'event.app_user_id has no matching auth.users.id', {
      appUserId: event.app_user_id, eventType: event.type, eventId: event.id,
    });
    return ok();
  }

  // ─── Compute patch baseado no event_type ──────────────────
  const patch = eventToPatch(event);
  if (patch === null) {
    // SUBSCRIBER_ALIAS / TRANSFER / unknown → só log, sem mutate.
    return ok();
  }

  // ─── Resolve expires_at ───────────────────────────────────
  let expiresAt: string | null;
  if (patch.expires_at_override === null) {
    expiresAt = null;
  } else {
    // 'use_event' ou undefined: usa o expiration_at_ms do evento.
    expiresAt = tsFromMs(event.expiration_at_ms);
  }

  // ─── Subscription ID estável ──────────────────────────────
  // RC não envia "subscription_id" canônico em todos os eventos.
  // Usamos original_transaction_id (App Store / Play) quando presente,
  // que é estável across renewals. Fallback: event.id (worst case
  // criaria múltiplas rows; mitigado por idx_subscriptions_store_txn).
  const subscriptionId =
    event.original_transaction_id ?? event.transaction_id ?? event.id;

  // Entitlement: RC envia array; pegamos o primeiro que bate com 'pro'.
  // Se não tiver entitlement explícito, default pra 'pro' (único que
  // existe no momento).
  const entitlement = (event.entitlement_ids ?? []).find((e) => e === 'pro') ?? 'pro';

  const row = {
    id:                   subscriptionId,
    user_id:              event.app_user_id,
    product_id:           event.product_id,
    platform:             mapPlatform(event.store),
    entitlement,
    status:               patch.status,
    is_trial:             patch.is_trial ?? false,
    purchased_at:         tsFromMs(event.purchased_at_ms ?? event.event_timestamp_ms) ?? new Date().toISOString(),
    expires_at:           expiresAt,
    cancelled_at:         patch.cancelled_at ?? null,
    original_purchase_at: tsFromMs(event.original_purchase_at_ms) ?? new Date().toISOString(),
    store_transaction_id: event.transaction_id ?? null,
    raw_event:            event as any,
    updated_at:           new Date().toISOString(),
  };

  // ─── Upsert idempotente ───────────────────────────────────
  const { error: upsertErr } = await admin
    .from('subscriptions')
    .upsert(row, { onConflict: 'id' });

  if (upsertErr) {
    logError('rc_upsert_failed', upsertErr.message, {
      subscriptionId, eventType: event.type, eventId: event.id,
    });
    // 500 → RC retenta. Erro transitório de DB (network, lock) é
    // legítimo pra retry.
    return json(500, { error: 'upsert_failed' });
  }

  return ok();
});
