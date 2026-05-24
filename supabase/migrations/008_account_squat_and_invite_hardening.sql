-- ═══════════════════════════════════════════════════════════════
-- ═══ Account-squat fix + Family invite RPC — 2026-05-24        ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Combo de 2 vetores da auditoria adversarial:
--
-- ─── Vetor 1: account squatting via premium_grants (findings #2 + #3)
--   Hoje a tabela usa `email citext PK`. Se atacante cria conta com
--   email previamente concedido (ex: rocha3751@gmail.com) ANTES do
--   dono real, ele recebe Pro. A mitigação atual é "Supabase exige
--   email-confirm" — frágil porque o auditor mostrou que a row em
--   auth.users existe antes do confirm completar.
--
--   Fix: adicionar `user_id uuid` à premium_grants + trigger que faz
--   "claim" do grant SOMENTE quando `auth.users.email_confirmed_at`
--   estiver populado. Lookup do is_pro() prioriza user_id.
--
-- ─── Vetor 2: Family invite enum via SELECT direto (finding #16)
--   joinFamilyGroup() no client faz SELECT em family_groups pelo
--   invite_code. RLS atualmente bloqueia (is_group_member check), o
--   que torna a feature inoperante. Pra funcionar precisa de RPC
--   SECURITY DEFINER — e aproveitamos pra adicionar rate limit.
--
--   Fix: tabela `family_join_attempts` + função `redeem_invite_code`
--   SECURITY DEFINER que aceita code, valida rate (5/min/user),
--   joina o user no grupo se válido, retorna group_id.

-- ═══════════════════════════════════════════════════════════════
-- ═══ Parte 1: premium_grants user_id + trigger                ═══
-- ═══════════════════════════════════════════════════════════════

-- ─── ALTER TABLE: adicionar coluna user_id (nullable inicialmente)
alter table public.premium_grants
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Index único parcial — múltiplas rows com user_id IS NULL OK, mas
-- mesmo user_id duas vezes não.
create unique index if not exists premium_grants_user_id_unique
  on public.premium_grants (user_id)
  where user_id is not null;

comment on column public.premium_grants.user_id is
  'Populado por trigger quando auth.users.email_confirmed_at é setado. is_pro() prioriza este campo sobre email pra evitar account squatting.';

-- ─── Trigger function: claim grant pra user confirmado
-- Roda em AFTER INSERT/UPDATE em auth.users. Se o user tem
-- email_confirmed_at NOT NULL e existe grant ativo pra esse email
-- sem user_id ainda, faz o claim.
create or replace function public.claim_premium_grant_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Só age quando email acaba de ser confirmado (passa de NULL pra timestamp)
  if NEW.email_confirmed_at is not null
     and (OLD.email_confirmed_at is null or TG_OP = 'INSERT')
     and NEW.email is not null then

    update public.premium_grants
       set user_id = NEW.id
     where email = NEW.email::citext
       and user_id is null
       and active = true;
  end if;

  return NEW;
end;
$$;
alter function public.claim_premium_grant_on_confirm() owner to postgres;

-- Triggers em auth.users
drop trigger if exists trg_claim_premium_grant_insert on auth.users;
create trigger trg_claim_premium_grant_insert
  after insert on auth.users
  for each row execute function public.claim_premium_grant_on_confirm();

drop trigger if exists trg_claim_premium_grant_update on auth.users;
create trigger trg_claim_premium_grant_update
  after update of email_confirmed_at on auth.users
  for each row execute function public.claim_premium_grant_on_confirm();

-- ─── Backfill: linkar grants existentes a users já confirmados
-- (rocha3751@gmail.com e viniciusvrcoutinho@gmail.com da migration 005,
--  caso esses users já tenham logado entre 005 e agora).
update public.premium_grants pg
   set user_id = u.id
  from auth.users u
 where pg.email = u.email::citext
   and pg.user_id is null
   and u.email_confirmed_at is not null;

-- ─── is_pro() v2: prioriza user_id, fallback email
-- Fallback por email permanece pra grants que ainda não foram claimed
-- (user nunca confirmou email). Quando confirmar, trigger preenche
-- user_id e a próxima call usa o caminho rápido.
create or replace function public.is_pro(uid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    -- Caminho rápido: user_id já reivindicado pelo trigger
    select 1 from public.premium_grants pg
     where pg.user_id = uid
       and pg.active = true
       and (pg.expires_at is null or pg.expires_at > now())
  ) or exists (
    -- Caminho legacy/fallback: email match em user com email_confirmed
    -- Necessário só pra grants não-reivindicados ainda. Se a trigger
    -- fez o claim corretamente, esse ramo nunca dispara em prod.
    select 1
      from public.premium_grants pg
      join auth.users u on u.email::citext = pg.email
     where u.id = uid
       and u.email_confirmed_at is not null
       and pg.active = true
       and (pg.expires_at is null or pg.expires_at > now())
  );
$$;
-- (revoke/grant já feitos na migration 006)

-- ═══════════════════════════════════════════════════════════════
-- ═══ Parte 2: Family invite RPC com rate limit                ═══
-- ═══════════════════════════════════════════════════════════════

-- ─── Tabela de rate limit
-- 1 row por tentativa. pg_cron poderia limpar > 24h, mas em scale
-- atual (centenas de attempts/dia) cabe perfeito.
create table if not exists public.family_join_attempts (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  success    boolean     not null default false
);

create index if not exists family_join_attempts_user_time_idx
  on public.family_join_attempts (user_id, attempted_at desc);

alter table public.family_join_attempts enable row level security;
-- Sem policies → só service_role (e funções SECURITY DEFINER).

-- ─── RPC: redeem_invite_code
-- Retorna o group como JSON se sucesso. Levanta exception com mesma
-- mensagem pra "não-existe" e "rate-limited atingiu o threshold" pra
-- não vazar oracle. Diferencia "já é membro" pra UX.
--
-- Rate limit: 5 attempts/min por user (suficiente pra typo, insuficiente
-- pra enumeration 36^6).
create or replace function public.redeem_invite_code(p_code text)
returns table (group_id uuid, group_nome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid           uuid := auth.uid();
  v_recent_count  integer;
  v_group_id      uuid;
  v_group_nome    text;
  v_already_member boolean;
  v_code          text;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  -- Normaliza: uppercase, trim, sem espaços internos
  v_code := upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
  if length(v_code) < 6 or length(v_code) > 12 then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  -- Rate limit: 5 attempts no último minuto
  select count(*) into v_recent_count
    from public.family_join_attempts
   where user_id = v_uid
     and attempted_at > now() - interval '1 minute';

  if v_recent_count >= 5 then
    -- Não logamos a attempt (não inflar contador). Mesma mensagem
    -- que "código inválido" pra não vazar que está rate-limited.
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  -- Busca o grupo. Bypass de RLS via SECURITY DEFINER.
  select id, nome into v_group_id, v_group_nome
    from public.family_groups
   where invite_code = v_code
   limit 1;

  -- Loga tentativa (success/fail) — pra rate limit subsequente.
  insert into public.family_join_attempts (user_id, success)
  values (v_uid, v_group_id is not null);

  if v_group_id is null then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  -- Idempotência: se já é membro, só retorna o grupo (não erro)
  select exists(
    select 1 from public.family_members
     where group_id = v_group_id and user_id = v_uid
  ) into v_already_member;

  if not v_already_member then
    insert into public.family_members (group_id, user_id, role)
    values (v_group_id, v_uid, 'member');
  end if;

  return query select v_group_id, v_group_nome;
end;
$$;
alter function public.redeem_invite_code(text) owner to postgres;
revoke execute on function public.redeem_invite_code(text) from public, anon;
grant  execute on function public.redeem_invite_code(text) to authenticated;

comment on function public.redeem_invite_code(text) is
  'RPC para entrar em grupo familiar via código. Rate limit 5/min/user. Mesma mensagem pra inválido/expirado/rate-limited (anti-oracle).';
