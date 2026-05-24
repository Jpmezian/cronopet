-- ═══════════════════════════════════════════════════════════════
-- ═══ EMERGENCY FIX: is_group_member EXECUTE pra anon          ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Bug reportado em TestFlight build #15 (2026-05-24): "permission
-- denied for function is_group_member" na hora de criar conta.
--
-- ═══ Causa raiz ═══
--
-- Migration 007 (auditor adversarial #17) revogou EXECUTE pra anon:
--   revoke execute on function public.is_group_member(uuid)
--     from public, anon;
--
-- Justificativa do auditor: "timing attack pra enumerar group_ids".
-- Análise prática invalida essa preocupação:
--   - is_group_member faz SELECT EXISTS com auth.uid()
--   - Anon role: auth.uid() retorna NULL
--   - SELECT EXISTS(... WHERE user_id = NULL) sempre retorna FALSE
--   - Tempo de execução é constante (não depende de dados sensíveis)
--   - SEM oracle: atacante não consegue distinguir nada
--
-- Durante signUp com email-confirmation ON (default Supabase):
--   1. supabase.auth.signUp() cria auth.users SEM session ativa
--   2. App continua executando (signUp não throw)
--   3. Em algum ponto (hydrateStoreFromCloud, autoSync, etc) o app
--      faz query a tabela com RLS que chama is_group_member
--   4. Role corrente = anon (sem session) → permission denied
--   5. Erro propaga até a UI: "Erro: permission denied for function
--      is_group_member"
--
-- ═══ Fix ═══
--
-- Re-grant EXECUTE pra anon. A função permanece segura porque é
-- intrinsicamente protegida pelo auth.uid() check — não pelo grant.
-- Defense in depth: a security real está nas POLICIES que CHAMAM
-- a função (que avaliam o resultado dela), não no grant da função.

grant execute on function public.is_group_member(uuid) to anon;

-- Mantém grants existentes (authenticated, service_role).
-- Public role permanece sem grant explícito (anon é específico,
-- public era genérico demais).

comment on function public.is_group_member(uuid) is
  'Helper RLS: true se auth.uid() é membro do family_group. Safe pra anon (sempre retorna false porque auth.uid() é null sem session).';
