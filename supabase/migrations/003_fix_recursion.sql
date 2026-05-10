-- ═══════════════════════════════════════════════════════════════
-- ═══ Fix recursão: usar is_group_member() (SECURITY DEFINER)  ═══
-- ═══════════════════════════════════════════════════════════════
-- A função is_group_member() bypassa RLS, então não causa loop.
-- Substituímos todas as subqueries em profiles por chamadas a ela.
-- ═══════════════════════════════════════════════════════════════

-- ─── family_members ──────────────────────────────────────────
DROP POLICY IF EXISTS fm_select_same_group ON family_members;
DROP POLICY IF EXISTS fm_insert_self       ON family_members;
DROP POLICY IF EXISTS fm_delete_self       ON family_members;

-- legacy "Membros veem outros membros" (is_group_member) já cobre SELECT
-- legacy "Usuários entram no grupo" já cobre INSERT
-- Adicionamos só DELETE (legacy não tinha)
CREATE POLICY fm_delete_self ON family_members FOR DELETE
  USING (auth.uid() = user_id);

-- ─── family_groups ───────────────────────────────────────────
DROP POLICY IF EXISTS fg_select_member ON family_groups;
DROP POLICY IF EXISTS fg_insert_self   ON family_groups;
DROP POLICY IF EXISTS fg_update_owner  ON family_groups;
DROP POLICY IF EXISTS fg_delete_owner  ON family_groups;

-- legacy "Membros veem o grupo" (is_group_member(id)) cobre SELECT
-- legacy "Owner cria grupo" cobre INSERT
-- Adicionamos UPDATE/DELETE (legacy não tinha)
CREATE POLICY fg_update_owner ON family_groups FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY fg_delete_owner ON family_groups FOR DELETE
  USING (auth.uid() = owner_id);

-- ─── pets ────────────────────────────────────────────────────
DROP POLICY IF EXISTS pets_select_group ON pets;
DROP POLICY IF EXISTS pets_insert_group ON pets;
DROP POLICY IF EXISTS pets_update_group ON pets;
DROP POLICY IF EXISTS pets_delete_group ON pets;

-- legacy SELECT/INSERT/UPDATE já cobrem com is_group_member
-- Adicionamos só DELETE
CREATE POLICY pets_delete_group ON pets FOR DELETE
  USING (is_group_member(group_id));

-- ─── action_logs ─────────────────────────────────────────────
DROP POLICY IF EXISTS al_select_group  ON action_logs;
DROP POLICY IF EXISTS al_insert_self   ON action_logs;
DROP POLICY IF EXISTS al_update_author ON action_logs;
DROP POLICY IF EXISTS al_delete_author ON action_logs;

-- legacy "Membros veem logs" e "Membros inserem logs" já cobrem SELECT/INSERT
-- Adicionamos UPDATE/DELETE author-locked (legacy não tinha)
CREATE POLICY al_update_author ON action_logs FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY al_delete_author ON action_logs FOR DELETE
  USING (user_id = auth.uid());

-- ─── medical_events ──────────────────────────────────────────
DROP POLICY IF EXISTS me_select_group  ON medical_events;
DROP POLICY IF EXISTS me_insert_self   ON medical_events;
DROP POLICY IF EXISTS me_update_author ON medical_events;
DROP POLICY IF EXISTS me_delete_author ON medical_events;

-- legacy já cobre SELECT/INSERT/DELETE; falta UPDATE
CREATE POLICY me_update_author ON medical_events FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── vaccines ────────────────────────────────────────────────
DROP POLICY IF EXISTS vac_select ON vaccines;
DROP POLICY IF EXISTS vac_insert ON vaccines;
DROP POLICY IF EXISTS vac_update ON vaccines;
DROP POLICY IF EXISTS vac_delete ON vaccines;

-- legacy SELECT/INSERT/DELETE cobrem; adicionamos UPDATE
CREATE POLICY vac_update ON vaccines FOR UPDATE
  USING (is_group_member(group_id)) WITH CHECK (is_group_member(group_id));

-- ─── appointments ────────────────────────────────────────────
DROP POLICY IF EXISTS apt_select ON appointments;
DROP POLICY IF EXISTS apt_insert ON appointments;
DROP POLICY IF EXISTS apt_update ON appointments;
DROP POLICY IF EXISTS apt_delete ON appointments;

-- legacy SELECT/INSERT/DELETE cobrem; adicionamos UPDATE
CREATE POLICY apt_update ON appointments FOR UPDATE
  USING (is_group_member(group_id)) WITH CHECK (is_group_member(group_id));

-- ─── weight_entries ──────────────────────────────────────────
DROP POLICY IF EXISTS we_select ON weight_entries;
DROP POLICY IF EXISTS we_insert ON weight_entries;
DROP POLICY IF EXISTS we_update ON weight_entries;
DROP POLICY IF EXISTS we_delete ON weight_entries;

-- legacy SELECT/INSERT/DELETE cobrem; adicionamos UPDATE
CREATE POLICY we_update ON weight_entries FOR UPDATE
  USING (is_group_member(group_id)) WITH CHECK (is_group_member(group_id));

-- ─── profiles ────────────────────────────────────────────────
-- Mantemos as policies de profiles como estavam (tanto minhas quanto legacy)
-- A recursão era causada por OUTRAS tabelas referenciando profiles em subselect.
-- Agora que removemos isso, não há mais loop.

-- ═══════════════════════════════════════════════════════════════
-- ═══ FIM ═══
-- ═══════════════════════════════════════════════════════════════
