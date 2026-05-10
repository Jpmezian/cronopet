-- ============================================================
-- CronoPet — Schema Supabase
-- Projeto: qhbsmvuwuiupdqdrrdov
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── Invite code generator ───────────────────────────────────

create or replace function generate_invite_code()
returns text language plpgsql as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i      int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function set_invite_code()
returns trigger language plpgsql as $$
begin
  new.invite_code := generate_invite_code();
  return new;
end;
$$;

-- ─── Profiles ────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nome       text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuário vê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário cria próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── Family Groups ────────────────────────────────────────────

create table if not exists public.family_groups (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  invite_code text unique,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

create trigger trg_set_invite_code
  before insert on public.family_groups
  for each row execute function set_invite_code();

alter table public.family_groups enable row level security;

-- ─── Family Members ───────────────────────────────────────────

create table if not exists public.family_members (
  group_id  uuid not null references public.family_groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id)      on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.family_members enable row level security;

-- Helper: verifica se o usuário é membro do grupo
create or replace function is_group_member(gid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.family_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- ─── Policies (após todas as tabelas existirem) ───────────────

-- Membros do mesmo grupo podem ver perfis uns dos outros
create policy "Membros do grupo veem perfis"
  on public.profiles for select
  using (
    exists (
      select 1 from public.family_members fm1
      join public.family_members fm2
        on fm1.group_id = fm2.group_id
      where fm1.user_id = auth.uid()
        and fm2.user_id = public.profiles.id
    )
  );

-- Family groups policies
create policy "Membros veem o grupo"
  on public.family_groups for select
  using (is_group_member(id));

create policy "Owner cria grupo"
  on public.family_groups for insert
  with check (auth.uid() = owner_id);

-- Family members policies
create policy "Membros veem outros membros"
  on public.family_members for select
  using (is_group_member(group_id));

create policy "Usuários entram no grupo"
  on public.family_members for insert
  with check (auth.uid() = user_id);

-- ─── Pets (1 por grupo, MVP) ──────────────────────────────────

create table if not exists public.pets (
  group_id   uuid primary key references public.family_groups(id) on delete cascade,
  nome       text not null,
  tipo       text not null check (tipo in ('cachorro', 'gato', 'outro')),
  raca       text,
  foto_url   text,
  nascimento date,
  updated_at timestamptz default now()
);

alter table public.pets enable row level security;

create policy "Membros veem o pet"
  on public.pets for select
  using (is_group_member(group_id));

create policy "Membros inserem o pet"
  on public.pets for insert
  with check (is_group_member(group_id));

create policy "Membros atualizam o pet"
  on public.pets for update
  using (is_group_member(group_id));

-- ─── Action Logs ─────────────────────────────────────────────

create table if not exists public.action_logs (
  id        text primary key,
  group_id  uuid not null references public.family_groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id),
  key       text not null,
  timestamp bigint not null,
  note      text,
  synced_at timestamptz default now()
);

create index if not exists action_logs_group_ts
  on public.action_logs(group_id, timestamp desc);

alter table public.action_logs enable row level security;

create policy "Membros veem logs"
  on public.action_logs for select
  using (is_group_member(group_id));

create policy "Membros inserem logs"
  on public.action_logs for insert
  with check (is_group_member(group_id) and auth.uid() = user_id);

-- ─── Medical Events ───────────────────────────────────────────

create table if not exists public.medical_events (
  id        text primary key,
  group_id  uuid not null references public.family_groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id),
  type      text not null,
  timestamp bigint not null,
  note      text,
  synced_at timestamptz default now()
);

alter table public.medical_events enable row level security;

create policy "Membros veem eventos médicos"
  on public.medical_events for select
  using (is_group_member(group_id));

create policy "Membros inserem eventos médicos"
  on public.medical_events for insert
  with check (is_group_member(group_id) and auth.uid() = user_id);

create policy "Membros deletam próprios eventos"
  on public.medical_events for delete
  using (auth.uid() = user_id);

-- ─── Vaccines ────────────────────────────────────────────────

create table if not exists public.vaccines (
  id          text primary key,
  group_id    uuid not null references public.family_groups(id) on delete cascade,
  nome        text not null,
  data        date not null,
  proxima     date,
  veterinario text,
  lote        text,
  nota        text,
  synced_at   timestamptz default now()
);

alter table public.vaccines enable row level security;

create policy "Membros veem vacinas"   on public.vaccines for select using (is_group_member(group_id));
create policy "Membros inserem vacinas" on public.vaccines for insert with check (is_group_member(group_id));
create policy "Membros deletam vacinas" on public.vaccines for delete using (is_group_member(group_id));

-- ─── Appointments ────────────────────────────────────────────

create table if not exists public.appointments (
  id          text primary key,
  group_id    uuid not null references public.family_groups(id) on delete cascade,
  titulo      text not null,
  data        date not null,
  hora        time,
  veterinario text,
  nota        text,
  synced_at   timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Membros veem consultas"   on public.appointments for select using (is_group_member(group_id));
create policy "Membros inserem consultas" on public.appointments for insert with check (is_group_member(group_id));
create policy "Membros deletam consultas" on public.appointments for delete using (is_group_member(group_id));

-- ─── Weight Entries ───────────────────────────────────────────

create table if not exists public.weight_entries (
  id        text primary key,
  group_id  uuid not null references public.family_groups(id) on delete cascade,
  peso      numeric(5,2) not null,
  data      date not null,
  nota      text,
  synced_at timestamptz default now()
);

alter table public.weight_entries enable row level security;

create policy "Membros veem peso"   on public.weight_entries for select using (is_group_member(group_id));
create policy "Membros inserem peso" on public.weight_entries for insert with check (is_group_member(group_id));
create policy "Membros deletam peso" on public.weight_entries for delete using (is_group_member(group_id));

-- ─── Realtime ────────────────────────────────────────────────

alter publication supabase_realtime add table public.action_logs;
