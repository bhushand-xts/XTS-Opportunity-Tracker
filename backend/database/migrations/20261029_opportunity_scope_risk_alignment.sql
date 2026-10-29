-- Scope/Risk/Alignment assessment tables for the opportunity preparation
-- workflow (OT-90). These tables already existed on the shared dev DB
-- (created ad hoc, never committed) -- this migration documents them so
-- a fresh environment (e.g. AWS) ends up with the same schema. All
-- statements are additive and idempotent.

CREATE TABLE IF NOT EXISTS tbl_opportunity_scope (
  scope_id SERIAL PRIMARY KEY,
  scope_description TEXT NOT NULL,
  opportunity_id INTEGER NOT NULL UNIQUE REFERENCES tbl_opportunity(opportunity_id),
  created_by INTEGER NOT NULL,       -- was FK -> mst_user(user_id) in user's DB
  created_dt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,                -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_opportunity_scope_opportunity ON tbl_opportunity_scope (opportunity_id);

CREATE TABLE IF NOT EXISTS tbl_opportunity_scope_tracker (
  tracker_id BIGSERIAL PRIMARY KEY,
  scope_id INTEGER NOT NULL,
  scope_description TEXT NOT NULL,
  opportunity_id INTEGER NOT NULL REFERENCES tbl_opportunity(opportunity_id),
  created_by INTEGER NOT NULL,
  created_dt TIMESTAMPTZ NOT NULL,
  updated_by INTEGER,
  updated_dt TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_opportunity_scope_tracker_history ON tbl_opportunity_scope_tracker (opportunity_id, tracker_id DESC);

CREATE TABLE IF NOT EXISTS tbl_opportunity_risk (
  risk_id SERIAL PRIMARY KEY,
  risk_description TEXT NOT NULL,
  opportunity_id INTEGER NOT NULL REFERENCES tbl_opportunity(opportunity_id),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  created_by INTEGER NOT NULL,
  created_dt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  updated_dt TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_opportunity_risk_opportunity ON tbl_opportunity_risk (opportunity_id);

CREATE TABLE IF NOT EXISTS tbl_opportunity_risk_tracker (
  tracker_id BIGSERIAL PRIMARY KEY,
  risk_id INTEGER NOT NULL,
  risk_description TEXT NOT NULL,
  opportunity_id INTEGER NOT NULL REFERENCES tbl_opportunity(opportunity_id),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  created_by INTEGER NOT NULL,
  created_dt TIMESTAMPTZ NOT NULL,
  updated_by INTEGER,
  updated_dt TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_opportunity_risk_tracker_history ON tbl_opportunity_risk_tracker (opportunity_id, tracker_id DESC);

CREATE TABLE IF NOT EXISTS tbl_opportunity_alignment (
  alignment_id SERIAL PRIMARY KEY,
  alignment_description TEXT NOT NULL,
  opportunity_id INTEGER NOT NULL REFERENCES tbl_opportunity(opportunity_id),
  created_by INTEGER NOT NULL,
  created_dt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  updated_dt TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_opportunity_alignment_opportunity ON tbl_opportunity_alignment (opportunity_id);

CREATE TABLE IF NOT EXISTS tbl_opportunity_alignment_tracker (
  tracker_id BIGSERIAL PRIMARY KEY,
  alignment_id INTEGER NOT NULL,
  alignment_description TEXT NOT NULL,
  opportunity_id INTEGER NOT NULL REFERENCES tbl_opportunity(opportunity_id),
  created_by INTEGER NOT NULL,
  created_dt TIMESTAMPTZ NOT NULL,
  updated_by INTEGER,
  updated_dt TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_opportunity_alignment_tracker_history ON tbl_opportunity_alignment_tracker (opportunity_id, tracker_id DESC);
