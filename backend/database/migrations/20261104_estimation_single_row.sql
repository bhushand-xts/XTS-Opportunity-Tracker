-- Keep one main-table row per saved estimate. Retire the old internal copy.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE tbl_opportunity_estimation IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE tbl_opportunity_estimation DROP CONSTRAINT IF EXISTS chk_estimation_current_selection;
DROP INDEX IF EXISTS uq_opportunity_estimation_current;

-- Preserve every affected row exactly before cleanup, including its audit flags.
INSERT INTO tbl_opportunity_estimation_tracker
  (estimation_id, opportunity_id, resource_allocation, rate_snapshot,
   person_weeks, person_weeks_cost, estimation_name, isselected, is_current,
   created_by, created_dt, updated_by, updated_dt)
SELECT estimation_id, opportunity_id, resource_allocation, rate_snapshot,
   person_weeks, person_weeks_cost, estimation_name, isselected, is_current,
   created_by, created_dt, updated_by, updated_dt
FROM tbl_opportunity_estimation
WHERE NOT (resource_allocation ? 'saved')
  OR is_current IS DISTINCT FROM (COALESCE(resource_allocation->'saved'->>'deleted','false') = 'false');

-- Internal copies are archived above; actual named estimates remain untouched.
DELETE FROM tbl_opportunity_estimation working
WHERE NOT (working.resource_allocation ? 'saved') AND working.isselected = FALSE
  AND EXISTS (SELECT 1 FROM tbl_opportunity_estimation saved
    WHERE saved.opportunity_id = working.opportunity_id AND saved.resource_allocation ? 'saved');

-- Recover a lone old draft (or an explicitly selected old copy) as a named estimate.
-- This prevents unique estimate data from disappearing during the upgrade.
WITH recovered AS (
  SELECT e.estimation_id,
    COALESCE((SELECT MAX((saved.resource_allocation->'saved'->>'version')::INTEGER)
      FROM tbl_opportunity_estimation saved WHERE saved.opportunity_id=e.opportunity_id
        AND saved.resource_allocation ? 'saved'), 0)
    + ROW_NUMBER() OVER (PARTITION BY e.opportunity_id ORDER BY e.estimation_id) AS version
  FROM tbl_opportunity_estimation e WHERE NOT (e.resource_allocation ? 'saved')
)
UPDATE tbl_opportunity_estimation e
SET estimation_name=COALESCE(NULLIF(BTRIM(e.estimation_name), ''), 'Recovered estimate ' || e.estimation_id),
  resource_allocation=e.resource_allocation || jsonb_build_object('saved', jsonb_build_object(
    'version', recovered.version, 'status', CASE WHEN e.isselected THEN 'SUBMITTED' ELSE 'SAVED' END,
    'requestKey', 'single-row-migration-' || e.estimation_id))
FROM recovered WHERE recovered.estimation_id=e.estimation_id;

-- Current means the latest active row for each estimate, independently of selection.
UPDATE tbl_opportunity_estimation SET is_current=(COALESCE(resource_allocation->'saved'->>'deleted','false')='false')
WHERE is_current IS DISTINCT FROM (COALESCE(resource_allocation->'saved'->>'deleted','false')='false');
ALTER TABLE tbl_opportunity_estimation ALTER COLUMN isselected SET DEFAULT FALSE;
ALTER TABLE tbl_opportunity_estimation ALTER COLUMN is_current SET DEFAULT TRUE;
ALTER TABLE tbl_opportunity_estimation_tracker ALTER COLUMN is_current SET DEFAULT TRUE;
DROP INDEX IF EXISTS uq_opportunity_estimation_working;
CREATE UNIQUE INDEX IF NOT EXISTS uq_opportunity_estimation_selected
  ON tbl_opportunity_estimation (opportunity_id) WHERE isselected=TRUE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='tbl_opportunity_estimation'::REGCLASS
    AND conname='chk_estimation_named_row') THEN
    ALTER TABLE tbl_opportunity_estimation ADD CONSTRAINT chk_estimation_named_row CHECK (resource_allocation ? 'saved');
  END IF;
END $$;
COMMIT;
