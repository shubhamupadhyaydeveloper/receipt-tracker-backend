-- Migration 002: Add indexes for query performance

-- Covers user_id-only filters (COUNT, SUM aggregations)
CREATE INDEX IF NOT EXISTS idx_receipts_user_id      ON receipts(user_id);

-- Covers sorted listing and date-range filters (dashboard, reports, export)
CREATE INDEX IF NOT EXISTS idx_receipts_user_date    ON receipts(user_id, receipt_date DESC);

-- Covers ORDER BY created_at on recent receipts query
CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON receipts(user_id, created_at DESC);

-- Covers category breakdown queries
CREATE INDEX IF NOT EXISTS idx_receipts_user_cat     ON receipts(user_id, category);

-- Covers payment session lookups by user
CREATE INDEX IF NOT EXISTS idx_payment_sessions_uid  ON payment_sessions(user_id);
