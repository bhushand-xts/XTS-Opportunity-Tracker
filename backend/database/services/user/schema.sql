-- DDL for the `xts_user` database only.
-- Source: schema.sql (Section 6, 24-table design), user-owned tables.
--
-- Cross-service FK columns are kept as plain INTEGER (no DB-level FK,
-- since the referenced table now lives in a different service's
-- database) — referential integrity for these is enforced in the
-- application layer instead. Each dropped FK is noted inline.

CREATE TABLE mst_user (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER,      -- was FK -> mst_roles(role_id) in admin's DB
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE auth_session (
  session_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES mst_user(user_id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_session_token_hash ON auth_session(token_hash);

-- =====================================================================
-- FOREIGN KEY CONSTRAINTS (intra-service only)
-- =====================================================================

ALTER TABLE mst_user ADD CONSTRAINT fk_mst_user_created_by FOREIGN KEY (created_by) REFERENCES mst_user(user_id);
ALTER TABLE mst_user ADD CONSTRAINT fk_mst_user_updated_by FOREIGN KEY (updated_by) REFERENCES mst_user(user_id);
