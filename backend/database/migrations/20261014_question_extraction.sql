-- Additive. Apply before enabling extraction; no existing workflow tables altered.
BEGIN;
CREATE TABLE IF NOT EXISTS question_documents (
  id uuid PRIMARY KEY, owner_id integer NOT NULL,
  opportunity_id integer REFERENCES tbl_opportunity(opportunity_id),
  storage_key text NOT NULL UNIQUE, original_name varchar(100) NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pdf','docx','doc','txt')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0), sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
  deleting boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS question_document_sources (
  opportunity_id integer PRIMARY KEY REFERENCES tbl_opportunity(opportunity_id),
  document_id uuid NOT NULL REFERENCES question_documents(id)
);
CREATE TABLE IF NOT EXISTS question_extraction_jobs (
  id uuid PRIMARY KEY, document_id uuid NOT NULL REFERENCES question_documents(id) ON DELETE CASCADE,
  owner_id integer NOT NULL, request_key uuid NOT NULL,
  state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED')),
  model text NOT NULL, prompt_version text NOT NULL DEFAULT 'questions-v1',
  attempts integer NOT NULL DEFAULT 0, lease_token uuid, lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(), error_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,request_key)
);
CREATE INDEX IF NOT EXISTS question_jobs_pending ON question_extraction_jobs(state,next_attempt_at);
CREATE TABLE IF NOT EXISTS question_extraction_chunks (
  job_id uuid NOT NULL REFERENCES question_extraction_jobs(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL, blocks jsonb NOT NULL, candidates jsonb,
  PRIMARY KEY(job_id,chunk_index)
);
-- Serializes quota reservations across worker processes using the same organization key.
CREATE TABLE IF NOT EXISTS question_extraction_quota (
  scope text PRIMARY KEY, minute_started timestamptz NOT NULL DEFAULT now(),
  day_started timestamptz NOT NULL DEFAULT now(), minute_tokens integer NOT NULL DEFAULT 0,
  minute_requests integer NOT NULL DEFAULT 0,
  day_tokens integer NOT NULL DEFAULT 0, day_requests integer NOT NULL DEFAULT 0,
  blocked_until timestamptz NOT NULL DEFAULT now()
);
COMMIT;
