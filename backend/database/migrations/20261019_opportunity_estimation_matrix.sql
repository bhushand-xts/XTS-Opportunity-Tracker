BEGIN;
CREATE TABLE IF NOT EXISTS tbl_opportunity_estimation_matrix (
  opportunity_id INTEGER PRIMARY KEY REFERENCES tbl_opportunity(opportunity_id),
  revision INTEGER NOT NULL CHECK (revision > 0),
  rows JSONB NOT NULL CHECK (jsonb_typeof(rows) = 'array'),
  assumptions TEXT NOT NULL DEFAULT '',
  total NUMERIC(18,2) NOT NULL CHECK (total >= 0),
  updated_by INTEGER NOT NULL,
  updated_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
