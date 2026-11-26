-- Ensure client and client history store lookup keys only. Existing databases
-- may already have the ID columns, so all additions are idempotent.
ALTER TABLE mst_client
  ADD COLUMN IF NOT EXISTS account_type_id INTEGER,
  ADD COLUMN IF NOT EXISTS industry_id INTEGER;

ALTER TABLE mst_client_tracker
  ADD COLUMN IF NOT EXISTS account_type_id INTEGER,
  ADD COLUMN IF NOT EXISTS industry_id INTEGER;

-- Backfill installations that still have the former name columns.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mst_client' AND column_name = 'account_type') THEN
    EXECUTE 'UPDATE mst_client c SET account_type_id = a.account_type_id FROM mst_account_type a WHERE c.account_type_id IS NULL AND LOWER(TRIM(c.account_type)) = LOWER(TRIM(a.account_name))';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mst_client' AND column_name = 'sector') THEN
    EXECUTE 'UPDATE mst_client c SET industry_id = i.industry_id FROM mst_industry i WHERE c.industry_id IS NULL AND LOWER(TRIM(c.sector)) = LOWER(TRIM(i.industry_name))';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mst_client_tracker' AND column_name = 'account_type') THEN
    EXECUTE 'UPDATE mst_client_tracker c SET account_type_id = a.account_type_id FROM mst_account_type a WHERE c.account_type_id IS NULL AND LOWER(TRIM(c.account_type)) = LOWER(TRIM(a.account_name))';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mst_client_tracker' AND column_name = 'sector') THEN
    EXECUTE 'UPDATE mst_client_tracker c SET industry_id = i.industry_id FROM mst_industry i WHERE c.industry_id IS NULL AND LOWER(TRIM(c.sector)) = LOWER(TRIM(i.industry_name))';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mst_client_account_type_id ON mst_client (account_type_id);
CREATE INDEX IF NOT EXISTS idx_mst_client_industry_id ON mst_client (industry_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mst_client_account_type') THEN
    ALTER TABLE mst_client ADD CONSTRAINT fk_mst_client_account_type
      FOREIGN KEY (account_type_id) REFERENCES mst_account_type(account_type_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mst_client_industry') THEN
    ALTER TABLE mst_client ADD CONSTRAINT fk_mst_client_industry
      FOREIGN KEY (industry_id) REFERENCES mst_industry(industry_id);
  END IF;
END $$;
