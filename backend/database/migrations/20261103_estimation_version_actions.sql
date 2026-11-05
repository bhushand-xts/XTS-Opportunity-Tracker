-- Keep deleted estimates for audit and link immutable update revisions.
BEGIN;
ALTER TABLE tbl_opportunity_estimation_versions
  ADD COLUMN IF NOT EXISTS deleted_dt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by INTEGER,
  ADD COLUMN IF NOT EXISTS supersedes_id BIGINT REFERENCES tbl_opportunity_estimation_versions(estimation_version_id);
COMMIT;
