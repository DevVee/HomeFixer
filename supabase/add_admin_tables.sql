-- ============================================================
-- HomeFixer — Admin Support Tables
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Audit logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,  -- 'user', 'provider', 'booking', 'setting', 'notification'
  target_id   TEXT,
  details     JSONB DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin     ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_target    ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_only" ON audit_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── App settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_admin_write" ON app_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "settings_all_read" ON app_settings FOR SELECT USING (true);

-- Seed default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('commission_rate',        '10',    'Platform commission percentage per completed job'),
  ('min_wallet_balance',     '-500',  'Minimum wallet balance before booking is restricted (PHP)'),
  ('max_topup_amount',       '10000', 'Maximum single top-up amount (PHP)'),
  ('min_topup_amount',       '100',   'Minimum single top-up amount (PHP)'),
  ('maintenance_mode',       'false', 'Set to true to show maintenance page in app'),
  ('max_booking_advance_days','30',   'How many days in advance a booking can be scheduled'),
  ('support_email',          'support@homefixer.app', 'Support email shown to users'),
  ('app_version_android',    '1.0.0', 'Minimum required Android app version'),
  ('app_version_ios',        '1.0.0', 'Minimum required iOS app version')
ON CONFLICT (key) DO NOTHING;

-- ── Add total_reviews column to provider_profiles ───────────
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- ── Add is_active and is_verified to provider_profiles ──────
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- ── Sync is_verified from verification_status ───────────────
UPDATE provider_profiles SET is_verified = true
WHERE verification_status = 'approved';
