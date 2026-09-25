import { useMemo, useState } from "react";
import { CornerDownRight, Pencil, Plus, Search } from "lucide-react";
import type { Menu } from "@xts/api-contracts";
import {
  Button,
  Card,
  CardContent,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMenuActionPermissions,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { MenuFormDialog } from "./MenuFormDialog";
import { resolveIcon } from "./menu.utils";
import { useMenuMutations } from "./useMenuMutations";
import { useMenus } from "./useMenus";

const COLUMNS = 6;

export function MenuMasterPage() {
  useSetPageTitle("Menu Master");
  const { menus, rows, loading, error } = useMenus();
  const { setMenuActive } = useMenuMutations();
  const { can } = useMenuActionPermissions("menu_master");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [search, setSearch] = useState("");

  const nameById = new Map(menus.map((m) => [m.menuId, m.menuName]));

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ menu }) => `${menu.menuName} ${menu.menuKey}`.toLowerCase().includes(q));
  }, [rows, search]);

  const openAdd = () => {
    setEditingMenu(null);
    setDialogOpen(true);
  };
  const openEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Configure the application's navigation menu entries and their hierarchy."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu name or key"
                aria-label="Search menus"
                className="pl-9"
              />
            </div>
            {can("add") && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add menu
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load menus" />}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="w-20">Order</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-20 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableLoadingRows columns={COLUMNS} />}
              {!loading && !error && rows.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No menus yet. Add the first one." />
              )}
              {!loading && rows.length > 0 && visibleRows.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No menus match your search." />
              )}
              {visibleRows.map(({ menu, depth }) => {
                const Icon = resolveIcon(menu.icon);
                return (
                  <TableRow key={menu.menuId} className={menu.isActive ? undefined : "text-muted-foreground"}>
                    <TableCell>
                      <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
                        {depth > 0 && <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />}
                        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                        <span className="font-medium">{menu.menuName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{menu.menuKey}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {menu.parentId === null ? "—" : nameById.get(menu.parentId) ?? `#${menu.parentId}`}
                    </TableCell>
                    <TableCell>{menu.sortOrder}</TableCell>
                    <TableCell>
                      <Switch
                        checked={menu.isActive}
                        disabled={!can("edit")}
                        aria-label={`${menu.isActive ? "Deactivate" : "Activate"} ${menu.menuName}`}
                        onCheckedChange={(checked) => void setMenuActive(menu.menuId, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {can("edit") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${menu.menuName}`}
                          onClick={() => openEdit(menu)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MenuFormDialog open={dialogOpen} onOpenChange={setDialogOpen} menu={editingMenu} allMenus={menus} />
    </div>
  );
}
