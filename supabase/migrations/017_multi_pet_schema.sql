-- ═══════════════════════════════════════════════════════════════
-- ═══ Multi-pet schema (DB-002) — 2026-05-25                    ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Hoje pets PK = group_id → 1 pet por grupo. Trava feature de
-- multi-pet (paywall Pro promete múltiplos pets, mas schema bloqueia).
--
-- Mudanças:
-- 1. pets ganha id UUID PK (novo), created_at, deleted_at.
--    group_id continua FK (1 group → N pets).
-- 2. Tabelas de eventos por pet (action_logs, vaccines, appointments,
--    weight_entries, medical_events) ganham pet_id FK CASCADE.
--    Pet_id é NULLABLE inicialmente — rows legadas (do period mono-pet)
--    permanecem com pet_id NULL e ficam associadas ao group.
-- 3. Index em (group_id, deleted_at) pra listar pets ativos de um group.
-- 4. RLS atualizada: SELECT/INSERT/UPDATE/DELETE em pets continuam
--    sendo por group_id (membros do mesmo group veem todos os pets).
--
-- BANCO ESTÁ VAZIO em prod → sem backfill complexo. Os 2 founders
-- têm group mas zero pets até agora.

-- ─── pets: nova PK + soft delete ────────────────────────────

-- 1. Drop FK que apontam pra pets (ainda referenciando group_id antiga)
--    Algumas tabelas filhas têm FK em pets via group_id (raro), mas
--    todas as FKs reais são pra family_groups. Vou verificar:
do $$
declare
  fk record;
begin
  for fk in
    select conname, conrelid::regclass as tabela
      from pg_constraint
     where contype = 'f'
       and confrelid = 'public.pets'::regclass
  loop
    raise notice 'FK pra pets: % em %', fk.conname, fk.tabela;
  end loop;
end;
$$;

-- 2. Adiciona colunas novas (id, created_at, deleted_at)
alter table public.pets add column if not exists id uuid default gen_random_uuid();
alter table public.pets add column if not exists created_at timestamptz default now();
alter table public.pets add column if not exists deleted_at timestamptz;

-- 3. Popular id pros rows existentes (banco vazio mas defensivo)
update public.pets set id = gen_random_uuid() where id is null;
alter table public.pets alter column id set not null;

-- 4. Trocar PK: drop antiga (group_id), criar nova (id)
alter table public.pets drop constraint if exists pets_pkey;
alter table public.pets add constraint pets_pkey primary key (id);

-- 5. Index pra lookup eficiente: pets ativos por group
create index if not exists pets_group_active_idx
  on public.pets (group_id)
  where deleted_at is null;

comment on column public.pets.id is 'PK do pet (multi-pet). Antes era group_id implícito.';
comment on column public.pets.deleted_at is 'Soft delete pra preservar histórico de eventos (action_logs/vaccines) atrelados a este pet.';

-- ─── child tables: pet_id FK ────────────────────────────────

-- action_logs
alter table public.action_logs add column if not exists pet_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'action_logs_pet_id_fkey') then
    alter table public.action_logs add constraint action_logs_pet_id_fkey
      foreign key (pet_id) references public.pets(id) on delete cascade;
  end if;
end $$;
create index if not exists action_logs_pet_idx on public.action_logs (pet_id, timestamp desc) where pet_id is not null;

-- vaccines
alter table public.vaccines add column if not exists pet_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'vaccines_pet_id_fkey') then
    alter table public.vaccines add constraint vaccines_pet_id_fkey
      foreign key (pet_id) references public.pets(id) on delete cascade;
  end if;
end $$;
create index if not exists vaccines_pet_idx on public.vaccines (pet_id, data desc) where pet_id is not null;

-- appointments
alter table public.appointments add column if not exists pet_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_pet_id_fkey') then
    alter table public.appointments add constraint appointments_pet_id_fkey
      foreign key (pet_id) references public.pets(id) on delete cascade;
  end if;
end $$;
create index if not exists appointments_pet_idx on public.appointments (pet_id, data desc) where pet_id is not null;

-- weight_entries
alter table public.weight_entries add column if not exists pet_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'weight_entries_pet_id_fkey') then
    alter table public.weight_entries add constraint weight_entries_pet_id_fkey
      foreign key (pet_id) references public.pets(id) on delete cascade;
  end if;
end $$;
create index if not exists weight_entries_pet_idx on public.weight_entries (pet_id, data desc) where pet_id is not null;

-- medical_events
alter table public.medical_events add column if not exists pet_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'medical_events_pet_id_fkey') then
    alter table public.medical_events add constraint medical_events_pet_id_fkey
      foreign key (pet_id) references public.pets(id) on delete cascade;
  end if;
end $$;
create index if not exists medical_events_pet_idx on public.medical_events (pet_id, timestamp desc) where pet_id is not null;

-- ─── Validação ──────────────────────────────────────────────
do $$
declare
  v_table text;
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='pets' and column_name='id') then
    raise exception 'pets.id deveria existir';
  end if;

  if (select pg_get_constraintdef(oid) from pg_constraint where conname='pets_pkey')
     not like '%(id)%' then
    raise exception 'pets PK deveria ser (id), está: %',
      (select pg_get_constraintdef(oid) from pg_constraint where conname='pets_pkey');
  end if;

  foreach v_table in array array['action_logs','vaccines','appointments','weight_entries','medical_events']
  loop
    if not exists (
      select 1 from information_schema.columns
       where table_schema='public' and table_name=v_table and column_name='pet_id'
    ) then
      raise exception 'Tabela % deveria ter coluna pet_id', v_table;
    end if;
  end loop;
end;
$$;
