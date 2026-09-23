-- DDL for the user service's tables.
-- Source: the live database (admin_db dump of 2026-09-21), where these two
-- tables currently sit in the same database as the admin service's tables.
--
-- role_id holds a mst_roles.role_id from the admin service, with no foreign
-- key — the roles table belongs to another service.

CREATE TABLE mst_user (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER,      -- admin service's mst_roles.role_id; no foreign key
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
