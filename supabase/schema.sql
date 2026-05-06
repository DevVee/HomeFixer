-- ============================================================
-- HomeFixer — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles (mirrors auth.users) ───────────────────────────
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  phone       TEXT DEFAULT '',
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'provider', 'admin')),
  is_verified BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Provider profiles ───────────────────────────────────────
CREATE TABLE provider_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  bio                  TEXT DEFAULT '',
  service_category     TEXT NOT NULL,
  hourly_rate          DECIMAL(10,2) DEFAULT 0,
  is_available         BOOLEAN DEFAULT true,
  barangay             TEXT DEFAULT '',
  city                 TEXT DEFAULT '',
  years_of_experience  INTEGER DEFAULT 0,
  verification_status  TEXT DEFAULT 'pending'
                         CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  average_rating       DECIMAL(3,2) DEFAULT 0,
  total_jobs_completed INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Provider documents ──────────────────────────────────────
CREATE TABLE provider_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('government_id', 'certification')),
  file_url    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bookings ────────────────────────────────────────────────
CREATE TABLE bookings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                 UUID REFERENCES profiles(id) NOT NULL,
  provider_id                 UUID REFERENCES provider_profiles(id) NOT NULL,
  service_category_id         TEXT NOT NULL,
  description_of_problem      TEXT NOT NULL,
  scheduled_date              DATE NOT NULL,
  scheduled_time              TEXT NOT NULL,
  status                      TEXT DEFAULT 'pending'
                                CHECK (status IN (
                                  'pending','accepted','declined','en_route',
                                  'in_progress','completed','cancelled','paid'
                                )),
  address                     TEXT NOT NULL,
  quoted_price                DECIMAL(10,2),
  final_price                 DECIMAL(10,2),
  payment_method              TEXT NOT NULL
                                CHECK (payment_method IN ('gcash','maya','cod','card')),
  payment_status              TEXT DEFAULT 'unpaid'
                                CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  paymongo_source_id          TEXT,
  paymongo_payment_intent_id  TEXT,
  notes                       TEXT DEFAULT '',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ────────────────────────────────────────────────
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id  UUID REFERENCES profiles(id) NOT NULL,
  text       TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ───────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL
               CHECK (type IN ('booking','message','payment','review','verification','system')),
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reviews ─────────────────────────────────────────────────
CREATE TABLE reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id         UUID REFERENCES profiles(id) NOT NULL,
  provider_profile_id UUID REFERENCES provider_profiles(id) NOT NULL,
  rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags                TEXT[] DEFAULT '{}',
  comment             TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Expo push tokens ────────────────────────────────────────
CREATE TABLE push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  platform   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_bookings_customer   ON bookings(customer_id);
CREATE INDEX idx_bookings_provider   ON bookings(provider_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_messages_booking    ON messages(booking_id);
CREATE INDEX idx_messages_created    ON messages(created_at);
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX idx_push_tokens_user    ON push_tokens(user_id);

-- ── updated_at helper ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_bookings_updated_at  BEFORE UPDATE ON bookings  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tokens_updated_at    BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-create profile on signup ───────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role     TEXT;
  v_category TEXT;
BEGIN
  v_role     := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  v_category := COALESCE(NEW.raw_user_meta_data->>'service_category', 'plumbing');

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'provider' THEN
    INSERT INTO provider_profiles (user_id, service_category)
    VALUES (NEW.id, v_category)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── Row-Level Security ──────────────────────────────────────
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens         ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_all"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Provider profiles
CREATE POLICY "providers_select_all"  ON provider_profiles FOR SELECT USING (true);
CREATE POLICY "providers_insert_own"  ON provider_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "providers_update_own"  ON provider_profiles FOR UPDATE  USING (user_id = auth.uid());

-- Provider documents
CREATE POLICY "docs_own" ON provider_documents FOR ALL
  USING (provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));

-- Bookings — customer, provider, or admin can see
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
  customer_id = auth.uid()
  OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (
  customer_id = auth.uid()
  OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Messages
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  sender_id = auth.uid()
  OR booking_id IN (
    SELECT id FROM bookings WHERE
      customer_id = auth.uid()
      OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND booking_id IN (
    SELECT id FROM bookings WHERE
      customer_id = auth.uid()
      OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
  )
);

-- Notifications — service role inserts, users read/update own
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true); -- service role only

-- Reviews
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (
  customer_id = auth.uid()
  AND booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid() AND status = 'paid')
);

-- Push tokens
CREATE POLICY "push_tokens_own" ON push_tokens FOR ALL USING (user_id = auth.uid());
