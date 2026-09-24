export { cn } from "./lib/utils";

export * from "./components/ui/accordion";
export * from "./components/ui/alert-dialog";
export * from "./components/ui/alert";
export * from "./components/ui/aspect-ratio";
export * from "./components/ui/avatar";
export * from "./components/ui/badge";
export * from "./components/ui/breadcrumb";
export * from "./components/ui/button-group";
export * from "./components/ui/button";
export * from "./components/ui/calendar";
export * from "./components/ui/card";
export * from "./components/ui/carousel";
export * from "./components/ui/chart";
export * from "./components/ui/checkbox";
export * from "./components/ui/collapsible";
export * from "./components/ui/command";
export * from "./components/ui/context-menu";
export * from "./components/ui/dialog";
export * from "./components/ui/drawer";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/empty";
export * from "./components/ui/field";
export * from "./components/ui/form";
export * from "./components/ui/hover-card";
export * from "./components/ui/input-group";
export * from "./components/ui/input-otp";
export * from "./components/ui/input";
export * from "./components/ui/item";
export * from "./components/ui/kbd";
export * from "./components/ui/label";
export * from "./components/ui/menubar";
export * from "./components/ui/navigation-menu";
export * from "./components/ui/pagination";
export * from "./components/ui/popover";
export * from "./components/ui/progress";
export * from "./components/ui/radio-group";
export * from "./components/ui/resizable";
export * from "./components/ui/scroll-area";
export * from "./components/ui/select";
export * from "./components/ui/separator";
export * from "./components/ui/sheet";
export * from "./components/ui/sidebar";
export * from "./components/ui/skeleton";
export * from "./components/ui/slider";
export * from "./components/ui/sonner";
export * from "./components/ui/spinner";
export * from "./components/ui/switch";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/toast";
// "toaster.tsx" is the legacy Radix-toast-based Toaster; shadcn now recommends
// the sonner-based one below, which keeps the unqualified `Toaster` name.
export { Toaster as LegacyToaster } from "./components/ui/toaster";
export * from "./components/ui/toggle-group";
export * from "./components/ui/toggle";
export * from "./components/ui/tooltip";

export * from "./hooks/use-toast";
export * from "./hooks/use-mobile";

// Feature/composite components (not shadcn primitives) — ported from a
// reference build. AppShell/DashboardContent/etc. depend on the placeholder
// auth/store/mock-data modules below; swap those for real implementations
// before shipping.
export * from "./components/AppShell";
export * from "./components/AppShellFilterTabs";
export * from "./components/ClosureModal";
export * from "./components/DashboardContent";
export * from "./components/LogActivityModal";
export * from "./components/AuthGate";
export * from "./components/LoginGate";
export * from "./components/LoginView";
export * from "./components/NewOpportunityDialog";
export * from "./components/RegistrationPendingView";

export * from "./lib/auth";
export * from "./lib/store";
export * from "./lib/mock-data";
export * from "./lib/pageTitle";
export * from "./lib/menuIcons";
export * from "./lib/menuRoutes";
export * from "./lib/useSidebarMenus";
