-- ═══════════════════════════════════════════════════════════════
-- ═══ Fix RLS: pets UPDATE precisa de WITH CHECK                ═══
-- ═══════════════════════════════════════════════════════════════
--
-- Buraco identificado em auditoria de RLS (2026-05-26):
-- A policy "Membros atualizam o pet" tinha USING is_group_member(group_id)
-- mas WITH CHECK estava AUSENTE. Resultado: um member podia UPDATE
-- o row mudando o `group_id` pra um grupo arbitrário (incluindo um
-- grupo onde o atacante NÃO é member), efetivamente "movendo" o pet
-- pra fora do grupo origem ou pra um grupo controlado por ele.
--
-- Postgres aplica USING no row PRÉ-update (verifica acesso pra
-- modificar) e WITH CHECK no row PÓS-update (verifica que o estado
-- novo ainda satisfaz a policy). Sem WITH CHECK, qualquer estado
-- novo passa.
--
-- Demais tabelas (vaccines, weight_entries, appointments) já tinham
-- WITH CHECK is_group_member(group_id) em UPDATE — só pets escapou.
-- Provável regressão de migration 016/017 (cleanup + multi-pet).
--
-- Fix: DROP + CREATE com WITH CHECK simétrica ao USING.
--
-- ═══ Impacto operacional ═══
-- Zero quebra pra fluxos legítimos: UPDATE feito pelo app NUNCA
-- altera group_id (petProfileToRow em syncMappers.ts sempre envia
-- o group_id atual do pet). Policy nova só bloqueia o cenário
-- adversarial.

drop policy if exists "Membros atualizam o pet" on public.pets;

create policy "Membros atualizam o pet"
on public.pets
for update
to public
using (is_group_member(group_id))
with check (is_group_member(group_id));

comment on policy "Membros atualizam o pet" on public.pets is
  'Fase 5 cleanup (migration 019): fecha buraco onde member podia migrar pet pra grupo arbitrário via UPDATE de group_id. WITH CHECK simétrica ao USING — apenas members podem aceitar o estado pós-update.';
