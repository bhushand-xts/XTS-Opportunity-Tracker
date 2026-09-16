import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { Menu } from "@xts/api-contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSetPageTitle,
} from "@xts/design-system";
import { MenuFormDialog } from "./MenuFormDialog";
import { MENU_TYPE_LABEL } from "./menu.schema";
import { resolveIcon } from "./menu.utils";
import { useMenus } from "./useMenus";

export function MenuMasterPage() {
  useSetPageTitle("Menu Master");
  const { menus, loading, error } = useMenus();
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
        <p className="text-sm text-muted-foreground">Configure the application's navigation menu entries.</p>
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
                <TableHead>Menu Type</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead>Menu Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Loading menus…
                  </TableCell>
                </TableRow>
              )}
              {!loading && menus.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No menu entries yet.
                  </TableCell>
                </TableRow>
              )}
              {menus.map((menu) => {
                const Icon = resolveIcon(menu.icon);
                return (
                  <TableRow key={menu.id}>
                    <TableCell className="font-medium">{menu.menuName}</TableCell>
                    <TableCell>
                      <Badge variant={menu.menuType === "MAIN_MENU" ? "brand" : "secondary"}>
                        {MENU_TYPE_LABEL[menu.menuType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Icon ? <Icon className="size-4 text-muted-foreground" /> : (menu.icon ?? "—")}
                    </TableCell>
                    <TableCell>{menu.displayOrder}</TableCell>
                    <TableCell className="text-muted-foreground">{menu.menuKey}</TableCell>
                    <TableCell>
                      <Badge variant={menu.isActive ? "success" : "muted"}>
                        {menu.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${menu.menuName}`} onClick={() => openEdit(menu)}>
                        <Pencil className="size-4" />
                      </Button>
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
