-- ═══════════════════════════════════════════════════════════════
-- ═══ public.subscriptions — cache local de RevenueCat            ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Source of truth: RevenueCat. Esta tabela é cache local pra
-- `is_pro()` rodar server-side sem fazer network call externa
-- em cada request (que aconteceria se cada Edge Function tivesse
-- que chamar a REST API do RevenueCat).
--
-- Populada por:
--   - Edge Function `revenuecat-webhook` (eventos: INITIAL_PURCHASE,
--     RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, etc).
--   - Eventual backfill manual via SQL (operador) ou
--     reconciliação periódica chamando RC REST API (futuro).
--
-- Consumida por:
--   - `is_pro(uid)` em SQL — usado pela Edge Function `health-analysis`
--     pra gate Pro no servidor.
--   - Client app (futuro) — RLS permite SELECT do próprio user pra
--     UI mostrar "Pro até DATA" sem chamar RC SDK direto.

create table public.subscriptions (
  id text primary key,                           -- RevenueCat subscription ID (sub_xxx)
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,                      -- ex: com.cronopet.app.premium.monthly
  platform text not null check (platform in ('app_store','play_store','stripe','promotional')),
  entitlement text not null,                     -- 'pro' por enquanto; permite futuras tiers

  status text not null check (status in (
    'active','expired','cancelled','billing_retry','in_grace_period','paused'
  )),
  is_trial boolean not null default false,

  purchased_at      timestamptz not null,
  expires_at        timestamptz null,            -- null = non-renewing (lifetime)
  cancelled_at      timestamptz null,            -- != null em CANCELLATION mas ainda válida até expires_at

  original_purchase_at timestamptz not null,     -- data da PRIMEIRA compra do user (não troca em renewals)
  store_transaction_id text null,                -- App Store transactionId / Play Store orderId

  raw_event         jsonb null,                  -- último webhook payload pra debug
  updated_at        timestamptz not null default now()
);

-- Lookup hot path: `is_pro(uid)` precisa de (user_id, status, expires_at)
create index idx_subscriptions_user_active
  on public.subscriptions (user_id, status, expires_at);

-- Lookup secundário: webhook recebe store_transaction_id e precisa
-- achar a row pra atualizar (cobre upgrade/downgrade que muda subscription_id)
create index idx_subscriptions_store_txn
  on public.subscriptions (store_transaction_id)
  where store_transaction_id is not null;

alter table public.subscriptions enable row level security;

-- User vê só as PRÓPRIAS subscriptions. Sem INSERT/UPDATE/DELETE
-- policies → escrita só via service_role (Edge Function revenuecat-webhook).
create policy "subs_select_own"
  on public.subscriptions for select to public
  using (user_id = auth.uid());

comment on table public.subscriptions is
  'Cache local de subscriptions RevenueCat. Source of truth: RevenueCat. Sincronizado via Edge Function revenuecat-webhook. is_pro() consulta esta tabela pra gate server-side.';
comment on column public.subscriptions.status is
  'Status canônico: active (pagando), expired (TTL passou), cancelled (cancelou mas ainda válida), billing_retry (cartão falhou), in_grace_period (Apple/Google deu tempo extra), paused (Android).';
comment on column public.subscriptions.is_trial is
  'true durante o período de trial gratuito. Vira false em TRIAL_CONVERTED.';
comment on column public.subscriptions.expires_at is
  'null = non-renewing purchase (lifetime). Caso contrário, data de expiração corrente.';
