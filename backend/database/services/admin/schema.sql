-- DDL for the `xts_admin` database only.
-- Source: schema.sql (Section 6, 24-table design), admin-owned tables
-- (master data + access control — matches the 11 admin entities:
-- stages, sub-stages, phases, rate-master, reason-codes,
-- proposal-sections, roles, permissions, menus, role-menu,
-- role-permissions).
--
-- Cross-service FK columns are kept as plain INTEGER (no DB-level FK,
-- since the referenced table now lives in a different service's
-- database) — referential integrity for these is enforced in the
-- application layer instead. Each dropped FK is noted inline.

CREATE TABLE mst_stage (
  stage_id SERIAL PRIMARY KEY,
  stage_name VARCHAR(100),
  description TEXT,
  win_percentage NUMERIC(5,2),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_stage_tracker (
  stage_tracker_id SERIAL PRIMARY KEY,
  previous_stage_id INTEGER,
  stage_name VARCHAR(100),
  description TEXT,
  win_percentage NUMERIC(5,2),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_sub_stage (
  sub_stage_id SERIAL PRIMARY KEY,
  stage_id INTEGER,
  sub_stage_name VARCHAR(150),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_sub_stage_tracker (
  sub_stage_id_tracker SERIAL PRIMARY KEY,
  sub_stage_id INTEGER,
  stage_id INTEGER,
  sub_stage_name VARCHAR(150),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_estimation_phases (
  phase_id SERIAL PRIMARY KEY,
  phase_name VARCHAR(100),
  description VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tbl_estimation_phases_tracker (
  phase_tracker_id SERIAL PRIMARY KEY,
  phase_id INTEGER,
  phase_name VARCHAR(100),
  opportunity_id INTEGER,     -- was FK -> tbl_opportunity(opportunity_id) in opportunity's DB
  description VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_rate (
  ratemaster_id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) UNIQUE,
  locaton VARCHAR(100),
  description VARCHAR(500),
  monthly_rate NUMERIC(15,2),
  currency_code VARCHAR(10),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tbl_reason_codes (
  reason_code_id SERIAL PRIMARY KEY,
  reason_name VARCHAR(100),
  reason_category VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER          -- was FK -> mst_user(user_id) in user's DB
);

CREATE TABLE mst_proposal_section (
  proposal_section_id SERIAL PRIMARY KEY,
  section_name VARCHAR(255),
  section_description TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,         -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER          -- was FK -> mst_user(user_id) in user's DB
);

CREATE TABLE mst_permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER NOT NULL, -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE mst_menus (
  menu_id SERIAL PRIMARY KEY,
  menu_name VARCHAR(100) NOT NULL,
  menu_key VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  parent_id INTEGER,
  sort_order INTEGER NOT NULL,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER NOT NULL, -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE mst_roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  role_code VARCHAR(50),
  description VARCHAR(100),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE UNIQUE INDEX ux_mst_roles_role_name ON mst_roles (LOWER(role_name));
CREATE UNIQUE INDEX ux_mst_roles_role_code ON mst_roles (LOWER(role_code)) WHERE role_code IS NOT NULL;

CREATE TABLE tbl_role_menu (
  role_menu_id SERIAL PRIMARY KEY,
  role_id INTEGER,
  menu_id INTEGER,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tbl_role_permissions (
  role_permission_id SERIAL PRIMARY KEY,
  role_id INTEGER,
  permission_id INTEGER,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  updated_dt TIMESTAMP,
  updated_by INTEGER,          -- was FK -> mst_user(user_id) in user's DB
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================================
-- FOREIGN KEY CONSTRAINTS (intra-service only)
-- =====================================================================

ALTER TABLE mst_sub_stage ADD CONSTRAINT fk_mst_sub_stage_stage_id FOREIGN KEY (stage_id) REFERENCES mst_stage(stage_id);
ALTER TABLE mst_sub_stage_tracker ADD CONSTRAINT fk_mst_sub_stage_tracker_sub_stage_id FOREIGN KEY (sub_stage_id) REFERENCES mst_sub_stage(sub_stage_id);
ALTER TABLE mst_sub_stage_tracker ADD CONSTRAINT fk_mst_sub_stage_tracker_stage_id FOREIGN KEY (stage_id) REFERENCES mst_stage(stage_id);
ALTER TABLE tbl_estimation_phases_tracker ADD CONSTRAINT fk_tbl_estimation_phases_tracker_phase_id FOREIGN KEY (phase_id) REFERENCES mst_estimation_phases(phase_id);
ALTER TABLE tbl_role_menu ADD CONSTRAINT fk_tbl_role_menu_role_id FOREIGN KEY (role_id) REFERENCES mst_roles(role_id);
ALTER TABLE tbl_role_menu ADD CONSTRAINT fk_tbl_role_menu_menu_id FOREIGN KEY (menu_id) REFERENCES mst_menus(menu_id);
ALTER TABLE tbl_role_permissions ADD CONSTRAINT fk_tbl_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES mst_roles(role_id);
ALTER TABLE tbl_role_permissions ADD CONSTRAINT fk_tbl_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES mst_permissions(permission_id);
