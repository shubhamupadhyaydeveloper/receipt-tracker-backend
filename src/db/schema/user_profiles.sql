CREATE TABLE user_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid              TEXT UNIQUE NOT NULL,
  full_name                 TEXT,
  email                     TEXT,
  avatar_url                TEXT,
  plan                      TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_started_at           TIMESTAMPTZ,
  plan_expires_at           TIMESTAMPTZ,
  razorpay_subscription_id  TEXT,
  razorpay_customer_id      TEXT,
  receipts_scanned_this_month INT DEFAULT 0,
  last_usage_reset_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
