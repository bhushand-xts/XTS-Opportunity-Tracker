-- Run against the admin database. Previous versions must outlive the phase
-- they describe. No tracker rows are removed or rewritten by this migration.
BEGIN;
DO $$
DECLARE history_fk RECORD;
BEGIN
  FOR history_fk IN
    SELECT conname FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = to_regclass('tbl_estimation_phases_tracker')
      AND confrelid = to_regclass('mst_estimation_phases')
  LOOP
    EXECUTE format('ALTER TABLE tbl_estimation_phases_tracker DROP CONSTRAINT %I', history_fk.conname);
  END LOOP;
END $$;
COMMIT;
