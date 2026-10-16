-- Persist the category shown in the questionnaire editor with each opportunity question.
BEGIN;
ALTER TABLE tbl_opportunity_questions_answers
  ADD COLUMN IF NOT EXISTS question_category VARCHAR(255);
ALTER TABLE IF EXISTS tbl_opportunity_questions_answers_tracker
  ADD COLUMN IF NOT EXISTS question_category VARCHAR(255);
COMMIT;