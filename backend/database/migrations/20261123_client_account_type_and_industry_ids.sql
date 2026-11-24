-- mst_client / mst_client_tracker: replace the free-text account_type and
-- sector columns with integer references to mst_account_type and mst_industry.
-- Safe to re-run: new columns are added only if missing, and existing text
-- values are backfilled by matching the master names (case-insensitive)
-- before the old columns are dropped.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['mst_client', 'mst_client_tracker'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS account_type_id INTEGER', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS industry_id INTEGER', t);

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'account_type') THEN
      EXECUTE format(
        'UPDATE %I c SET account_type_id = a.account_type_id
           FROM mst_account_type a
          WHERE c.account_type_id IS NULL AND LOWER(TRIM(c.account_type)) = LOWER(a.account_name)', t);
      EXECUTE format('ALTER TABLE %I DROP COLUMN account_type', t);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'sector') THEN
      EXECUTE format(
        'UPDATE %I c SET industry_id = i.industry_id
           FROM mst_industry i
          WHERE c.industry_id IS NULL AND LOWER(TRIM(c.sector)) = LOWER(i.industry_name)', t);
      EXECUTE format('ALTER TABLE %I DROP COLUMN sector', t);
    END IF;
  END LOOP;
END $$;
