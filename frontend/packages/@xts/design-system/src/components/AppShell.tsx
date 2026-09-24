import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/pageTitle";
import { useSidebarMenus, type MenuNode } from "@/lib/useSidebarMenus";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function NotificationsPanel() {
  const { notifications, markAllRead } = useStore();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">Notifications</SheetTitle>
        </SheetHeader>
        <div className="flex items-center justify-between px-5 py-2 text-xs text-muted-foreground">
          <span>{unread} unread</span>
          <Button variant="link" className="h-auto p-0 text-xs font-medium" onClick={markAllRead}>
            Mark all as read
          </Button>
        </div>
        <ul className="divide-y">
          {notifications.map((n) => (
            <li key={n.id} className="flex gap-3 px-5 py-3">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.read ? "bg-border" : "bg-primary",
                )}
              />
              <div>
                <p className="text-[13px] leading-snug text-foreground">{n.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.date}</p>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

/** Vertically-centered visible toggle, in addition to the Sidebar's own
 * built-in SidebarRail edge-drag affordance — shadcn doesn't ship a visible
 * mid-sidebar trigger out of the box, so this is a small addition on top of
 * the real useSidebar() context, not a replacement for it. */
function MidSidebarToggle() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Button
      variant="outline"
      size="icon"
      className="absolute -right-3 top-1/2 z-20 size-6 -translate-y-1/2 rounded-full border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={toggleSidebar}
    >
      {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
    </Button>
  );
}

function isNodeActive(node: MenuNode, pathname: string): boolean {
  if (node.path && (pathname === node.path || pathname.startsWith(`${node.path}/`))) return true;
  return node.children.some((child) => isNodeActive(child, pathname));
}

/** A leaf's contents (icon + label) — shared between the linked and
 * not-yet-wired-up (no route registered) rendering below. */
function NavNodeLabel({ node }: { node: MenuNode }) {
  const Icon = node.icon;
  return (
    <>
      {Icon && <Icon />}
      <span>{node.menuName}</span>
    </>
  );
}

function TopLevelNavItem({ node, pathname }: { node: MenuNode; pathname: string }) {
  const active = isNodeActive(node, pathname);
  const hasChildren = node.children.length > 0;
  // Open on its own when you land on one of its descendants (from a link, a
  // redirect or a reload), but stay under your control afterwards.
  const [open, setOpen] = useState(active);
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild={node.path !== null}
          isActive={active}
          tooltip={node.menuName}
          aria-disabled={node.path === null}
          className="data-[active=true]:bg-rail-active/15 data-[active=true]:text-rail-active"
        >
          {node.path ? (
            <Link to={node.path}>
              <NavNodeLabel node={node} />
            </Link>
          ) : (
            <NavNodeLabel node={node} />
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/nav">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={active}
            tooltip={node.menuName}
            className="data-[active=true]:bg-rail-active/15 data-[active=true]:text-rail-active"
          >
            <NavNodeLabel node={node} />
            <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/nav:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) => (
              <SubLevelNavItem key={child.menuId} node={child} pathname={pathname} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** Same shape as TopLevelNavItem, one level down (and recursively below
 * that) — shadcn's Sidebar primitives only style one sub level by name
 * (SidebarMenuSub), but nesting it again works fine for a third-plus level,
 * reading as another indent step via its own left border. */
function SubLevelNavItem({ node, pathname }: { node: MenuNode; pathname: string }) {
  const active = isNodeActive(node, pathname);
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(active);
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild={node.path !== null} isActive={active} aria-disabled={node.path === null}>
          {node.path ? (
            <Link to={node.path}>
              <NavNodeLabel node={node} />
            </Link>
          ) : (
            <NavNodeLabel node={node} />
          )}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/nav-sub">
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton isActive={active} className="cursor-pointer">
            <NavNodeLabel node={node} />
            <ChevronDown className="ml-auto size-3.5 shrink-0 transition-transform group-data-[state=open]/nav-sub:rotate-180" />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) => (
              <SubLevelNavItem key={child.menuId} node={child} pathname={pathname} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}

/** Skeleton rows shown in place of the nav while the menu/access queries are
 * still loading (nothing cached yet) — shadcn's own SidebarMenuSkeleton,
 * not a bespoke loading treatment. */
function SidebarNavSkeleton() {
  return (
    <SidebarMenu className="px-2 pt-2">
      {[0, 1, 2, 3].map((i) => (
        <SidebarMenuItem key={i}>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function AppSidebar({ tree, loading, pathname }: { tree: MenuNode[]; loading: boolean; pathname: string }) {
  return (
    <Sidebar collapsible="icon">
      {/* No positioning wrapper here on purpose — absolute resolves against
          Sidebar's own outer `fixed inset-y-0` container, which is what
          spans the sidebar's full height. A wrapper div would have zero
          height (its only child is absolutely positioned) and become the
          nearest positioned ancestor instead, pinning this near the top. */}
      <MidSidebarToggle />
      {/* Same h-14 height as the main header below, with the same border-b —
          the two headers sit at the same horizontal line and meet exactly
          at the sidebar's edge, reading as one continuous top bar. */}
      <SidebarHeader className="flex h-14 flex-row items-center gap-2 border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link
          to="/dashboard"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-from text-[13px] font-bold text-brand-foreground"
        >
          XT
        </Link>
        <span className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          XTS Opportunity Tracker
        </span>
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <SidebarNavSkeleton />
        ) : (
          <SidebarMenu className="px-2 pt-2">
            {tree.map((node) => (
              <TopLevelNavItem key={node.menuId} node={node} pathname={pathname} />
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

/** Shown in the main content area — not a full-screen replacement, the
 * header/sidebar shell stays so Sign out is still reachable — when the
 * signed-in account has no role, or a role with nothing granted yet.
 * Distinguishes the two: "no role" needs an admin to assign one at all,
 * "role with nothing granted" needs an admin to configure that role's
 * menu access — different fixes, so different messages. */
function NoAccessMessage({ roleId, roleName }: { roleId: number | null; roleName: string | null }) {
  const hasRole = roleId !== null;
  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleHelp />
        </EmptyMedia>
        <EmptyTitle>{hasRole ? "No Menu Access" : "No Role Assigned"}</EmptyTitle>
        <EmptyDescription>
          {hasRole ? (
            <>
              Your assigned role{roleName ? ` (${roleName})` : ""} doesn&apos;t have access to any menus yet. Please
              contact your administrator to configure your menu access.
            </>
          ) : (
            "Your account hasn't been assigned a role yet. Please contact your administrator to have a role assigned."
          )}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AppShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Who may see the app at all is decided by <AuthGate> in front of this component.
  const { profile, roleId, roleName, signOut } = useAuth();
  const { currentUser } = useStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const pageTitle = usePageTitle();
  const { tree, loading: menusLoading } = useSidebarMenus();

  const displayRole = roleName ?? "No role assigned";
  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : currentUser.name;
  const initials = profile ? `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase() : currentUser.initials;

  return (
    <TooltipProvider delayDuration={120}>
      <SidebarProvider>
        <AppSidebar tree={tree} loading={menusLoading} pathname={location.pathname} />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-card px-5">
            <h1 className="shrink-0 text-[15px] font-semibold tracking-tight">{pageTitle}</h1>
            <div className="flex shrink-0 items-center gap-1 ml-auto">
              {actions}
              {/* Points at the dashboard until the Opportunity MFE has a real route to land on */}
              <Button asChild size="icon" className="size-9 rounded-full" aria-label="New opportunity">
                <Link to="/dashboard">
                  <Plus className="size-[18px]" />
                </Link>
              </Button>
              <NotificationsPanel />
              <Button variant="ghost" size="icon" aria-label="Help" onClick={() => setHelpOpen((v) => !v)}>
                <CircleHelp className="size-[18px]" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-left leading-tight">
                      <span className="block text-[12px] font-medium">{displayName}</span>
                      <span className="block text-[11px] text-muted-foreground">{displayRole}</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Signed in account</DropdownMenuLabel>
                  <DropdownMenuItem disabled className="text-[13px]">{displayRole}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[13px]"
                    onClick={() => {
                      void signOut().then(() => navigate("/", { replace: true }));
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {helpOpen && (
            <div className="border-b bg-accent px-5 py-2 text-[13px] text-accent-foreground">
              Tip: use the search bar above to jump straight to an opportunity, customer, or contact.
            </div>
          )}
          <main className="min-w-0 flex-1">
            {menusLoading ? (
              <div className="flex items-center justify-center p-10">
                <Spinner className="size-5" />
              </div>
            ) : tree.length === 0 ? (
              <NoAccessMessage roleId={roleId} roleName={roleName} />
            ) : (
              children
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
