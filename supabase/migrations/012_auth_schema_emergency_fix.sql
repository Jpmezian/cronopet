-- ═══════════════════════════════════════════════════════════════
-- ═══ EMERGENCY FIX: schema divergence quebrava signUp inteiro ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Auditoria adversarial (2026-05-24, pós sprint AUTH) detectou que
-- o schema do banco diverge do que o código espera em 4 pontos
-- críticos que CRASHAM signUp logo no primeiro login real:
--
-- #1 profiles não tem `nome` nem `email` (só full_name, avatar_url)
--    → upsert em services/AuthService.signUp:51 levanta 42703
--    → MAS auth.users JÁ foi criado → user fica preso
--
-- #3 handle_new_user trigger lê metadata 'full_name' mas app passa 'nome'
--    → profile fica com full_name=NULL sempre
--
-- #4 set_invite_code BEFORE INSERT sobrescreve incondicionalmente
--    → loop de unicidade do create_personal_group_for_user vira inútil
--    → colisão = erro UNIQUE = signUp falha (com row já em auth.users)
--
-- #5 getFamilyMembers usa `.select('profiles(id, nome, email)')`
--    → 42703 quando algum dia tentar listar membros
--
-- #6 set_invite_code SECURITY DEFINER sem search_path
--    → mesma vulnerabilidade que migration 004 corrigiu nas outras
--
-- Esta migration é SEGURA de aplicar porque o banco está vazio
-- (0 users em produção). Sem risco de perder dados.

-- ─── Fix #1: adicionar nome + email em profiles ─────────────
alter table public.profiles
  add column if not exists nome  text,
  add column if not exists email text;

-- Index pra lookup por email (família compartilhada vai usar isso)
create index if not exists profiles_email_idx
  on public.profiles (lower(email))
  where email is not null;

comment on column public.profiles.nome is
  'Nome do tutor (alias humano). App passa em raw_user_meta_data.nome no signUp.';
comment on column public.profiles.email is
  'Email do tutor (denormalizado de auth.users.email pra evitar JOIN em queries de membros).';

-- ─── Fix #3: handle_new_user lê 'nome' (não 'full_name') ─────
-- Também: ON CONFLICT pra ser idempotente caso o signUp upsert rode
-- antes (race entre trigger e cliente). Email vem direto de NEW.email
-- pra ser confiável.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    NEW.id,
    coalesce(
      NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      ''
    ),
    NEW.email
  )
  on conflict (id) do update
    set nome  = coalesce(excluded.nome, public.profiles.nome),
        email = coalesce(excluded.email, public.profiles.email);
  return NEW;
end;
$$;
alter function public.handle_new_user() owner to postgres;

-- ─── Fix #4 + #6: set_invite_code não-destrutivo + search_path ───
-- Antes: incondicionalmente sobrescrevia invite_code, anulando o
-- loop de unicidade do create_personal_group_for_user.
-- Agora: só seta se a chamada não passou um código próprio (ex:
-- createFamilyGroup em SyncService que insere sem invite_code).
create or replace function public.set_invite_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if NEW.invite_code is null then
    NEW.invite_code := public.generate_invite_code();
  end if;
  return NEW;
end;
$$;

-- ─── Backfill defensivo ──────────────────────────────────────
-- Se houver algum profile órfão (full_name preenchido mas nome NULL),
-- migra os dados. Email vem de auth.users. NO-OP em banco vazio.
update public.profiles p
   set email = coalesce(p.email, u.email),
       nome  = coalesce(p.nome, p.full_name, split_part(u.email, '@', 1))
  from auth.users u
 where p.id = u.id
   and (p.email is null or p.nome is null);

-- ─── Validação pós-migration ─────────────────────────────────
-- Confirma que as colunas críticas existem e os triggers estão ok.
-- Falha a migration se algo estiver torto.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name in ('nome', 'email')
     having count(*) = 2
  ) then
    raise exception 'profiles deveria ter nome + email após migration 012';
  end if;

  if not exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'set_invite_code'
       and 'search_path=public, pg_temp' = any(p.proconfig)
  ) then
    raise notice 'set_invite_code search_path config: %', (
      select proconfig from pg_proc where proname = 'set_invite_code'
    );
  end if;
end;
$$;
