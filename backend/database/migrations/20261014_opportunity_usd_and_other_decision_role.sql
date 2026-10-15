BEGIN;

ALTER TABLE tbl_opportunity ADD COLUMN IF NOT EXISTS estimated_value_usd NUMERIC(15,2);
ALTER TABLE tbl_opportunity_tracker ADD COLUMN IF NOT EXISTS estimated_value_usd NUMERIC(15,2);
ALTER TABLE tbl_client_contact_person ADD COLUMN IF NOT EXISTS role_in_decision_other VARCHAR(255);
ALTER TABLE tbl_client_contact_person_tracker ADD COLUMN IF NOT EXISTS role_in_decision_other VARCHAR(255);

COMMIT;
