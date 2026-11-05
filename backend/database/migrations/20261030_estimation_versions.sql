-- Immutable named estimates and exact snapshots submitted for review.
BEGIN;
CREATE TABLE IF NOT EXISTS tbl_opportunity_estimation_versions (
  estimation_version_id BIGSERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES tbl_opportunity(opportunity_id),
  version INTEGER NOT NULL CHECK (version > 0),
  name VARCHAR(150) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('SAVED', 'SUBMITTED')),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  currency_code VARCHAR(20) NOT NULL,
  person_weeks NUMERIC(20,4) NOT NULL,
  created_by INTEGER NOT NULL,
  created_dt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_key VARCHAR(100) NOT NULL,
  UNIQUE (opportunity_id, version),
  UNIQUE (opportunity_id, request_key)
);
COMMIT;
