-- Adds the column the dynamic sidebar needs: which frontend route a menu
-- links to. Run against xts_admin.
--
-- Safe to run once against a database created from an older copy of
-- database/services/admin/schema.sql. A fresh database created from the
-- current schema.sql already has this column.

ALTER TABLE mst_menus ADD COLUMN IF NOT EXISTS route_path VARCHAR(255);
