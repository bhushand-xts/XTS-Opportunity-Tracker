BEGIN;

DO $$
DECLARE
  target_table TEXT;
  target_column TEXT;
  existing_type TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['tbl_opportunity', 'tbl_opportunity_tracker'] LOOP
    FOREACH target_column IN ARRAY ARRAY['created_dt', 'updated_dt', 'uploaded_dt'] LOOP
      SELECT data_type INTO existing_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = target_table AND column_name = target_column;
      IF existing_type = 'timestamp with time zone' THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMP(0) WITHOUT TIME ZONE USING date_trunc(''second'', %I AT TIME ZONE ''UTC'')', target_table, target_column, target_column);
      ELSE
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMP(0) WITHOUT TIME ZONE USING date_trunc(''second'', %I::TIMESTAMP)', target_table, target_column, target_column);
      END IF;
    END LOOP;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN created_dt SET DEFAULT date_trunc(''second'', CURRENT_TIMESTAMP AT TIME ZONE ''UTC'')', target_table);
  END LOOP;
END $$;

COMMIT;
