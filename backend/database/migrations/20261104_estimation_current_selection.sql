-- is_current identifies the selected estimate, not the unnamed working copy.
-- Preserve changed named rows in history; existing tracker rows stay untouched.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE tbl_opportunity_estimation IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO tbl_opportunity_estimation_tracker
  (estimation_id, opportunity_id, resource_allocation, rate_snapshot,
   person_weeks, person_weeks_cost, estimation_name, isselected, is_current,
   created_by, created_dt, updated_by, updated_dt)
SELECT estimation_id, opportunity_id, resource_allocation, rate_snapshot,
   person_weeks, person_weeks_cost, estimation_name, isselected, is_current,
   created_by, created_dt, updated_by, updated_dt
FROM tbl_opportunity_estimation
WHERE resource_allocation ? 'saved' AND is_current IS DISTINCT FROM isselected;

-- Clear the old flags first to preserve the unique current-per-opportunity index.
UPDATE tbl_opportunity_estimation SET is_current = FALSE
WHERE is_current = TRUE AND isselected = FALSE;
UPDATE tbl_opportunity_estimation SET is_current = TRUE
WHERE isselected = TRUE AND is_current = FALSE;
ALTER TABLE tbl_opportunity_estimation ALTER COLUMN is_current SET DEFAULT FALSE;
ALTER TABLE tbl_opportunity_estimation_tracker ALTER COLUMN is_current SET DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_opportunity_estimation_working
  ON tbl_opportunity_estimation (opportunity_id) WHERE NOT (resource_allocation ? 'saved');
DROP INDEX IF EXISTS idx_opportunity_estimation_named;
CREATE INDEX idx_opportunity_estimation_named
  ON tbl_opportunity_estimation (opportunity_id) WHERE resource_allocation ? 'saved';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'tbl_opportunity_estimation'::REGCLASS AND conname = 'chk_estimation_current_selection') THEN
    ALTER TABLE tbl_opportunity_estimation ADD CONSTRAINT chk_estimation_current_selection
      CHECK (is_current = isselected);
  END IF;
END $$;
COMMIT;
