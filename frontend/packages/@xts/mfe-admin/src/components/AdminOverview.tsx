import { Link } from "react-router-dom";
import { ArrowRight, Key, Link2, List, Share2, Shield, UserCog, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton, useAuth, useSetPageTitle } from "@xts/design-system";
import { useMenus } from "../features/menu-management/useMenus";
import { usePermissions } from "../features/permission-management/usePermissions";
import { useRoles } from "../features/role-management/useRoles";

interface Section {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  /** e.g. "4 of 6 active"; undefined while loading; null when the section has no summary */
  summary?: string | null;
}

function summarize(items: { isActive: boolean }[], loading: boolean): string | undefined {
  if (loading) return undefined;
  return `${items.filter((i) => i.isActive).length} of ${items.length} active`;
}

export function AdminOverview() {
  useSetPageTitle("Administration");
  const { profile, session } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const { menus, loading: menusLoading } = useMenus();
  const { permissions, loading: permissionsLoading } = usePermissions();

  const name = profile?.first_name || session?.email;

  const sections: Section[] = [
    {
      title: "Menu Master",
      description: "Navigation entries and their hierarchy.",
      to: "/admin/menu-management/menu-master",
      icon: List,
      summary: summarize(menus, menusLoading),
    },
    {
      title: "Permission Master",
      description: "Actions that can be granted, such as view or export.",
      to: "/admin/menu-management/permission-master",
      icon: Key,
      summary: summarize(permissions, permissionsLoading),
    },
    {
      title: "Menu Permission Mapping",
      description: "Which permissions can be granted on each menu.",
      to: "/admin/menu-management/menu-permission-mapping",
      icon: Link2,
      summary: null,
    },
    {
      title: "Role Master",
      description: "Functional roles that users are given.",
      to: "/admin/user-management/role-master",
      icon: Shield,
      summary: summarize(roles, rolesLoading),
    },
    {
      title: "Role Menu Permission Assignment",
      description: "What each role can do on each menu.",
      to: "/admin/user-management/role-menu-permission-assignment",
      icon: Share2,
      summary: null,
    },
    {
      title: "User Role Assignment",
      description: "Give each user their role.",
      to: "/admin/user-management/user-role-assignment",
      icon: UserCog,
      summary: null,
    },
  ];

  return (
    <div className="space-y-5 p-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Welcome{name ? `, ${name}` : ""}</h2>
        <p className="text-sm text-muted-foreground">Manage menus, permissions, roles and the access each role holds.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.to} to={section.to} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors group-hover:bg-accent/40">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <section.icon className="size-[18px]" />
                </span>
                <CardTitle className="flex-1 text-base">{section.title}</CardTitle>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm text-muted-foreground">{section.description}</p>
                {section.summary === undefined && <Skeleton className="h-3 w-24" />}
                {section.summary ? <p className="text-xs font-medium text-foreground">{section.summary}</p> : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
