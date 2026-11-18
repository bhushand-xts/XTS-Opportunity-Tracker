CREATE TABLE IF NOT EXISTS tbl_opportunity_document (
  document_id BIGSERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES tbl_opportunity(opportunity_id) ON DELETE CASCADE,
  file_path VARCHAR(100) NOT NULL,
  file_name VARCHAR(100) NOT NULL,
  uploaded_by INTEGER NOT NULL,
  uploaded_dt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  document_title VARCHAR(100),
  file_type VARCHAR(20),
  file_size BIGINT,
  deleted_by INTEGER,
  deleted_dt TIMESTAMP,
  UNIQUE (opportunity_id, file_path)
);

-- Rename columns if the earlier version of this migration was already applied.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='tbl_opportunity_document' AND column_name='storage_path')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='tbl_opportunity_document' AND column_name='file_path') THEN
    ALTER TABLE tbl_opportunity_document RENAME COLUMN storage_path TO file_path;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='tbl_opportunity_document' AND column_name='original_name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='tbl_opportunity_document' AND column_name='file_name') THEN
    ALTER TABLE tbl_opportunity_document RENAME COLUMN original_name TO file_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='tbl_opportunity_document' AND column_name='uploaded_at')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='tbl_opportunity_document' AND column_name='uploaded_dt') THEN
    ALTER TABLE tbl_opportunity_document RENAME COLUMN uploaded_at TO uploaded_dt;
  END IF;
END $$;

ALTER TABLE tbl_opportunity_document
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS document_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS deleted_by INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_dt TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_opportunity_document_opportunity
  ON tbl_opportunity_document (opportunity_id, uploaded_dt DESC);

DROP INDEX IF EXISTS uq_opportunity_document_active_name;

CREATE INDEX IF NOT EXISTS idx_opportunity_document_active_name
  ON tbl_opportunity_document (opportunity_id, lower(trim(coalesce(document_title, file_name))))
  WHERE is_active = TRUE;
