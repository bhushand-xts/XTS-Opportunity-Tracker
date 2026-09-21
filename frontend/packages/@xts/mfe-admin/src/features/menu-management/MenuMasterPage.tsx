import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSetPageTitle,
} from "@xts/design-system";
import { MenuFormDialog } from "./MenuFormDialog";
import { useMenuMutations } from "./useMenuMutations";
import { useMenus, type Menu } from "./useMenus";

export function MenuMasterPage() {
  useSetPageTitle("Menu Master");
  const { menus, loading, error } = useMenus();
  const { toggleMenuStatus, saving } = useMenuMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Configure the application&apos;s navigation menu entries.</p>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Name</TableHead>
                <TableHead>Menu Key</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Loading menus…
                  </TableCell>
                </TableRow>
              )}
              {!loading && menus.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No menu entries yet.
                  </TableCell>
                </TableRow>
              )}
              {menus.map((menu) => (
                <TableRow key={menu.menuId}>
                  <TableCell className="font-medium">{menu.menuName}</TableCell>
                  <TableCell className="text-muted-foreground">{menu.menuKey}</TableCell>
                  <TableCell className="text-muted-foreground">{menu.icon ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{menu.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={menu.isActive}
                        disabled={saving}
                        aria-label={`Toggle ${menu.menuName} status`}
                        onCheckedChange={(checked) => toggleMenuStatus(menu.menuId, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {menu.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${menu.menuName}`}
                      onClick={() => openEdit(menu)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MenuFormDialog open={dialogOpen} onOpenChange={setDialogOpen} menu={editingMenu} allMenus={menus} />
    </div>
  );
}
