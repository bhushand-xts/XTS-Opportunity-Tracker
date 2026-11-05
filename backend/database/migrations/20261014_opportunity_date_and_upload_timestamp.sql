BEGIN;

ALTER TABLE tbl_opportunity ALTER COLUMN que_duedate TYPE DATE USING que_duedate::DATE;
ALTER TABLE tbl_opportunity ALTER COLUMN proposal_due_date TYPE DATE USING proposal_due_date::DATE;
ALTER TABLE tbl_opportunity_tracker ALTER COLUMN que_duedate TYPE DATE USING que_duedate::DATE;
ALTER TABLE tbl_opportunity_tracker ALTER COLUMN proposal_due_date TYPE DATE USING proposal_due_date::DATE;

DO $$
DECLARE target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['tbl_opportunity', 'tbl_opportunity_tracker'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'uploaded_dt'
        AND data_type <> 'timestamp with time zone') THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN uploaded_dt TYPE TIMESTAMPTZ USING uploaded_dt::TIMESTAMP AT TIME ZONE ''Asia/Kolkata''', target_table);
    END IF;
  END LOOP;
END $$;

COMMIT;
