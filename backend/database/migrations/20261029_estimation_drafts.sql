BEGIN;
ALTER TABLE tbl_opportunity_estimation_matrix
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
  ADD COLUMN IF NOT EXISTS draft_grid JSONB CHECK (draft_grid IS NULL OR jsonb_typeof(draft_grid) = 'object');

-- Existing estimates past Engineering have already entered the review workflow.
UPDATE tbl_opportunity_estimation_matrix AS estimate
SET status = 'SUBMITTED'
FROM tbl_opportunity AS opportunity
WHERE estimate.opportunity_id = opportunity.opportunity_id
  AND opportunity.stage_id IN (4, 5, 6, 7, 8, 9, 10);
COMMIT;
