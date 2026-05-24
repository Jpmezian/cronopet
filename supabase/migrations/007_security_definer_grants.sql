-- ═══════════════════════════════════════════════════════════════
-- ═══ SECURITY DEFINER grants hardening — 2026-05-24            ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Auditoria adversarial (finding #17): a função `is_group_member`
-- foi criada com search_path fixo na migration 004, mas Supabase Linter
-- 0029 (authenticated_security_definer_function_executable) recomenda
-- também REVOKE FROM public + explicit GRANT TO authenticated pra
-- reduzir superfície de execução.
--
-- Hoje qualquer role (incluindo anon) pode tecnicamente EXECUTE a
-- função — embora ela só retorne TRUE se `auth.uid()` bater, o ataque
-- de timing (chamar repetidamente pra enumerar group_ids existentes
-- via diferença de tempo de resposta) é viável.
--
-- Fix: revoke explícito de public + anon, grant só pra authenticated
-- e service_role.

-- ─── is_group_member: bloquear execução pra anon ─────────────
revoke execute on function public.is_group_member(uuid) from public, anon;
grant  execute on function public.is_group_member(uuid) to authenticated, service_role;

comment on function public.is_group_member(uuid) is
  'Helper RLS: true se auth.uid() é membro do family_group. Hardened (migration 007) — só authenticated executa.';
