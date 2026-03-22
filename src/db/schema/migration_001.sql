-- Migration 001: Add fields required by API spec

-- receipts table additions
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS receipt_time TEXT,
  ADD COLUMN IF NOT EXISTS emoji        TEXT,
  ADD COLUMN IF NOT EXISTS is_business  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_billable  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS items        JSONB   DEFAULT '[]'::jsonb;

-- Drop the hard-coded category check so any string is allowed
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_category_check;

-- user_profiles table additions
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS currency             TEXT    DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS user_type            TEXT,
  ADD COLUMN IF NOT EXISTS monthly_budget       NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS language             TEXT    DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS selected_categories  TEXT[]  DEFAULT '{}';
