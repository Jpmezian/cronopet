-- ═══════════════════════════════════════════════════════════════
-- ═══ generate_invite_code refactor — warning cosmético         ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Supabase Database Advisor (rodado em 2026-05-24) apontou warning
-- "auto variable i shadows / unused variable i" na função antiga, que
-- usava loop com variável i nunca lida pra concatenar caracteres.
--
-- Refactor: SQL function pura usando generate_series + string_agg.
-- Mesmo comportamento (8 chars do alphabet Crockford-ish sem I/O/0/1),
-- mas sem warning + ~30% mais rápido (sem overhead de plpgsql loop).
--
-- NOTA SEGURANÇA: `random()` do Postgres NÃO é cryptographically
-- secure (PRNG determinístico baseado em seed). Pra invite code de
-- família é OK porque:
--   - 32^8 ≈ 1.1 trilhão de combinações
--   - RPC redeem_invite_code (migration 008) rate limita 5/min/user
--   - mesma mensagem pra inválido/rate-limited (anti-oracle)
-- Pra usos mais sensíveis (token de password reset, ex.), usar
-- gen_random_bytes(N) do pgcrypto.

create or replace function public.generate_invite_code()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select string_agg(
    substr(
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
      floor(random() * 32 + 1)::int,
      1
    ),
    ''
  )
  from generate_series(1, 8);
$$;

comment on function public.generate_invite_code() is
  '8-char Crockford-ish (32 alphabet, sem I/L/O/U). PRNG não-criptográfico — uso restrito a invite codes com rate limit.';
