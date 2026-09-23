import { useQuery } from "@apollo/client";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileQuestion,
  FlaskConical,
  Key,
  Layers,
  LayoutDashboard,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Menu as MenuLucideIcon,
  Plus,
  Settings,
  Share2,
  Shield,
  Table2,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, type AppPermission } from "@/lib/auth";
import { GET_NAV_MENUS } from "@/lib/nav.queries";
import { usePageTitle } from "@/lib/pageTitle";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavLeaf {
  label: string;
  to: string;
  icon: typeof Table2;
}
interface NavGroup {
  label: string;
  icon: typeof List;
  items: NavLeaf[];
}

// Administration's own sub-navigation (Menu Management, User Management, ...)
// is defined here rather than in the Admin MFE — this sidebar is the single
// shared nav surface for the whole app now, so admin's structure has to live
// wherever that nav lives. The Admin MFE still owns the actual page content
// for each of these routes, just not the links to reach them.
const ADMIN_NAV: NavGroup[] = [
  {
    label: "Menu Management",
    icon: List,
    items: [
      { label: "Menu Master", to: "/admin/menu-management/menu-master", icon: Table2 },
      { label: "Permission Master", to: "/admin/menu-management/permission-master", icon: Key },
      { label: "Menu Permission Mapping", to: "/admin/menu-management/menu-permission-mapping", icon: Link2 },
    ],
  },
  {
    label: "User Management",
    icon: Users,
    items: [
      { label: "Role Master", to: "/admin/user-management/role-master", icon: Shield },
      { label: "Role Menu Permission Assignment", to: "/admin/user-management/role-menu-permission-assignment", icon: Share2 },
      { label: "User Role Assignment", to: "/admin/user-management/user-role-assignment", icon: UserCog },
    ],
  },
  {
    label: "Estimate Management",
    icon: ClipboardList,
    items: [
      { label: "Estimate Phase Master", to: "/admin/estimate-management/estimate-phase-master", icon: ListOrdered },
    ],
  },
];

// ---------------------------------------------------------------------
// Dynamic Nav (Preview) — built live from mst_menus (via the Menu Master
// admin screen) instead of the hand-written ADMIN_NAV above. Runs alongside
// the static nav so the two can be compared menu-by-menu before ADMIN_NAV is
// deleted and this becomes the only nav. Visible only behind the ?devNav=1
// flag (see useDevNavPreview) — regular users never see it.
// ---------------------------------------------------------------------

interface NavMenuNode {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  routePath: string | null;
  isActive: boolean;
  children?: NavMenuNode[];
}

/** Curated lookup for mst_menus.icon, mirroring mfe-admin's Menu Master (its
 * own copy, in ICON_OPTIONS there) — design-system can't import from an MFE.
 * Includes every icon the real admin menus use, so the preview matches the
 * static sidebar's icons exactly. */
const DYNAMIC_NAV_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Settings,
  ShieldCheck: Shield,
  Shield,
  Users,
  ListChecks,
  Layers,
  Menu: MenuLucideIcon,
  Table2,
  Key,
  Link2,
  Share2,
  UserCog,
  ClipboardList,
  ListOrdered,
  FileQuestion,
};
function resolveDynamicNavIcon(name: string | null): LucideIcon {
  return (name && DYNAMIC_NAV_ICONS[name]) || List;
}

/** Keeps a menu (and its children, recursively) only if it's active and
 * either directly accessible (has a route and the role holds a permission on
 * it) or has at least one accessible descendant — so a group isn't hidden
 * just because it has no permission of its own. */
function filterAccessibleTree(menu: NavMenuNode, hasMenuAccess: (menuKey: string) => boolean): NavMenuNode | null {
  if (!menu.isActive) return null;
  const children = (menu.children ?? [])
    .map((child) => filterAccessibleTree(child, hasMenuAccess))
    .filter((child): child is NavMenuNode => child !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const selfAccessible = Boolean(menu.routePath) && hasMenuAccess(menu.menuKey);
  if (!selfAccessible && children.length === 0) return null;
  return { ...menu, children };
}

/** On, only for this browser, once `?devNav=1` has been visited — `?devNav=0`
 * turns it back off. Lets you flip it on while testing without a code change,
 * while regular users (and you, by default) never see the preview section. */
function useDevNavPreview(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("devNav");
    if (flag === "1") window.localStorage.setItem("devNavPreview", "1");
    if (flag === "0") window.localStorage.removeItem("devNavPreview");
    setOn(window.localStorage.getItem("devNavPreview") === "1");
  }, []);
  return on;
}

/** One node of the dynamic tree: a link if it has no children, otherwise an
 * always-expanded group — kept simple (no accordion) since the point here is
 * to see everything at once for comparison against the static nav. Nesting is
 * shown by the indented `<ul>` around each level's children, same as
 * AdminNavGroup above. */
function DynamicNavNode({ menu, pathname }: { menu: NavMenuNode; pathname: string }) {
  const Icon = resolveDynamicNavIcon(menu.icon);
  const children = menu.children ?? [];
  const hasChildren = children.length > 0;
  const active = !hasChildren && menu.routePath !== null && pathname === menu.routePath;

  const row = hasChildren ? (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-sidebar-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{menu.menuName}</span>
    </div>
  ) : (
    <Link
      to={menu.routePath ?? "#"}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
        active ? "bg-sidebar-accent font-medium text-rail-active" : "text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{menu.menuName}</span>
    </Link>
  );

  return (
    <li>
      {row}
      {hasChildren && (
        <ul className="ml-3.5 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">
          {children.map((child) => (
            <DynamicNavNode key={child.menuId} menu={child} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}

function DynamicNavPreview({
  pathname,
  hasMenuAccess,
}: {
  pathname: string;
  hasMenuAccess: (menuKey: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery<{ menus: NavMenuNode[] }>(GET_NAV_MENUS, { fetchPolicy: "cache-and-network" });

  const tree = (data?.menus ?? [])
    .map((menu) => filterAccessibleTree(menu, hasMenuAccess))
    .filter((menu): menu is NavMenuNode => menu !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/dynnav mt-2 border-t border-sidebar-border pt-2">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Dynamic Nav (Preview)">
            <FlaskConical />
            <span>Dynamic Nav (Preview)</span>
            <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/dynnav:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-2 mt-1 flex flex-col gap-0.5 px-2">
            {tree.length === 0 && (
              <li className="px-2 py-1.5 text-[13px] text-sidebar-foreground/60">
                Nothing to show — no menu has both a Route Path and a permission granted to this role yet.
              </li>
            )}
            {tree.map((menu) => (
              <DynamicNavNode key={menu.menuId} menu={menu} pathname={pathname} />
            ))}
          </ul>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

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

function AdminNavGroup({
  group,
  pathname,
  open,
  onOpenChange,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="group/nav-group">
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton className="h-auto min-h-7 cursor-pointer py-1.5 text-[13px] font-medium tracking-tight">
            <group.icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{group.label}</span>
            <ChevronDown className="size-3.5 shrink-0 transition-transform group-data-[state=open]/nav-group:rotate-180" />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-3.5 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">
            {group.items.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-rail-active"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}

function AppSidebar({
  can,
  hasMenuAccess,
  pathname,
}: {
  can: (permission: AppPermission) => boolean;
  hasMenuAccess: (menuKey: string) => boolean;
  pathname: string;
}) {
  const onAdmin = pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(onAdmin);
  useEffect(() => {
    if (onAdmin) setAdminOpen(true);
  }, [onAdmin]);
  const showDynamicPreview = useDevNavPreview();

  // Accordion: at most one Administration sub-group open at a time. Landing
  // on one of its pages switches to that group and closes the others; opening
  // a group by hand also closes whichever one was open.
  const activeGroupLabel = ADMIN_NAV.find((group) => group.items.some((item) => pathname === item.to))?.label ?? null;
  const [openGroupLabel, setOpenGroupLabel] = useState<string | null>(activeGroupLabel);
  useEffect(() => {
    if (activeGroupLabel) setOpenGroupLabel(activeGroupLabel);
  }, [activeGroupLabel]);

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
        <SidebarMenu className="px-2 pt-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/dashboard")}
              tooltip="Dashboard"
              className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary"
            >
              <Link to="/dashboard">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {can("admin") && (
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="group/admin">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={onAdmin}
                    tooltip="Administration"
                    className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary"
                  >
                    <Settings />
                    <span>Administration</span>
                    <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/admin:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {ADMIN_NAV.map((group) => (
                      <AdminNavGroup
                        key={group.label}
                        group={group}
                        pathname={pathname}
                        open={openGroupLabel === group.label}
                        onOpenChange={(open) => setOpenGroupLabel(open ? group.label : null)}
                      />
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {can("admin") && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/admin/rfp-management")}
                tooltip="Generic RFP Question Master"
                className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary"
              >
                <Link to="/admin/rfp-management/generic-rfp-question-master">
                  <FileQuestion />
                  <span>Generic RFP Question Master</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {can("admin") && showDynamicPreview && <DynamicNavPreview pathname={pathname} hasMenuAccess={hasMenuAccess} />}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Who may see the app at all is decided by <AuthGate> in front of this component.
  const { profile, roleName, signOut, can, hasMenuAccess } = useAuth();
  const { currentUser } = useStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const pageTitle = usePageTitle();

  const displayRole = roleName ?? "No role assigned";
  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : currentUser.name;
  const initials = profile ? `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase() : currentUser.initials;

  return (
    <TooltipProvider delayDuration={120}>
      <SidebarProvider>
        <AppSidebar can={can} hasMenuAccess={hasMenuAccess} pathname={location.pathname} />
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
          <main className="min-w-0 flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
