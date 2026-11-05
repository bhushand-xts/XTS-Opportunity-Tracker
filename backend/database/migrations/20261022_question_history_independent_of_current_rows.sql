-- A historical question snapshot must outlive its current-table row.
-- Keep qa_id as the historical identifier and retain the opportunity/user FKs.
BEGIN;
DO $$
DECLARE history_fk RECORD;
BEGIN
  FOR history_fk IN
    SELECT conname FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = 'tbl_opportunity_questions_answers_tracker'::regclass
      AND confrelid = 'tbl_opportunity_questions_answers'::regclass
  LOOP
    EXECUTE format('ALTER TABLE tbl_opportunity_questions_answers_tracker DROP CONSTRAINT %I', history_fk.conname);
  END LOOP;
END $$;
COMMIT;
