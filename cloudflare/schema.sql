-- ============================================
-- BestVietnam D1 schema
-- Run this in Cloudflare D1 dashboard or via wrangler
-- ============================================

-- Users table: shared account for the couple
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    passphrase_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Data table: one row per data key per user
-- Keys used by the app:
--   settings        -> trip_start, trip_end, visa_date, visa_days, budget_rub, etc.
--   expenses        -> array of expense objects
--   routes          -> array of user routes
--   custom_cruises  -> array of custom cruise ideas
--   notes           -> object { itemId: text }
CREATE TABLE IF NOT EXISTS data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    UNIQUE(user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit log: every change is recorded
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by TEXT,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Optional index for audit log
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_log(user_id, changed_at DESC);
