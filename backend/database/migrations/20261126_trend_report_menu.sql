-- Reports > Trend Report: monthly opportunity creation counts.
INSERT INTO mst_menus (menu_name, menu_key, icon, parent_id, sort_order, route_path, created_dt, created_by, is_active)
SELECT 'Trend Report', 'trend_report', 'BarChart3', r.menu_id, 9,
       '/reports/trend_report', CURRENT_TIMESTAMP, 1, TRUE
FROM mst_menus r
WHERE r.menu_key = 'reports'
  AND NOT EXISTS (SELECT 1 FROM mst_menus WHERE menu_key = 'trend_report');

INSERT INTO tbl_menuwise_permission (menu_id, permission_id, created_dt, created_by, is_active)
SELECT m.menu_id, p.permission_id, CURRENT_TIMESTAMP, 1, TRUE
FROM mst_menus m
JOIN mst_permissions p ON p.permission_key = 'view'
WHERE m.menu_key = 'trend_report'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_menuwise_permission mp
    WHERE mp.menu_id = m.menu_id AND mp.permission_id = p.permission_id
  );

INSERT INTO tbl_role_menu_permission (role_id, menu_id, permission_id, created_dt, created_by, is_active)
SELECT ro.role_id, m.menu_id, p.permission_id, CURRENT_TIMESTAMP, 1, TRUE
FROM mst_roles ro
JOIN mst_menus m ON m.menu_key = 'trend_report'
JOIN mst_permissions p ON p.permission_key = 'view'
WHERE (
    ro.role_name IN ('Super Admin', 'Admin')
    OR EXISTS (
      SELECT 1 FROM tbl_role_menu_permission scr
      JOIN mst_menus sm ON sm.menu_id = scr.menu_id AND sm.menu_key = 'sales_conversion_report'
      WHERE scr.role_id = ro.role_id AND scr.permission_id = p.permission_id AND scr.is_active = TRUE
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM tbl_role_menu_permission rmp
    WHERE rmp.role_id = ro.role_id AND rmp.menu_id = m.menu_id AND rmp.permission_id = p.permission_id
  );
