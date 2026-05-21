-- ═══════════════════════════════════════════════════════════════
-- ═══ Security hardening — 2026-05-21                          ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Achados do security audit que esta migration corrige:
--
-- 🟠 H-1 CRÍTICO — is_group_member() SECURITY DEFINER sem search_path
--    Causa: SECURITY DEFINER sem SET search_path permite que atacante
--    com privilégio de CREATE em pg_temp (ou qualquer schema em path
--    de resolução) crie uma tabela `family_members` falsa e a função
--    executa contra ela com privilege do owner.
--    Cobre Supabase Linter check 0010 (security_definer_view) + boas
--    práticas oficiais.
--    Fix: recriar com `set search_path = public, pg_temp` fixo.
--
-- 🟢 Bonus — search_path explícito em qualquer SECURITY DEFINER futuro.
--    Adicionada validação no final pra falhar em prod se alguma função
--    SECURITY DEFINER for criada sem search_path.

-- ─── H-1: is_group_member com search_path fixo ───────────────
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.family_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- Garantir que postgres mantenha ownership (única conta com privilégio
-- de executar SECURITY DEFINER em produção).
alter function public.is_group_member(uuid) owner to postgres;

-- ─── Validação pós-migration ─────────────────────────────────
-- Falha alta em qualquer SECURITY DEFINER função sem search_path setado.
do $$
declare
  v_offenders record;
begin
  for v_offenders in
    select n.nspname || '.' || p.proname as fname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef = true
      and n.nspname = 'public'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
        where cfg like 'search_path=%'
      )
  loop
    raise exception 'SECURITY DEFINER função sem search_path: %', v_offenders.fname;
  end loop;
end $$;
