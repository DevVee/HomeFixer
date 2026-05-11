-- ============================================================
-- HomeFixer — Wallet Tables Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Provider wallets (one row per provider) ─────────────────
CREATE TABLE IF NOT EXISTS provider_wallets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID REFERENCES provider_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance              DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_earned         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_commission_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Wallet transactions (ledger) ────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID REFERENCES provider_profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('earning', 'commission', 'topup', 'penalty')),
  amount        DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Add commission columns to bookings ──────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS commission_rate   INTEGER DEFAULT 10;

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wallet_provider    ON provider_wallets(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_provider ON wallet_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_booking  ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created  ON wallet_transactions(created_at);

-- ── Auto-create wallet row when a provider_profile is inserted
CREATE OR REPLACE FUNCTION create_provider_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO provider_wallets (provider_id)
  VALUES (NEW.id)
  ON CONFLICT (provider_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_provider_wallet ON provider_profiles;
CREATE TRIGGER trg_create_provider_wallet
  AFTER INSERT ON provider_profiles
  FOR EACH ROW EXECUTE FUNCTION create_provider_wallet();

-- Back-fill wallets for existing providers
INSERT INTO provider_wallets (provider_id)
SELECT id FROM provider_profiles
ON CONFLICT (provider_id) DO NOTHING;

-- ── Row-Level Security ──────────────────────────────────────
ALTER TABLE provider_wallets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallet: provider reads/updates own; admin reads all
CREATE POLICY "wallet_select_own" ON provider_wallets FOR SELECT
  USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "wallet_update_own" ON provider_wallets FOR UPDATE
  USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));

CREATE POLICY "wallet_insert_trigger" ON provider_wallets FOR INSERT
  WITH CHECK (true); -- auto-created by trigger (SECURITY DEFINER)

-- Transactions: provider reads own; admin reads all; service role inserts
CREATE POLICY "wallet_tx_select" ON wallet_transactions FOR SELECT
  USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "wallet_tx_insert" ON wallet_transactions FOR INSERT
  WITH CHECK (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));
