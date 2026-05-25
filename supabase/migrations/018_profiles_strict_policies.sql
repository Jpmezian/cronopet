-- ═══════════════════════════════════════════════════════════════
-- ═══ Fase 3 cleanup pré-release: profiles policies estritas    ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Reverte os paliativos P3/P4 instalados na migration 015 (policies
-- permissivas pra destravar signup quando o app fazia upsert manual
-- de profile com role anon).
--
-- Build #16+ removeu o upsert redundante de AuthService.signUp — a
-- inserção em profiles é feita 100% pelo trigger handle_new_user
-- (SECURITY DEFINER, roda como postgres, bypass RLS). Logo as
-- policies permissivas viraram dívida sem benefício.
--
-- ═══ Risco coberto por este cleanup ═══
--
-- ANTES (015): qualquer authenticated podia INSERT/UPDATE profile
-- com qualquer UUID. Risco: vandalismo de display name em UI de
-- família (descoberto via group_members).
--
-- DEPOIS (018): só o dono (auth.uid() = id) pode INSERT/UPDATE seu
-- próprio profile. INSERT direto do app continua não acontecendo
-- (trigger faz o trabalho), mas UPDATE de nome/avatar via app fica
-- protegido contra cross-user tampering.
--
-- ═══ Compat com fluxos existentes ═══
--
--   - signUp: trigger handle_new_user (SECURITY DEFINER) faz o
--     INSERT — policies RLS não se aplicam.
--   - signIn / getSession: app NÃO faz upsert em profiles desde
--     build #16. Sem regressão.
--   - settings.tsx (edit nome/avatar — quando existir): vai usar
--     supabase.from('profiles').update().eq('id', user.id) —
--     policy `profiles_update_own` permite (auth.uid() = id).
--   - delete-account Edge Function: usa service_role, bypass RLS.

-- ─── Drop policies permissivas (paliativos P3/P4) ────────────
drop policy if exists "profiles_insert_permissive" on public.profiles;
drop policy if exists "profiles_update_permissive" on public.profiles;

-- ─── Policies estritas (próprio user apenas) ─────────────────
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

comment on policy "profiles_insert_own" on public.profiles is
  'Fase 3 (migration 018): só o próprio user (auth.uid() = id) pode inserir seu profile. Na prática o trigger handle_new_user (SECURITY DEFINER) faz o INSERT no signup — esta policy cobre casos edge onde app tenta upsert defensivo.';
comment on policy "profiles_update_own" on public.profiles is
  'Fase 3 (migration 018): só o próprio user pode editar seu profile (nome, avatar). Previne vandalismo cross-user em UI de família.';
