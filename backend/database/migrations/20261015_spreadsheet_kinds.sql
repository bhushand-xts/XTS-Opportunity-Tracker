-- Additive: allow Excel (.xlsx) and CSV source documents for question extraction.
BEGIN;
ALTER TABLE question_documents DROP CONSTRAINT IF EXISTS question_documents_kind_check;
ALTER TABLE question_documents ADD CONSTRAINT question_documents_kind_check
  CHECK (kind IN ('pdf','docx','doc','txt','xlsx','csv'));
COMMIT;
