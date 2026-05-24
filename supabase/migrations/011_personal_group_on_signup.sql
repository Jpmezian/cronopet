-- ═══════════════════════════════════════════════════════════════
-- ═══ Personal family_group automático no signup — 2026-05-24   ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Mudança de produto (auditoria UX 2026-05-24): app vai exigir login
-- no onboarding. Pra que pets/logs sincronizem do device pra nuvem
-- sem complicar schema (que hoje gira em torno de family_group_id),
-- decidimos: **todo user ganha um family_group "pessoal" automático**
-- no signup. Solo user = group de 1 membro. Família = mesmo group
-- compartilhado.
--
-- Vantagens:
--   - Zero refactor de schema, RLS, SyncService — tudo já funciona
--     com family_group_id
--   - Mudar pra família é só convidar alguém pro group existente
--   - Hidratação ao logar em novo device é trivial: SELECT * FROM
--     pets WHERE family_group_id = (group do user)
--
-- Trigger AFTER INSERT em auth.users:
--   1. Cria public.family_groups com owner_id = NEW.id e invite_code
--      gerado por generate_invite_code()
--   2. Insere public.family_members (group_id, NEW.id, 'owner')
--
-- IDEMPOTÊNCIA:
--   - Trigger AFTER INSERT só roda 1x por user (não duplica).
--   - Se algum signup antigo NÃO recebeu group (pré-migration), o
--     backfill abaixo cobre.

-- ─── Trigger function ────────────────────────────────────────
create or replace function public.create_personal_group_for_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group_id   uuid;
  v_nome       text;
  v_code       text;
  v_attempts   integer := 0;
begin
  -- Nome do grupo: "Meu CronoPet" ou o nome que o user passou no signup
  v_nome := coalesce(
    NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
    'Meu CronoPet'
  );

  -- Gera invite_code único (retry até 5x — colisão é improvável com
  -- 32^8 mas defensive coding)
  loop
    v_code := public.generate_invite_code();
    v_attempts := v_attempts + 1;
    exit when not exists (
      select 1 from public.family_groups where invite_code = v_code
    ) or v_attempts >= 5;
  end loop;

  -- Cria o grupo pessoal
  insert into public.family_groups (nome, owner_id, invite_code)
  values (v_nome, NEW.id, v_code)
  returning id into v_group_id;

  -- Adiciona user como owner
  insert into public.family_members (group_id, user_id, role)
  values (v_group_id, NEW.id, 'owner');

  return NEW;
end;
$$;
alter function public.create_personal_group_for_user() owner to postgres;

-- ─── Trigger bind ────────────────────────────────────────────
drop trigger if exists trg_create_personal_group on auth.users;
create trigger trg_create_personal_group
  after insert on auth.users
  for each row execute function public.create_personal_group_for_user();

-- ─── Backfill: users existentes sem group ────────────────────
-- Cobre os 2 founders (rocha3751, viniciusvrcoutinho) caso já estejam
-- em auth.users mas sem group. No-op se já tem.
do $$
declare
  u record;
  v_group_id uuid;
  v_code     text;
  v_attempts integer;
begin
  for u in
    select id, email, raw_user_meta_data
      from auth.users
     where not exists (
       select 1 from public.family_members fm where fm.user_id = auth.users.id
     )
  loop
    -- Gera código único
    v_attempts := 0;
    loop
      v_code := public.generate_invite_code();
      v_attempts := v_attempts + 1;
      exit when not exists (
        select 1 from public.family_groups where invite_code = v_code
      ) or v_attempts >= 5;
    end loop;

    insert into public.family_groups (nome, owner_id, invite_code)
    values (
      coalesce(NULLIF(trim(u.raw_user_meta_data->>'nome'), ''), 'Meu CronoPet'),
      u.id,
      v_code
    )
    returning id into v_group_id;

    insert into public.family_members (group_id, user_id, role)
    values (v_group_id, u.id, 'owner');
  end loop;
end;
$$;

comment on function public.create_personal_group_for_user() is
  'Cria family_group pessoal + family_members(owner) automaticamente quando user signa up. Decisão arquitetural: zero refactor de schema, tudo já depende de family_group_id. Família é apenas group compartilhado.';
