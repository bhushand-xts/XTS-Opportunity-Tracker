-- Run against the admin database. Existing negotiation flags are preserved.
BEGIN;
ALTER TABLE tbl_reason_codes
  ADD COLUMN IF NOT EXISTS is_negotiation_reason BOOLEAN NOT NULL DEFAULT FALSE;
COMMIT;
