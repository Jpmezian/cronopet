-- ═══════════════════════════════════════════════════════════════
-- ═══ AI usage tracking + is_pro() helper — 2026-05-24          ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Auditoria adversarial (finding #4 + #12): a Edge Function
-- `health-analysis` chama Anthropic SEM:
--   - validar se user é Pro (paywall bypass via curl direto)
--   - rate limit por user (cost bomb trivial)
--   - cap mensal de tokens (escala linear até falência)
--
-- Esta migration cria a infraestrutura pra Edge Function checar
-- ambos: `is_pro(uid)` decide se rejeita 403, `ai_usage` traz contagem
-- mensal pra rejeitar 429.

-- ─── Função is_pro(uid) ──────────────────────────────────────
-- Source of truth de quem é Pro: union de premium_grants (manual)
-- + (futuro) subscriptions do RevenueCat sync'd em profiles.
--
-- Hoje só consulta premium_grants. Quando RevenueCat live, adicionar
-- segundo branch: `OR exists(select from profiles where id=uid and
-- is_premium and (premium_expires_at is null or > now()))`.
--
-- SECURITY DEFINER com search_path fixo (segue padrão migration 004).
create or replace function public.is_pro(uid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.premium_grants pg
    join auth.users u on u.email = pg.email::text
    where u.id = uid
      and pg.active = true
      and (pg.expires_at is null or pg.expires_at > now())
  );
$$;
alter function public.is_pro(uuid) owner to postgres;
revoke execute on function public.is_pro(uuid) from public, anon;
grant  execute on function public.is_pro(uuid) to authenticated, service_role;

comment on function public.is_pro(uuid) is
  'Retorna true se o user tem subscription Pro ativa (via premium_grants hoje, + RevenueCat no futuro).';

-- ─── Tabela ai_usage ────────────────────────────────────────
-- Contabiliza uso de IA por user por mês. RLS travada (só Edge Function
-- com service_role escreve, e ninguém lê). Mensal pra simplificar
-- rotação — sem precisar de pg_cron rolando janela.
create table if not exists public.ai_usage (
  user_id       uuid        not null references auth.users(id) on delete cascade,
  month         text        not null check (month ~ '^\d{4}-\d{2}$'),
  calls         integer     not null default 0 check (calls >= 0),
  tokens_in     bigint      not null default 0 check (tokens_in >= 0),
  tokens_out    bigint      not null default 0 check (tokens_out >= 0),
  last_call_at  timestamptz not null default now(),
  primary key (user_id, month)
);

comment on table public.ai_usage is
  'Track de uso de IA por user/mês pra rate limit + cost cap. Escrito pela Edge Function health-analysis.';

-- Index pra alertas/admin: "quem usou mais esse mês"
create index if not exists ai_usage_month_idx
  on public.ai_usage (month, calls desc);

alter table public.ai_usage enable row level security;
-- Sem policies → anon e authenticated bloqueados. service_role bypass.

-- ─── Helper: increment idempotente ───────────────────────────
-- Usar do Edge Function: select * from public.bump_ai_usage(uid, mes, t_in, t_out).
-- Retorna a linha pós-incremento. UPSERT atômico.
create or replace function public.bump_ai_usage(
  p_user_id    uuid,
  p_month      text,
  p_tokens_in  bigint,
  p_tokens_out bigint
)
returns public.ai_usage
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.ai_usage;
begin
  insert into public.ai_usage (user_id, month, calls, tokens_in, tokens_out, last_call_at)
  values (p_user_id, p_month, 1, p_tokens_in, p_tokens_out, now())
  on conflict (user_id, month) do update
    set calls        = ai_usage.calls + 1,
        tokens_in    = ai_usage.tokens_in + excluded.tokens_in,
        tokens_out   = ai_usage.tokens_out + excluded.tokens_out,
        last_call_at = now()
  returning * into result;

  return result;
end;
$$;
alter function public.bump_ai_usage(uuid, text, bigint, bigint) owner to postgres;
revoke execute on function public.bump_ai_usage(uuid, text, bigint, bigint) from public, anon, authenticated;
grant  execute on function public.bump_ai_usage(uuid, text, bigint, bigint) to service_role;

comment on function public.bump_ai_usage is
  'UPSERT atômico em ai_usage. Edge Function chama após resposta da Anthropic.';
