-- ═══════════════════════════════════════════════════════════════
-- ═══ CronoPet — RLS adaptado ao schema real de produção       ═══
-- ═══════════════════════════════════════════════════════════════
-- Diferenças vs 001:
--   • Tabelas usam `group_id` (não `family_group_id`)
--   • `profiles` recebe `family_group_id` adicionada via ALTER
--   • `medical_events` (não previsto) recebe RLS
--   • `subscriptions` e `audit_log` criadas se não existirem
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE
-- ═══════════════════════════════════════════════════════════════

-- ─── 0. Adicionar family_group_id em profiles ───────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS family_group_id UUID;

-- ─── 1. Habilitar RLS em todas as tabelas existentes ────────

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries  ENABLE ROW LEVEL SECURITY;

-- ─── 2. PROFILES ────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_select_own  ON profiles;
DROP POLICY IF EXISTS profiles_insert_own  ON profiles;
DROP POLICY IF EXISTS profiles_update_own  ON profiles;

CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─── 3. FAMILY_GROUPS ───────────────────────────────────────

DROP POLICY IF EXISTS fg_select_member ON family_groups;
DROP POLICY IF EXISTS fg_insert_self   ON family_groups;
DROP POLICY IF EXISTS fg_update_owner  ON family_groups;
DROP POLICY IF EXISTS fg_delete_owner  ON family_groups;

CREATE POLICY fg_select_member ON family_groups FOR SELECT
  USING (id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY fg_insert_self   ON family_groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY fg_update_owner  ON family_groups FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY fg_delete_owner  ON family_groups FOR DELETE
  USING (auth.uid() = owner_id);

-- ─── 4. FAMILY_MEMBERS (usa group_id) ───────────────────────

DROP POLICY IF EXISTS fm_select_same_group ON family_members;
DROP POLICY IF EXISTS fm_insert_self       ON family_members;
DROP POLICY IF EXISTS fm_delete_self       ON family_members;

CREATE POLICY fm_select_same_group ON family_members FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY fm_insert_self ON family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY fm_delete_self ON family_members FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 5. PETS ────────────────────────────────────────────────

DROP POLICY IF EXISTS pets_select_group ON pets;
DROP POLICY IF EXISTS pets_insert_group ON pets;
DROP POLICY IF EXISTS pets_update_group ON pets;
DROP POLICY IF EXISTS pets_delete_group ON pets;

CREATE POLICY pets_select_group ON pets FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY pets_insert_group ON pets FOR INSERT
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY pets_update_group ON pets FOR UPDATE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY pets_delete_group ON pets FOR DELETE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));

-- ─── 6. ACTION_LOGS ─────────────────────────────────────────

DROP POLICY IF EXISTS al_select_group  ON action_logs;
DROP POLICY IF EXISTS al_insert_self   ON action_logs;
DROP POLICY IF EXISTS al_update_author ON action_logs;
DROP POLICY IF EXISTS al_delete_author ON action_logs;

CREATE POLICY al_select_group ON action_logs FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY al_insert_self ON action_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY al_update_author ON action_logs FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY al_delete_author ON action_logs FOR DELETE
  USING (user_id = auth.uid());

-- ─── 7. MEDICAL_EVENTS ──────────────────────────────────────

DROP POLICY IF EXISTS me_select_group  ON medical_events;
DROP POLICY IF EXISTS me_insert_self   ON medical_events;
DROP POLICY IF EXISTS me_update_author ON medical_events;
DROP POLICY IF EXISTS me_delete_author ON medical_events;

CREATE POLICY me_select_group ON medical_events FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY me_insert_self ON medical_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY me_update_author ON medical_events FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY me_delete_author ON medical_events FOR DELETE
  USING (user_id = auth.uid());

-- ─── 8. VACCINES ────────────────────────────────────────────

DROP POLICY IF EXISTS vac_select ON vaccines;
DROP POLICY IF EXISTS vac_insert ON vaccines;
DROP POLICY IF EXISTS vac_update ON vaccines;
DROP POLICY IF EXISTS vac_delete ON vaccines;

CREATE POLICY vac_select ON vaccines FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY vac_insert ON vaccines FOR INSERT
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY vac_update ON vaccines FOR UPDATE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY vac_delete ON vaccines FOR DELETE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));

-- ─── 9. APPOINTMENTS ────────────────────────────────────────

DROP POLICY IF EXISTS apt_select ON appointments;
DROP POLICY IF EXISTS apt_insert ON appointments;
DROP POLICY IF EXISTS apt_update ON appointments;
DROP POLICY IF EXISTS apt_delete ON appointments;

CREATE POLICY apt_select ON appointments FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY apt_insert ON appointments FOR INSERT
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY apt_update ON appointments FOR UPDATE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY apt_delete ON appointments FOR DELETE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));

-- ─── 10. WEIGHT_ENTRIES ─────────────────────────────────────

DROP POLICY IF EXISTS we_select ON weight_entries;
DROP POLICY IF EXISTS we_insert ON weight_entries;
DROP POLICY IF EXISTS we_update ON weight_entries;
DROP POLICY IF EXISTS we_delete ON weight_entries;

CREATE POLICY we_select ON weight_entries FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY we_insert ON weight_entries FOR INSERT
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY we_update ON weight_entries FOR UPDATE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY we_delete ON weight_entries FOR DELETE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));

-- ─── 11. SUBSCRIPTIONS (criar se não existe) ────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan              TEXT NOT NULL CHECK (plan IN ('monthly', 'annual', 'trial', 'free')),
  status            TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'in_trial')),
  expires_at        TIMESTAMPTZ,
  trial_ends_at     TIMESTAMPTZ,
  apple_receipt     TEXT,
  google_purchase   TEXT,
  revenuecat_id     TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sub_select_own ON subscriptions;
CREATE POLICY sub_select_own ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE = bloqueado (apenas service_role via Edge Function)

-- ─── 12. AUDIT_LOG (criar se não existe) ────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_ts ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_ts ON audit_log(event, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Sem policies = bloqueio total para anon/authenticated. Apenas service_role acessa.

-- ═══════════════════════════════════════════════════════════════
-- ═══ FIM ═══
-- ═══════════════════════════════════════════════════════════════
