-- Adds the forgot-password token table. Run against the database the user
-- service uses (admin_db in the current shared setup).
--
-- Safe to run once against a database created from an older copy of
-- database/services/user/schema.sql. A fresh database created from the
-- current schema.sql already has this table.

CREATE TABLE IF NOT EXISTS password_reset_token (
  token_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES mst_user(user_id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_token(token_hash);
