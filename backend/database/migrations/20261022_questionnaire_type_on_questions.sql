-- Questionnaire mode belongs to questions and their audit snapshots, not tbl_opportunity.
-- Existing rows remain NULL because their original selection is unknown.
BEGIN;
ALTER TABLE tbl_opportunity_questions_answers
  ADD COLUMN IF NOT EXISTS questionnaire_type_id SMALLINT CHECK (questionnaire_type_id IN (1, 2));
ALTER TABLE IF EXISTS tbl_opportunity_questions_answers_tracker
  ADD COLUMN IF NOT EXISTS questionnaire_type_id SMALLINT CHECK (questionnaire_type_id IN (1, 2));
COMMIT;
