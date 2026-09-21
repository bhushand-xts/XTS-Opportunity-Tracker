import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Key,
  LayoutDashboard,
  Link2,
  List,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
  Table2,
  UserCog,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLE_LABEL, useAuth, type AppPermission } from "@/lib/auth";
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
];

function NotificationsPanel() {
  const { notifications, markAllRead } = useStore();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
          )}
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

function AdminNavGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActiveItem = group.items.some((item) => pathname === item.to);
  return (
    <Collapsible defaultOpen={hasActiveItem} className="group/nav-group">
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton className="cursor-pointer">
            <group.icon className="size-4" />
            <span className="flex-1">{group.label}</span>
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
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-rail-active/15 font-medium text-rail-active"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
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

function AppSidebar({ can, pathname }: { can: (permission: AppPermission) => boolean; pathname: string }) {
  const onAdmin = pathname.startsWith("/admin");
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
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to text-[13px] font-bold text-brand-foreground"
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
              className="data-[active=true]:bg-rail-active/15 data-[active=true]:text-rail-active"
            >
              <Link to="/dashboard">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {can("admin") && (
            <Collapsible defaultOpen={onAdmin} className="group/admin">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={onAdmin}
                    tooltip="Administration"
                    className="data-[active=true]:bg-rail-active/15 data-[active=true]:text-rail-active"
                  >
                    <Settings />
                    <span>Administration</span>
                    <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/admin:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {ADMIN_NAV.map((group) => (
                      <AdminNavGroup key={group.label} group={group} pathname={pathname} />
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, session, profile, roles, signOut, can } = useAuth();
  const { currentUser, search, setSearch } = useStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const pageTitle = usePageTitle();

  // roles is always [] against the real backend today (no role-name lookup
  // exposed via GraphQL yet — only an unresolved role_id) — this label
  // describes "no role name available," not an account-approval state.
  const displayRole = roles[0] ? ROLE_LABEL[roles[0]] : "No role assigned";
  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : currentUser.name;
  const initials = profile ? `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase() : currentUser.initials;

  if (!loading && !session) {
    void navigate("/");
    return null;
  }
  if (!loading && session && !profile) {
    void navigate("/register");
    return null;
  }
  if (!loading && profile && profile.status !== "approved") {
    void navigate("/registration-status");
    return null;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <SidebarProvider>
        <AppSidebar can={can} pathname={location.pathname} />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-card px-5">
            <h1 className="shrink-0 text-[15px] font-semibold tracking-tight">{pageTitle}</h1>
            <div className="relative mx-auto w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search opportunities, customers, contacts"
                className="h-9 rounded-full pl-9 text-[13px]"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
