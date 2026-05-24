-- ═══════════════════════════════════════════════════════════════
-- ═══ Premium grants — 2026-05-24                              ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Mecanismo de concessão MANUAL de Premium pra users específicos
-- (founder, sócios, beta testers, parceiros, influencers, família).
-- NÃO substitui RevenueCat — apenas adiciona caminho paralelo pra
-- não-pagantes que devem ter acesso.
--
-- FLUXO:
--   1. Admin (você) faz INSERT manual via SQL Editor do Supabase:
--        INSERT INTO premium_grants (email, plan, reason)
--        VALUES ('beta@x.com', 'annual', 'beta_tester');
--   2. User faz login no app
--   3. AuthService chama Edge Function `check-premium-grant`
--   4. Function lê email do JWT, consulta esta tabela, retorna grant
--   5. AuthService seta isPremium=true no store + persiste em MMKV
--
-- SEGURANÇA:
--   - RLS ativada SEM POLICIES → ninguém com anon/authenticated
--     consegue SELECT/INSERT/UPDATE/DELETE. Só service_role bypass.
--   - Apenas Edge Function (que roda com service_role) pode consultar
--   - Admin (você) usa SQL Editor do dashboard Supabase (também
--     service_role implicit)
--   - email é PK pra evitar duplicata; case-insensitive via citext
--
-- NÃO É À PROVA DE ADVERSÁRIO:
--   - Atacante que descubra um email premium e crie conta com ele
--     ganha Premium. Mitigação: emails não são públicos + Supabase
--     Auth exige confirmação por email (não dá pra reivindicar
--     email alheio).

-- ─── Extensão citext pra email case-insensitive ──────────────
-- Já vem habilitada por padrão no Supabase, mas garantir é cheap
create extension if not exists citext;

-- ─── Tabela principal ────────────────────────────────────────
create table if not exists public.premium_grants (
  email        citext       primary key,
  plan         text         not null default 'annual'
                            check (plan in ('monthly', 'annual')),
  expires_at   timestamptz,  -- NULL = lifetime
  reason       text         not null default 'manual'
                            check (reason in (
                              'founder', 'socio', 'family',
                              'beta_tester', 'influencer',
                              'partner', 'compensation', 'manual'
                            )),
  granted_by   text,         -- email/identifier do admin que concedeu
  granted_at   timestamptz  not null default now(),
  active       boolean      not null default true,
  notes        text          -- contexto livre (ex: "tester TestFlight #3")
);

comment on table public.premium_grants is
  'Grants manuais de Premium fora do RevenueCat. Editar via SQL Editor. Ver legal/PREMIUM_GRANTS.md.';

-- ─── Índices ─────────────────────────────────────────────────
-- Lookup principal: SELECT WHERE email = X AND active
create index if not exists premium_grants_active_idx
  on public.premium_grants (active)
  where active = true;

-- ─── RLS travada (sem policies = sem acesso) ─────────────────
alter table public.premium_grants enable row level security;

-- Não cria nenhuma policy de propósito. Resultado:
--   - anon role     → bloqueado
--   - authenticated → bloqueado
--   - service_role  → bypass (acessa via Edge Function)

-- ─── Seed: founders existentes do código hardcoded ───────────
-- Mantém paridade com lib/devPremium.ts. Quando o sistema remoto
-- estiver estável, remover hardcoded e ficar só com esta tabela.
insert into public.premium_grants (email, plan, reason, granted_by, notes)
values
  ('rocha3751@gmail.com',         'annual', 'founder', 'system', 'Founder CronoPet — seed migration 005'),
  ('viniciusvrcoutinho@gmail.com', 'annual', 'socio',   'system', 'Sócio CronoPet — seed migration 005')
on conflict (email) do nothing;
