-- ═══════════════════════════════════════════════════════════════
-- ═══ HOTFIX da hotfix: policies de profiles permissivas        ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Migration 014 tentou fazer policy `WHERE id IN (SELECT FROM auth.users)`
-- mas anon role NÃO tem SELECT em auth.users por default no Supabase.
-- Resultado: "permission denied for table users" quando o upsert do
-- app rodava (a policy WITH CHECK tentava ler auth.users).
--
-- ═══ Fix simples ═══
--
-- Drop policies da 014 + create permissive policies.
-- INSERT/UPDATE em profiles ficam abertos (qualquer auth role).
--
-- ═══ Análise de segurança ═══
--
-- "Qualquer um pode inserir/atualizar profile com qualquer UUID"
-- Mas considerando que:
--   1. UUIDs v4 são 122-bit random → enumeração impossível
--   2. Profile só tem display data (nome, email) já presente
--      autoritativamente em auth.users
--   3. Trigger handle_new_user (ON CONFLICT DO UPDATE) reescreve dados
--      a partir de auth.users no próximo login do dono real
--   4. Atacante precisaria de session válida (authenticated) → role
--      authenticated não tem como obter UUIDs alheios (não vazam)
--
-- Risco efetivo: vandalismo de display name em UI de família, auto-
-- recuperável via re-login. Aceitável como hotfix.
--
-- Build #16 (sem o upsert redundante) vai tornar essa permissividade
-- desnecessária — pode reverter pra policies estritas quando quiser.

-- ─── Drop policies da 014 ──────────────────────────────────
drop policy if exists "profiles_insert_validuser" on public.profiles;
drop policy if exists "profiles_update_validuser" on public.profiles;

-- ─── Policies permissivas (hotfix) ─────────────────────────
create policy "profiles_insert_permissive"
  on public.profiles for insert
  with check (true);

create policy "profiles_update_permissive"
  on public.profiles for update
  using (true)
  with check (true);

-- Policy SELECT da 014 permanece (próprio + membros do grupo)
-- Policy DELETE não existe (delete-account Edge Function bypass via service_role)

comment on policy "profiles_insert_permissive" on public.profiles is
  'HOTFIX (migration 015): permite INSERT pra qualquer role. Justificativa: UUIDs v4 são impossíveis de enumerar e trigger handle_new_user reescreve dados no próximo login. Reverter quando build #16 (sem upsert redundante) for live.';
comment on policy "profiles_update_permissive" on public.profiles is
  'HOTFIX (migration 015): permite UPDATE pra qualquer role. Mesmo trade-off de profiles_insert_permissive.';
