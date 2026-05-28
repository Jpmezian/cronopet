-- ═══════════════════════════════════════════════════════════════
-- ═══ is_pro() — agora cobre RevenueCat subscriptions             ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Pre-fix: is_pro só checava `premium_grants` (founders + grants
-- manuais). Users que pagam via IAP real recebiam 403 em Edge
-- Functions Pro-gated (health-analysis).
--
-- Post-fix: 3º ramo OR consulta `public.subscriptions` (populada
-- pela Edge Function revenuecat-webhook). Status considerados
-- "ativo pra Pro": 'active' E 'in_grace_period'. 'cancelled' segue
-- válida até expires_at — também conta (se expires_at > now).
--
-- Ordem dos ramos importa pra performance:
--   1) premium_grants user_id (founders/manual, ~10 rows total)
--   2) premium_grants email fallback (legacy, deve ser raro)
--   3) subscriptions (cresce com users pagantes; indexed por user_id)

create or replace function public.is_pro(uid uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    -- Caminho rápido: grant manual já reivindicado pelo trigger
    select 1 from public.premium_grants pg
     where pg.user_id = uid
       and pg.active = true
       and (pg.expires_at is null or pg.expires_at > now())
  ) or exists (
    -- Caminho legacy/fallback: email match (grant não-reivindicado)
    select 1
      from public.premium_grants pg
      join auth.users u on u.email::citext = pg.email
     where u.id = uid
       and u.email_confirmed_at is not null
       and pg.active = true
       and (pg.expires_at is null or pg.expires_at > now())
  ) or exists (
    -- Novo (migration 021): subscription paga via RevenueCat.
    -- 'cancelled' ainda vale até expires_at — user cancelou mas
    -- pagou o ciclo. 'in_grace_period' = Apple/Google deu tempo
    -- extra pós billing issue.
    select 1 from public.subscriptions s
     where s.user_id = uid
       and s.entitlement = 'pro'
       and s.status in ('active','in_grace_period','cancelled')
       and (s.expires_at is null or s.expires_at > now())
  );
$function$;

comment on function public.is_pro(uuid) is
  'Retorna true se user tem premium ativo. Fontes (OR): premium_grants (founders/manual) OR premium_grants email fallback (legacy) OR subscriptions (RevenueCat IAP).';
