-- Adds the Generic RFP Question Master tables. Run against xts_admin.
--
-- Safe to run once against a database created from an older copy of
-- database/services/admin/schema.sql. A fresh database created from the
-- current schema.sql already has these tables.

CREATE TABLE IF NOT EXISTS mst_rfp_questions (
  question_id SERIAL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  description VARCHAR(500),
  display_order INTEGER,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mst_rfp_questions_question ON mst_rfp_questions (LOWER(question));

CREATE TABLE IF NOT EXISTS mst_rfp_questions_tracker (
  tracker_id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL,
  question VARCHAR(500) NOT NULL,
  description VARCHAR(500),
  display_order INTEGER,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);
