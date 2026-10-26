-- Apply to the admin database after 20261023_negotiation_hold.sql.
-- Keep the pre-hold step so resuming a submitted bid does not invent negotiation.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mst_stage WHERE stage_id = 10 AND LOWER(stage_name) = 'on hold') THEN
    RAISE EXCEPTION 'Apply 20261023_negotiation_hold.sql before the proposal follow-up hold migration.';
  END IF;
  IF EXISTS (SELECT 1 FROM mst_sub_stage WHERE sub_stage_id = 20
              AND (stage_id IS DISTINCT FROM 10 OR LOWER(sub_stage_name) IS DISTINCT FROM 'proposal follow-up on hold')) THEN
    RAISE EXCEPTION 'Sub-stage ID 20 already belongs to different master data; no changes applied.';
  END IF;
END $$;

WITH added AS (
  INSERT INTO mst_sub_stage (sub_stage_id, stage_id, sub_stage_name, is_active)
  VALUES (20, 10, 'Proposal Follow-up On Hold', TRUE)
  ON CONFLICT (sub_stage_id) DO NOTHING
  RETURNING *
)
INSERT INTO mst_sub_stage_tracker (sub_stage_id, stage_id, sub_stage_name, created_dt, is_current)
SELECT sub_stage_id, stage_id, sub_stage_name, created_dt, TRUE FROM added;

SELECT setval(pg_get_serial_sequence('mst_sub_stage', 'sub_stage_id'), (SELECT MAX(sub_stage_id) FROM mst_sub_stage));
COMMIT;
