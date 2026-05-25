-- ═══════════════════════════════════════════════════════════════
-- ═══ Cleanup definitivo + FK CASCADE fix — 2026-05-25         ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Revisão senior (2026-05-25) descobriu:
--
-- 🚨 BUG REAL: action_logs.user_id e medical_events.user_id têm FK
--    ON DELETE NO ACTION → delete-account Edge Function vai QUEBRAR
--    no primeiro user real que pedir exclusão. Reproduzido via curl:
--    "violates foreign key constraint action_logs_user_id_fkey"
--
-- 🟡 DEAD SCHEMA: 4 elementos sem uso pelo código:
--    - subscriptions (legado, RevenueCat usa próprio backend)
--    - audit_log (criada por outra pessoa, zero código toca)
--    - profiles.full_name (legacy, app usa profiles.nome desde 012)
--    - profiles.family_group_id (legacy, membership está em family_members)
--
-- Esta migration NÃO mexe em:
--    - pets PK (DB-002 backlog, requer refactor coordenado com app)
--    - profiles policies (mantidas permissivas pra build #15 funcionar
--      até user atualizar pro #16 — migration 017 futura aperta)

-- ─── FIX FK CASCADE (CRÍTICO) ────────────────────────────────

-- action_logs.user_id → CASCADE
alter table public.action_logs
  drop constraint if exists action_logs_user_id_fkey;
alter table public.action_logs
  add constraint action_logs_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade;

-- medical_events.user_id → CASCADE
alter table public.medical_events
  drop constraint if exists medical_events_user_id_fkey;
alter table public.medical_events
  add constraint medical_events_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade;

-- ─── CLEANUP dead schema ─────────────────────────────────────

-- DROP subscriptions (RevenueCat usa próprio backend; tabela nunca foi
-- populada e nenhum código toca)
drop table if exists public.subscriptions cascade;

-- DROP audit_log (origem desconhecida, 0 rows, 0 código)
drop table if exists public.audit_log cascade;

-- DROP coluna profiles.full_name (substituída por profiles.nome em
-- migration 012, código atualizado)
alter table public.profiles drop column if exists full_name;

-- DROP coluna profiles.family_group_id (legacy desnormalizado, nunca
-- foi mantido sincronizado; membership real está em family_members)
alter table public.profiles drop column if exists family_group_id;

-- ─── Validação pós-migration ─────────────────────────────────
do $$
begin
  -- Confirma que action_logs.user_id agora CASCADE
  if not exists (
    select 1 from pg_constraint c
     where c.conname = 'action_logs_user_id_fkey'
       and c.confdeltype = 'c'  -- 'c' = CASCADE
  ) then
    raise exception 'action_logs_user_id_fkey deveria estar CASCADE';
  end if;

  -- Confirma drops
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='subscriptions') then
    raise exception 'subscriptions deveria ter sido dropada';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='audit_log') then
    raise exception 'audit_log deveria ter sido dropada';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name') then
    raise exception 'profiles.full_name deveria ter sido dropada';
  end if;
end;
$$;

comment on constraint action_logs_user_id_fkey on public.action_logs is
  'ON DELETE CASCADE: action_logs do user são apagados quando profile é deletado (delete-account flow). Fix migration 016.';
comment on constraint medical_events_user_id_fkey on public.medical_events is
  'ON DELETE CASCADE: medical_events do user são apagados quando profile é deletado (delete-account flow). Fix migration 016.';
