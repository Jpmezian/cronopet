-- ═══════════════════════════════════════════════════════════════
-- ═══ CronoPet — Row Level Security Policies                  ═══
-- ═══════════════════════════════════════════════════════════════
--
-- INSTRUÇÕES:
--   1. Abra o Supabase Dashboard → SQL Editor
--   2. Cole este arquivo INTEIRO e clique em "Run"
--   3. Verifique no Database → Tables se cada tabela tem o ícone 🔒 (RLS enabled)
--
-- IMPORTANTE: SEM ESSE ARQUIVO RODADO, QUALQUER PESSOA PODE LER OS DADOS
-- DE QUALQUER USUÁRIO usando a anon key (que está no bundle do app).
--
-- Princípios aplicados:
--   • Default deny (RLS enabled em tudo)
--   • Cada user só vê os próprios dados E os dados do grupo familiar dele
--   • Server role (Edge Functions) bypassa via service_role key (uso interno)
--
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PROFILES (usuário ↔ family_group_id) ─────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  nome            TEXT,
  family_group_id UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada user só lê o próprio profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Cada user pode inserir o próprio profile (durante signup)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Cada user pode atualizar o próprio profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: só via Edge Function (LGPD account-deletion flow)

-- ─── 2. FAMILY_GROUPS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL CHECK (length(nome) <= 80),
  invite_code TEXT UNIQUE NOT NULL CHECK (length(invite_code) BETWEEN 6 AND 12),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_groups_invite_code ON family_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_groups_owner ON family_groups(owner_id);

ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;

-- Member do grupo pode ler
CREATE POLICY "family_groups_select_member"
  ON family_groups FOR SELECT
  USING (
    id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Qualquer user autenticado pode criar (vira owner automaticamente)
CREATE POLICY "family_groups_insert_self"
  ON family_groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Apenas owner pode atualizar
CREATE POLICY "family_groups_update_owner"
  ON family_groups FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Apenas owner pode deletar
CREATE POLICY "family_groups_delete_owner"
  ON family_groups FOR DELETE
  USING (auth.uid() = owner_id);

-- ─── 3. FAMILY_MEMBERS (relação grupo ↔ user) ────────────────

CREATE TABLE IF NOT EXISTS family_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (family_group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_group ON family_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Member do mesmo grupo pode ver outros members
CREATE POLICY "family_members_select_same_group"
  ON family_members FOR SELECT
  USING (
    family_group_id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  );

-- User pode se adicionar a um grupo (joinFamilyGroup)
CREATE POLICY "family_members_insert_self"
  ON family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User pode sair do grupo (deletar a própria membership)
CREATE POLICY "family_members_delete_self"
  ON family_members FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 4. PETS (perfis de pet vinculados a grupo) ──────────────

CREATE TABLE IF NOT EXISTS pets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL CHECK (length(nome) <= 50),
  tipo            TEXT NOT NULL CHECK (tipo IN ('cachorro', 'gato', 'outro')),
  raca            TEXT CHECK (length(raca) <= 60),
  foto_url        TEXT,
  nascimento      DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_pets_group ON pets(family_group_id) WHERE deleted_at IS NULL;

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pets_select_group_member"
  ON pets FOR SELECT
  USING (
    family_group_id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "pets_insert_group_member"
  ON pets FOR INSERT
  WITH CHECK (
    family_group_id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "pets_update_group_member"
  ON pets FOR UPDATE
  USING (
    family_group_id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    family_group_id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  );

-- DELETE: usar UPDATE deleted_at = now() (soft delete)

-- ─── 5. ACTION_LOGS (registros diários) ──────────────────────

CREATE TABLE IF NOT EXISTS action_logs (
  id           TEXT PRIMARY KEY,                                        -- Client-generated ID
  group_id     UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id       UUID REFERENCES pets(id) ON DELETE CASCADE,
  key          TEXT NOT NULL CHECK (key IN ('comida','agua','passeio','xixi','coco','banho')),
  timestamp    BIGINT NOT NULL,                                         -- Unix epoch ms
  note         TEXT CHECK (length(note) <= 500),
  quantity     INTEGER CHECK (quantity > 0 AND quantity <= 100000),
  duration     INTEGER CHECK (duration > 0 AND duration <= 1440),
  volume_ml    INTEGER CHECK (volume_ml > 0 AND volume_ml <= 10000),
  acceptance   TEXT CHECK (acceptance IN ('full','partial','refused')),
  consistency  TEXT CHECK (consistency IN ('normal','soft','liquid','hard')),
  appearance   TEXT CHECK (appearance IN ('normal','abnormal')),
  sub_actions  TEXT[] CHECK (sub_actions <@ ARRAY['xixi','coco']::TEXT[]),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_group_ts ON action_logs(group_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_ts ON action_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_pet_ts ON action_logs(pet_id, timestamp DESC) WHERE pet_id IS NOT NULL;

ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_logs_select_group_member"
  ON action_logs FOR SELECT
  USING (
    group_id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "action_logs_insert_self_in_group"
  ON action_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    group_id IN (
      SELECT family_group_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Apenas o autor pode atualizar próprios logs (membros do grupo só leem)
CREATE POLICY "action_logs_update_author"
  ON action_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "action_logs_delete_author"
  ON action_logs FOR DELETE
  USING (user_id = auth.uid());

-- ─── 6. VACCINES ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vaccines (
  id              TEXT PRIMARY KEY,
  group_id        UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL CHECK (length(nome) <= 60),
  data            DATE NOT NULL,
  proxima         DATE,
  veterinario     TEXT CHECK (length(veterinario) <= 60),
  lote            TEXT CHECK (length(lote) <= 30),
  nota            TEXT CHECK (length(nota) <= 500),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaccines_group ON vaccines(group_id);

ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vaccines_select_group" ON vaccines FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "vaccines_insert_group" ON vaccines FOR INSERT
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "vaccines_update_group" ON vaccines FOR UPDATE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "vaccines_delete_group" ON vaccines FOR DELETE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));

-- ─── 7. APPOINTMENTS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id              TEXT PRIMARY KEY,
  group_id        UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL CHECK (length(titulo) <= 80),
  data            DATE NOT NULL,
  hora            TEXT CHECK (hora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  veterinario     TEXT CHECK (length(veterinario) <= 60),
  nota            TEXT CHECK (length(nota) <= 500),
  notificacao_id  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_group_data ON appointments(group_id, data DESC);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_group" ON appointments FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "appointments_insert_group" ON appointments FOR INSERT
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "appointments_update_group" ON appointments FOR UPDATE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "appointments_delete_group" ON appointments FOR DELETE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));

-- ─── 8. WEIGHT_ENTRIES ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS weight_entries (
  id              TEXT PRIMARY KEY,
  group_id        UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
  peso            NUMERIC(6,2) NOT NULL CHECK (peso > 0 AND peso < 200),
  data            DATE NOT NULL,
  nota            TEXT CHECK (length(nota) <= 500),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_group_data ON weight_entries(group_id, data DESC);

ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weight_entries_select_group" ON weight_entries FOR SELECT
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "weight_entries_insert_group" ON weight_entries FOR INSERT
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "weight_entries_update_group" ON weight_entries FOR UPDATE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "weight_entries_delete_group" ON weight_entries FOR DELETE
  USING (group_id IN (SELECT family_group_id FROM profiles WHERE id = auth.uid()));

-- ─── 9. SUBSCRIPTIONS (espelho do StoreKit/RevenueCat) ───────
-- Esta tabela é populada APENAS via Edge Function que valida receipt
-- com Apple/Google. NUNCA permitir client-side inserts/updates.

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

-- Cada user vê APENAS a própria assinatura
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: APENAS via service_role (Edge Function).
-- Ausência de policy = bloqueio total para anon/authenticated roles.

-- ─── 10. AUDITORIA: log de eventos sensíveis ─────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,             -- ex: 'account_deleted', 'family_group_left', 'subscription_started'
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_ts ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_ts ON audit_log(event, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas service_role lê/escreve (Edge Functions de monitoramento)
-- Nenhuma policy = bloqueio total pra client-side

-- ═══════════════════════════════════════════════════════════════
-- ═══ FIM ═══
-- ═══════════════════════════════════════════════════════════════
--
-- VERIFICAÇÃO PÓS-EXECUÇÃO:
--
-- 1. No SQL Editor, rode:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--    Todas devem ter rowsecurity = true.
--
-- 2. Teste com a anon key (sem login):
--    SELECT * FROM action_logs LIMIT 5;
--    Deve retornar 0 rows (RLS bloqueia).
--
-- 3. Teste com user autenticado:
--    SELECT * FROM action_logs LIMIT 5;
--    Deve retornar APENAS rows do grupo familiar do user.
--
-- 4. Habilite Realtime SOMENTE nas tabelas necessárias:
--    Database → Replication → Tables → toggle action_logs (e outras se quiser real-time).
--
-- ═══════════════════════════════════════════════════════════════
