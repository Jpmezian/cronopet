-- ═══════════════════════════════════════════════════════════════
-- ═══ redeem_invite_code: fix ambiguidade group_id              ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Supabase Linter (rodado em 2026-05-24 após migration 009) flagou:
--   "column reference 'group_id' is ambiguous"
-- Na subquery `select exists(... where group_id = v_group_id ...)`
-- o nome `group_id` colidia com o RETURNS TABLE (group_id uuid, ...).
--
-- Postgres resolvia (preferindo a coluna), mas linter sinaliza error.
-- Fix: prefixar colunas de retorno com `out_` pra eliminar colisão.
--
-- Aproveitando o redeploy, também:
-- - DROP da função antiga (RETURNS TABLE shape mudou → não dá pra
--   CREATE OR REPLACE direto, precisa DROP + CREATE)
-- - Cliente (services/SyncService.ts) já lê `row.group_id` → precisa
--   trocar pra `row.out_group_id`. Patch acompanha esta migration.

drop function if exists public.redeem_invite_code(text);

create function public.redeem_invite_code(p_code text)
returns table (out_group_id uuid, out_group_nome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid            uuid := auth.uid();
  v_recent_count   integer;
  v_group_id       uuid;
  v_group_nome     text;
  v_already_member boolean;
  v_code           text;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  v_code := upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
  if length(v_code) < 6 or length(v_code) > 12 then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  -- Rate limit: 5 attempts no último minuto
  select count(*) into v_recent_count
    from public.family_join_attempts fja
   where fja.user_id = v_uid
     and fja.attempted_at > now() - interval '1 minute';

  if v_recent_count >= 5 then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  select fg.id, fg.nome into v_group_id, v_group_nome
    from public.family_groups fg
   where fg.invite_code = v_code
   limit 1;

  insert into public.family_join_attempts (user_id, success)
  values (v_uid, v_group_id is not null);

  if v_group_id is null then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  select exists(
    select 1 from public.family_members fm
     where fm.group_id = v_group_id and fm.user_id = v_uid
  ) into v_already_member;

  if not v_already_member then
    insert into public.family_members (group_id, user_id, role)
    values (v_group_id, v_uid, 'member');
  end if;

  out_group_id   := v_group_id;
  out_group_nome := v_group_nome;
  return next;
end;
$$;

alter function public.redeem_invite_code(text) owner to postgres;
revoke execute on function public.redeem_invite_code(text) from public, anon;
grant  execute on function public.redeem_invite_code(text) to authenticated;

comment on function public.redeem_invite_code(text) is
  'RPC pra entrar em grupo familiar via código. Rate limit 5/min/user. Mesma mensagem pra inválido/expirado/rate-limited (anti-oracle). Retorna out_group_id + out_group_nome.';
