import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import {
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
import { useMenus, type MenuListItem } from "./useMenus";

export function MenuMasterPage() {
  useSetPageTitle("Menu Master");
  const { menus, loading, error } = useMenus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuListItem | null>(null);

  const openAdd = () => {
    setEditingMenu(null);
    setDialogOpen(true);
  };
  const openEdit = (menu: MenuListItem) => {
    setEditingMenu(menu);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Configure the application&apos;s navigation menu entries.</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Adding and editing menus isn&apos;t available yet — the backend hasn&apos;t implemented it.
          </p>
          <Button onClick={openAdd} disabled>
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          <p className="mb-4 text-xs text-muted-foreground">
            The backend currently only exposes menu IDs — menu names, types, icons, and other details aren&apos;t
            available yet.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu ID</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                    Loading menus…
                  </TableCell>
                </TableRow>
              )}
              {!loading && menus.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                    No menu entries yet.
                  </TableCell>
                </TableRow>
              )}
              {menus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">{menu.id}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit menu ${menu.id}`}
                      disabled
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

      <MenuFormDialog open={dialogOpen} onOpenChange={setDialogOpen} menu={editingMenu} />
    </div>
  );
}
