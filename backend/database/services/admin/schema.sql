-- DDL for the admin service's database.
-- Source: the live database (admin_db dump of 2026-09-21).
--
-- Admin-owned tables: master data + access control.
--   master data     mst_stage, mst_sub_stage, mst_estimation_phases, mst_rate,
--                   tbl_reason_codes, mst_proposal_section (+ their trackers)
--   access control  mst_menus, mst_permissions, mst_roles (+ trackers),
--                   tbl_menuwise_permission, tbl_role_menu_permission
--
-- "Access control" model:
--   tbl_menuwise_permission   which permissions may be granted on a menu
--   tbl_role_menu_permission  which of those a role actually holds
--   (replaces the old tbl_role_menu / tbl_role_permissions, now removed)
--
-- The development database `admin_db` also holds the user service's tables
-- (mst_user, auth_session). Those are defined in
-- database/services/user/schema.sql, not here.
--
-- Columns such as created_by / updated_by hold a mst_user.user_id but carry
-- no foreign key: the user tables belong to another service.

-- ---------------------------------------------------------------------
-- Pipeline master data
-- ---------------------------------------------------------------------

CREATE TABLE mst_stage (
  stage_id SERIAL PRIMARY KEY,
  stage_name VARCHAR(100),
  description TEXT,
  win_percentage NUMERIC(5,2),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_stage_tracker (
  stage_tracker_id SERIAL PRIMARY KEY,
  previous_stage_id INTEGER,
  stage_name VARCHAR(100),
  description TEXT,
  win_percentage NUMERIC(5,2),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_sub_stage (
  sub_stage_id SERIAL PRIMARY KEY,
  stage_id INTEGER,
  sub_stage_name VARCHAR(150),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_sub_stage_tracker (
  sub_stage_id_tracker SERIAL PRIMARY KEY,
  sub_stage_id INTEGER,
  stage_id INTEGER,
  sub_stage_name VARCHAR(150),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_estimation_phases (
  phase_id SERIAL PRIMARY KEY,
  phase_name VARCHAR(100),
  description VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tbl_estimation_phases_tracker (
  phase_tracker_id SERIAL PRIMARY KEY,
  phase_id INTEGER,
  phase_name VARCHAR(100),
  opportunity_id INTEGER,     -- an opportunity service id; no foreign key
  description VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE mst_rate (
  ratemaster_id SERIAL PRIMARY KEY,
  role_name VARCHAR(100),
  locaton VARCHAR(100),       -- (sic) column name as it exists in the database
  description VARCHAR(500),
  monthly_rate NUMERIC(15,2),
  currency_code VARCHAR(10),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE UNIQUE INDEX mst_rate_role_name_key ON mst_rate (role_name);

CREATE TABLE tbl_reason_codes (
  reason_code_id SERIAL PRIMARY KEY,
  reason_name VARCHAR(100),
  reason_category VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER
);

CREATE TABLE mst_proposal_section (
  proposal_section_id SERIAL PRIMARY KEY,
  section_name VARCHAR(255),
  section_description TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER
);

-- ---------------------------------------------------------------------
-- Access control: menus, permissions, roles
-- ---------------------------------------------------------------------

CREATE TABLE mst_menus (
  menu_id SERIAL PRIMARY KEY,
  menu_name VARCHAR(100) NOT NULL,
  menu_key VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  parent_id INTEGER,
  sort_order INTEGER NOT NULL,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER NOT NULL,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE mst_permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER NOT NULL,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- History of mst_permissions: one snapshot row per change, written in the
-- same transaction as the change (see permissions.repository.ts).
CREATE TABLE mst_permissions_tracker (
  tracker_id SERIAL PRIMARY KEY,
  permission_id INTEGER NOT NULL,
  permission_name VARCHAR(100) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE mst_roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  role_code VARCHAR(50),
  description VARCHAR(100),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE UNIQUE INDEX ux_mst_roles_role_name ON mst_roles (LOWER(role_name));
CREATE UNIQUE INDEX ux_mst_roles_role_code ON mst_roles (LOWER(role_code)) WHERE role_code IS NOT NULL;

-- History of mst_roles: one snapshot row per change (including a final
-- inactive snapshot when a role is deleted), written in the same transaction
-- as the change (see roles.repository.ts). No foreign key, so history
-- survives the role's deletion.
CREATE TABLE mst_roles_tracker (
  tracker_id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  role_code VARCHAR(50),
  description VARCHAR(100),
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Which permissions may be granted on a menu (managed in "Menu Permission
-- Mapping"; saved as a whole set per menu).
CREATE TABLE tbl_menuwise_permission (
  id SERIAL PRIMARY KEY,
  menu_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER NOT NULL,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE UNIQUE INDEX uq_menu_permission ON tbl_menuwise_permission (menu_id, permission_id);
CREATE INDEX idx_menu_permissions_menu_id ON tbl_menuwise_permission (menu_id);
CREATE INDEX idx_menu_permissions_permission_id ON tbl_menuwise_permission (permission_id);

-- What a role actually holds: one row per (role, menu, permission).
-- Revoking sets is_active = FALSE rather than deleting the row.
CREATE TABLE tbl_role_menu_permission (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL,
  menu_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER NOT NULL,
  updated_dt TIMESTAMP,
  updated_by INTEGER,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE UNIQUE INDEX uq_role_menu_permission ON tbl_role_menu_permission (role_id, menu_id, permission_id);
CREATE INDEX idx_rmp_role_id ON tbl_role_menu_permission (role_id);
CREATE INDEX idx_rmp_menu_id ON tbl_role_menu_permission (menu_id);

-- =====================================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================================

ALTER TABLE mst_sub_stage ADD CONSTRAINT fk_mst_sub_stage_stage_id FOREIGN KEY (stage_id) REFERENCES mst_stage(stage_id);
ALTER TABLE mst_sub_stage_tracker ADD CONSTRAINT fk_mst_sub_stage_tracker_stage_id FOREIGN KEY (stage_id) REFERENCES mst_stage(stage_id);
ALTER TABLE mst_sub_stage_tracker ADD CONSTRAINT fk_mst_sub_stage_tracker_sub_stage_id FOREIGN KEY (sub_stage_id) REFERENCES mst_sub_stage(sub_stage_id);
ALTER TABLE tbl_estimation_phases_tracker ADD CONSTRAINT fk_tbl_estimation_phases_tracker_phase_id FOREIGN KEY (phase_id) REFERENCES mst_estimation_phases(phase_id);

-- Deleting a menu, permission or role removes its mappings and grants.
ALTER TABLE tbl_menuwise_permission ADD CONSTRAINT fk_menu_permissions_menu FOREIGN KEY (menu_id) REFERENCES mst_menus(menu_id) ON DELETE CASCADE;
ALTER TABLE tbl_menuwise_permission ADD CONSTRAINT fk_menu_permissions_permission FOREIGN KEY (permission_id) REFERENCES mst_permissions(permission_id) ON DELETE CASCADE;
ALTER TABLE tbl_role_menu_permission ADD CONSTRAINT fk_rmp_menu FOREIGN KEY (menu_id) REFERENCES mst_menus(menu_id) ON DELETE CASCADE;
ALTER TABLE tbl_role_menu_permission ADD CONSTRAINT fk_rmp_permission FOREIGN KEY (permission_id) REFERENCES mst_permissions(permission_id) ON DELETE CASCADE;
ALTER TABLE tbl_role_menu_permission ADD CONSTRAINT fk_rmp_role FOREIGN KEY (role_id) REFERENCES mst_roles(role_id) ON DELETE CASCADE;
