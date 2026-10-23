-- Apply to the admin service database. Opportunity stage IDs are cross-service references.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM mst_stage WHERE stage_id = 10 AND LOWER(stage_name) IS DISTINCT FROM 'on hold')
     OR EXISTS (SELECT 1 FROM mst_sub_stage WHERE sub_stage_id = 19
                AND (stage_id IS DISTINCT FROM 10 OR LOWER(sub_stage_name) IS DISTINCT FROM 'negotiation on hold')) THEN
    RAISE EXCEPTION 'Workflow IDs 10/19 already belong to different master data; no changes applied.';
  END IF;
END $$;

WITH added AS (
  INSERT INTO mst_stage (stage_id, stage_name, description, display_order, is_active)
  VALUES (10, 'On Hold', 'Sales Head placed the opportunity on hold after negotiation.', 9, TRUE)
  ON CONFLICT (stage_id) DO NOTHING
  RETURNING *
)
INSERT INTO mst_stage_tracker (stage_id, stage_name, description, display_order, created_dt, is_current)
SELECT stage_id, stage_name, description, display_order, created_dt, TRUE FROM added;

WITH added AS (
  INSERT INTO mst_sub_stage (sub_stage_id, stage_id, sub_stage_name, is_active)
  VALUES (19, 10, 'Negotiation On Hold', TRUE)
  ON CONFLICT (sub_stage_id) DO NOTHING
  RETURNING *
)
INSERT INTO mst_sub_stage_tracker (sub_stage_id, stage_id, sub_stage_name, is_active, created_dt, is_current)
SELECT sub_stage_id, stage_id, sub_stage_name, is_active, created_dt, TRUE FROM added;

SELECT setval(pg_get_serial_sequence('mst_stage', 'stage_id'), (SELECT MAX(stage_id) FROM mst_stage));
SELECT setval(pg_get_serial_sequence('mst_sub_stage', 'sub_stage_id'), (SELECT MAX(sub_stage_id) FROM mst_sub_stage));
COMMIT;
