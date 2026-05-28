-- ═══════════════════════════════════════════════════════════════
-- ═══ Test: is_pro() agora cobre subscriptions                   ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Roda em transação isolada via `supabase test db` ou `psql` direto.
-- Cleanup automático no ROLLBACK final.
--
-- Cenários cobertos:
--   1. Subscription 'active' não-expirada → is_pro = true
--   2. Subscription 'cancelled' ainda não-expirada → is_pro = true
--   3. Subscription 'in_grace_period' → is_pro = true
--   4. Subscription 'expired' → is_pro = false
--   5. Subscription 'active' mas expires_at no passado → is_pro = false
--   6. User sem subscription nem grant → is_pro = false
--   7. User só com premium_grants (regressão dos ramos antigos) → is_pro = true

begin;

-- ─── Setup ───────────────────────────────────────────────────

-- Cria 3 users de teste em auth.users
insert into auth.users (id, email, email_confirmed_at, created_at, updated_at,
                        aud, role, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'test1@cronopet.test', now(),
    now(), now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'test2@cronopet.test', now(),
    now(), now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', 'test3@cronopet.test', now(),
    now(), now(), 'authenticated', 'authenticated', '{}'::jsonb, '{}'::jsonb);

-- ─── Cenário 1: active, não-expirada ─────────────────────────

insert into public.subscriptions (id, user_id, product_id, platform, entitlement,
                                  status, is_trial, purchased_at, expires_at,
                                  original_purchase_at)
values ('sub_test_1', '11111111-1111-4111-8111-111111111111',
        'com.cronopet.app.premium.monthly', 'app_store', 'pro',
        'active', false, now() - interval '1 day', now() + interval '29 days',
        now() - interval '1 day');

do $$
begin
  if not public.is_pro('11111111-1111-4111-8111-111111111111') then
    raise exception 'FAIL cenario 1: active não-expirada deveria retornar true';
  end if;
end$$;

-- ─── Cenário 2: cancelled mas ainda válida ───────────────────

update public.subscriptions
  set status = 'cancelled', cancelled_at = now()
  where id = 'sub_test_1';

do $$
begin
  if not public.is_pro('11111111-1111-4111-8111-111111111111') then
    raise exception 'FAIL cenario 2: cancelled mas ainda dentro do período deveria retornar true';
  end if;
end$$;

-- ─── Cenário 3: in_grace_period ──────────────────────────────

update public.subscriptions
  set status = 'in_grace_period', cancelled_at = null
  where id = 'sub_test_1';

do $$
begin
  if not public.is_pro('11111111-1111-4111-8111-111111111111') then
    raise exception 'FAIL cenario 3: in_grace_period deveria retornar true';
  end if;
end$$;

-- ─── Cenário 4: expired ──────────────────────────────────────

update public.subscriptions set status = 'expired' where id = 'sub_test_1';

do $$
begin
  if public.is_pro('11111111-1111-4111-8111-111111111111') then
    raise exception 'FAIL cenario 4: expired deveria retornar false';
  end if;
end$$;

-- ─── Cenário 5: active mas expires_at no passado ─────────────

update public.subscriptions
  set status = 'active', expires_at = now() - interval '1 day'
  where id = 'sub_test_1';

do $$
begin
  if public.is_pro('11111111-1111-4111-8111-111111111111') then
    raise exception 'FAIL cenario 5: expires_at passado deveria retornar false mesmo com status=active';
  end if;
end$$;

-- ─── Cenário 6: user sem subscription nem grant ──────────────

do $$
begin
  if public.is_pro('22222222-2222-4222-8222-222222222222') then
    raise exception 'FAIL cenario 6: user sem nada deveria retornar false';
  end if;
end$$;

-- ─── Cenário 7: regressão — premium_grants ainda funciona ────

insert into public.premium_grants (email, plan, reason, granted_by,
                                   user_id, active, granted_at)
values ('test3@cronopet.test', 'annual', 'beta_tester', 'test',
        '33333333-3333-4333-8333-333333333333', true, now());

do $$
begin
  if not public.is_pro('33333333-3333-4333-8333-333333333333') then
    raise exception 'FAIL cenario 7: regressão — premium_grants deveria ainda funcionar';
  end if;
end$$;

-- ─── Cleanup automático ──────────────────────────────────────

rollback;

select '✅ is_pro_subscriptions_test: 7/7 cenários PASS' as result;
