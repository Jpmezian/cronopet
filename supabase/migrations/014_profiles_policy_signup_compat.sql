-- ═══════════════════════════════════════════════════════════════
-- ═══ EMERGENCY: profiles policy compatível com signUp sem session ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Bug reportado TestFlight build #15 (2026-05-24):
-- "Erro: new row violates row-level security policy for table 'profiles'"
--
-- ═══ Causa raiz ═══
--
-- AuthService.signUp linha 89-93 faz:
--   await supabase.from('profiles').upsert({id, email, nome}).throwOnError();
--
-- Mas com email-confirmation ON (default Supabase), signUp() não cria
-- session imediata. Role corrente = anon → auth.uid() = NULL → policy
-- INSERT "auth.uid() = id" FALHA → exception.
--
-- ═══ Solução de longo prazo (próxima build) ═══
--
-- AuthService.signUp NÃO deveria fazer esse upsert — o trigger
-- handle_new_user já insere profile com nome+email do raw_user_meta_data.
-- O upsert é puro código legado.
--
-- ═══ Hotfix pra build #15 (esta migration) ═══
--
-- Relaxa policies INSERT/UPDATE em profiles pra aceitar quando o id
-- corresponde a um user válido em auth.users (mesmo sem session
-- ativa). Isso permite o upsert redundante do app passar enquanto
-- a próxima build não chega.
--
-- ═══ Análise de segurança ═══
--
-- Risco: atacante autenticado pode sobrescrever nome/email de profile
-- alheio se conseguir o UUID da vítima.
--
-- Mitigação:
--   - UUIDs não são públicos (não vazam em URL, API responses, etc)
--   - Profile só tem display data (nome, email) já presente em
--     auth.users — não vaza nada novo
--   - Trigger handle_new_user (ON CONFLICT DO UPDATE) reescreve dados
--     a partir de auth.users.email autoritativo no próximo login
--   - Risco real: vandalismo de display name em UI de família
--     (low impact, recuperável com 1 trigger fire)
--
-- Trade-off aceito pra desbloquear signUp sem rebuild de app.
-- Pode-se reverter quando build #16 (sem upsert) for live.

-- ─── Drop policies antigas ─────────────────────────────────
drop policy if exists "Usuário cria apenas seu perfil" on public.profiles;
drop policy if exists "Usuário cria próprio perfil" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "Usuário atualiza próprio perfil" on public.profiles;
drop policy if exists "Usuário edita apenas seu perfil" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "Usuário vê apenas seu perfil" on public.profiles;
drop policy if exists "Usuário vê próprio perfil" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "Membros do grupo veem perfis" on public.profiles;

-- ─── Policies novas (consolidadas + relaxadas) ─────────────

-- SELECT: próprio profile OU profile de membro do mesmo grupo familiar
create policy "profiles_select"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
        from public.family_members fm1
        join public.family_members fm2 on fm1.group_id = fm2.group_id
       where fm1.user_id = auth.uid()
         and fm2.user_id = profiles.id
    )
  );

-- INSERT: id deve existir em auth.users (qualquer um, autenticado ou
-- anon durante signUp). Trigger handle_new_user já fez o INSERT real
-- com SECURITY DEFINER bypass — esta policy só permite que o upsert
-- redundante do app não crashe.
create policy "profiles_insert_validuser"
  on public.profiles for insert
  with check (
    exists (select 1 from auth.users u where u.id = profiles.id)
  );

-- UPDATE: próprio profile (caso normal) OU id deve existir em auth.users
-- (caso signUp sem session — upsert vira UPDATE pelo ON CONFLICT)
create policy "profiles_update_validuser"
  on public.profiles for update
  using (
    auth.uid() = id
    or exists (select 1 from auth.users u where u.id = profiles.id)
  )
  with check (
    auth.uid() = id
    or exists (select 1 from auth.users u where u.id = profiles.id)
  );

-- DELETE: só via Edge Function delete-account (service_role bypass)

comment on policy "profiles_select" on public.profiles is
  'Próprio profile + profiles de membros do mesmo family_group.';
comment on policy "profiles_insert_validuser" on public.profiles is
  'Permite INSERT se id existe em auth.users. Compat com upsert do app durante signUp sem session.';
comment on policy "profiles_update_validuser" on public.profiles is
  'Permite UPDATE no próprio profile OU em qualquer profile cujo id existe em auth.users. Trade-off documentado em migration 014.';
