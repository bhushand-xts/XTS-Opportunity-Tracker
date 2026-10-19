-- Extraction-only progress, bounded retries, versioned coverage and job deadlines.
BEGIN;
ALTER TABLE question_extraction_jobs DROP CONSTRAINT IF EXISTS question_extraction_jobs_state_check;
ALTER TABLE question_extraction_jobs ADD CONSTRAINT question_extraction_jobs_state_check
  CHECK (state IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED','PARTIAL'));
ALTER TABLE question_extraction_jobs ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'PARSING';
ALTER TABLE question_extraction_jobs ADD COLUMN IF NOT EXISTS coverage jsonb NOT NULL DEFAULT '[]';
ALTER TABLE question_extraction_jobs ADD COLUMN IF NOT EXISTS warnings jsonb NOT NULL DEFAULT '[]';
ALTER TABLE question_extraction_jobs ADD COLUMN IF NOT EXISTS deadline_at timestamptz NOT NULL DEFAULT (now()+interval '20 minutes');
ALTER TABLE question_extraction_jobs ADD COLUMN IF NOT EXISTS provider_calls integer NOT NULL DEFAULT 0;
ALTER TABLE question_extraction_jobs ADD COLUMN IF NOT EXISTS reserved_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE question_extraction_chunks ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE question_extraction_chunks ADD COLUMN IF NOT EXISTS split_depth integer NOT NULL DEFAULT 0;
ALTER TABLE question_extraction_chunks ADD COLUMN IF NOT EXISTS is_legacy boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS question_document_hash_scope ON question_documents(owner_id,sha256,opportunity_id);
COMMIT;
