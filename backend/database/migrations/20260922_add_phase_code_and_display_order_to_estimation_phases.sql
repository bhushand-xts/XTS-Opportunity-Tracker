-- Adds the columns the Estimate Phase Master admin screen needs (Phase Code,
-- Display Order) to mst_estimation_phases and its history table
-- tbl_estimation_phases_tracker. Run against xts_admin.
--
-- Safe to run once against a database created from an older copy of
-- database/services/admin/schema.sql. A fresh database created from the
-- current schema.sql already has these columns.

ALTER TABLE mst_estimation_phases ADD COLUMN IF NOT EXISTS phase_code VARCHAR(50);
ALTER TABLE mst_estimation_phases ADD COLUMN IF NOT EXISTS display_order INTEGER;

ALTER TABLE tbl_estimation_phases_tracker ADD COLUMN IF NOT EXISTS phase_code VARCHAR(50);
ALTER TABLE tbl_estimation_phases_tracker ADD COLUMN IF NOT EXISTS display_order INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mst_estimation_phases_phase_name ON mst_estimation_phases (LOWER(phase_name));
CREATE UNIQUE INDEX IF NOT EXISTS ux_mst_estimation_phases_phase_code ON mst_estimation_phases (LOWER(phase_code)) WHERE phase_code IS NOT NULL;
