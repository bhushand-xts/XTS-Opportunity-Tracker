-- DDL for the `xts_opportunity` database only.
-- Source: schema.sql (Section 6, 24-table design), opportunity-owned tables.
--
-- Cross-service FK columns are kept as plain INTEGER (no DB-level FK,
-- since the referenced table now lives in a different service's
-- database) — referential integrity for these is enforced in the
-- application layer instead. Each dropped FK is noted inline.

CREATE TABLE tbl_opportunity (
  opportunity_id SERIAL PRIMARY KEY,
  opportunity_number VARCHAR(50),
  opportunity_name VARCHAR(255),
  opportunity_type_id INTEGER,
  source_type_id INTEGER,
  client_id INTEGER,          -- was FK -> mst_client(client_id) in account's DB
  stage_id INTEGER,           -- was FK -> mst_stage(stage_id) in admin's DB
  sub_stage_id INTEGER,       -- was FK -> mst_sub_stage(sub_stage_id) in admin's DB
  owner_id INTEGER,           -- was FK -> mst_user(user_id) in user's DB
  assigned_to INTEGER,        -- was FK -> mst_user(user_id) in user's DB
  priority CHAR(30),
  service_line VARCHAR(255),
  solicitation_number VARCHAR(50),
  issuing_agency VARCHAR(255),
  procurement_contact VARCHAR(50),
  que_duedate DATE,
  submission_method VARCHAR(255),
  contract_term VARCHAR(50),
  incumbent_vendor VARCHAR(255),
  pre_bidmeeting INTEGER,
  document_type VARCHAR(50),
  file_name VARCHAR(100),
  file_path VARCHAR(100),
  uploaded_by INTEGER,        -- was FK -> mst_user(user_id) in user's DB
  uploaded_dt DATE,
  doc_submission_format VARCHAR(100),
  evaluation_basis VARCHAR(100),
  opportunity_description TEXT,
  lead_received_date TIMESTAMP,
  expected_start_date TIMESTAMP,
  expected_close_date DATE,
  proposal_due_date TIMESTAMP,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tbl_opportunity_tracker (
  opportunity_tracker_id SERIAL PRIMARY KEY,
  opportunity_id INTEGER,
  opportunity_number VARCHAR(50),
  opportunity_name VARCHAR(255),
  opportunity_type_id INTEGER,
  source_type_id INTEGER,
  client_id INTEGER,          -- was FK -> mst_client(client_id) in account's DB
  stage_id INTEGER,           -- was FK -> mst_stage(stage_id) in admin's DB
  sub_stage_id INTEGER,       -- was FK -> mst_sub_stage(sub_stage_id) in admin's DB
  owner_id INTEGER,           -- was FK -> mst_user(user_id) in user's DB
  assigned_to INTEGER,        -- was FK -> mst_user(user_id) in user's DB
  priority INTEGER,
  service_line VARCHAR(255),
  solicitation_number VARCHAR(50),
  issuing_agency VARCHAR(255),
  procurement_contact VARCHAR(50),
  que_duedate DATE,
  submission_method VARCHAR(255),
  contract_term VARCHAR(50),
  incumbent_vendor VARCHAR(255),
  pre_bidmeeting INTEGER,
  document_type VARCHAR(50),
  file_name VARCHAR(100),
  file_path VARCHAR(100),
  uploaded_by INTEGER,        -- was FK -> mst_user(user_id) in user's DB
  uploaded_dt DATE,
  doc_submission_format VARCHAR(100),
  evaluation_basis VARCHAR(100),
  opportunity_description TEXT,
  lead_received_date TIMESTAMP,
  expected_start_date TIMESTAMP,
  expected_close_date DATE,
  proposal_due_date TIMESTAMP,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE tbl_opportunity_questions_answers (
  qa_id SERIAL PRIMARY KEY,
  opportunity_id INTEGER,
  opportunity_type_id INTEGER,
  question TEXT,
  answer TEXT,
  answered_by INTEGER,        -- was FK -> mst_user(user_id) in user's DB
  answered_dt TIMESTAMP,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tbl_opportunity_engage_tracker (
  tracker_id SERIAL PRIMARY KEY,
  opportunity_id INTEGER,
  stage_id INTEGER,           -- was FK -> mst_stage(stage_id) in admin's DB
  substage_id INTEGER,        -- was FK -> mst_sub_stage(sub_stage_id) in admin's DB
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  is_current BOOLEAN DEFAULT TRUE,
  comment TEXT
);

-- =====================================================================
-- FOREIGN KEY CONSTRAINTS (intra-service only)
-- =====================================================================

ALTER TABLE tbl_opportunity_tracker ADD CONSTRAINT fk_tbl_opportunity_tracker_opportunity_id FOREIGN KEY (opportunity_id) REFERENCES tbl_opportunity(opportunity_id);
ALTER TABLE tbl_opportunity_questions_answers ADD CONSTRAINT fk_tbl_opportunity_questions_answers_opportunity_id FOREIGN KEY (opportunity_id) REFERENCES tbl_opportunity(opportunity_id);
ALTER TABLE tbl_opportunity_engage_tracker ADD CONSTRAINT fk_tbl_opportunity_engage_tracker_opportunity_id FOREIGN KEY (opportunity_id) REFERENCES tbl_opportunity(opportunity_id);
