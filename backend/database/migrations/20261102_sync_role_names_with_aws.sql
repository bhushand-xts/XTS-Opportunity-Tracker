-- Reconciles role_name/role_code for roles 23 and 24, which had drifted
-- between environments (AWS already used these values; local still had an
-- older naming). Run against admin_db. Idempotent — safe to re-run.
UPDATE mst_roles SET role_name = 'Approver', updated_dt = CURRENT_TIMESTAMP
  WHERE role_id = 23 AND role_name <> 'Approver';
UPDATE mst_roles SET role_name = 'Sales Executive', role_code = 'sales_executive', updated_dt = CURRENT_TIMESTAMP
  WHERE role_id = 24 AND (role_name <> 'Sales Executive' OR role_code <> 'sales_executive');
