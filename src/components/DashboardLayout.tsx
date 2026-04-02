import { useState } from "react";
import { Outlet, NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  MessageSquare, BookOpen, ClipboardCheck, FileText, BarChart3, Users,
  Menu, X, LogOut, Settings, AlertTriangle, FileSignature, ScrollText,
  ClipboardList, Truck, MessageSquareWarning, CalendarDays, Inbox, Package,
  Contact, Kanban, ListTodo, MapPin, Route, ShoppingBag, Receipt, HardHat,
  ShieldCheck, ChevronDown, Bot, Briefcase, MapPinned, UserCog,
} from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import NotificationBell from "@/components/NotificationBell";

type NavItem = {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  minRole?: "manager" | "owner";
  ownerOnly?: boolean;
};

type NavGroup = {
  label: string;
  icon: any;
  items: NavItem[];
  collapsible?: boolean;
};

const getNavGroups = (basePath: string): NavGroup[] => [
  {
    label: "Overview",
    icon: BarChart3,
    collapsible: false,
    items: [
      { to: basePath, icon: BarChart3, label: "Dashboard", end: true },
    ],
  },
  {
    label: "AI Tools",
    icon: Bot,
    items: [
      { to: `${basePath}/chat`, icon: MessageSquare, label: "AI Assistant" },
      { to: `${basePath}/knowledge`, icon: BookOpen, label: "Knowledge Base" },
    ],
  },
  {
    label: "Operations",
    icon: CalendarDays,
    items: [
      { to: `${basePath}/scheduling`, icon: CalendarDays, label: "Scheduling" },
      { to: `${basePath}/checklists`, icon: ClipboardCheck, label: "Checklists" },
      { to: `${basePath}/incident-report`, icon: AlertTriangle, label: "Incident Report" },
      { to: `${basePath}/bookings`, icon: Inbox, label: "Bookings" },
      { to: `${basePath}/deliveries`, icon: MapPin, label: "Delivery Schedule" },
      { to: `${basePath}/routes`, icon: Route, label: "Route Planning" },
    ],
  },
  {
    label: "Team & HR",
    icon: UserCog,
    items: [
      { to: `${basePath}/crew`, icon: Users, label: "Crew", minRole: "manager" },
      { to: `${basePath}/team`, icon: ShieldCheck, label: "Team Management", minRole: "manager" },
      { to: `${basePath}/employees`, icon: HardHat, label: "Employees", minRole: "manager" },
      { to: `${basePath}/drivers`, icon: Truck, label: "Driver Management", minRole: "manager" },
      { to: `${basePath}/interview-guide`, icon: ClipboardList, label: "Interview Guides", minRole: "manager" },
      { to: `${basePath}/conversations`, icon: MessageSquareWarning, label: "Difficult Conversations", minRole: "manager" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    items: [
      { to: `${basePath}/equipment`, icon: Package, label: "Equipment", minRole: "manager" },
      { to: `${basePath}/products`, icon: ShoppingBag, label: "Product Catalog", minRole: "manager" },
    ],
  },
  {
    label: "Safety & Compliance",
    icon: ShieldCheck,
    items: [
      { to: `${basePath}/compliance`, icon: ShieldCheck, label: "Compliance", minRole: "manager" },
      { to: `${basePath}/sops`, icon: ScrollText, label: "SOPs & Policies", minRole: "manager" },
      { to: `${basePath}/contracts`, icon: FileText, label: "Contracts", minRole: "manager" },
      { to: `${basePath}/waiver`, icon: FileSignature, label: "Liability Waiver", minRole: "manager" },
    ],
  },
  {
    label: "CRM",
    icon: Briefcase,
    items: [
      { to: `${basePath}/crm/leads`, icon: Contact, label: "Leads" },
      { to: `${basePath}/crm/pipeline`, icon: Kanban, label: "Pipeline" },
      { to: `${basePath}/crm/tasks`, icon: ListTodo, label: "Tasks" },
      { to: `${basePath}/crm/quotes`, icon: Receipt, label: "Quotes" },
    ],
  },
  {
    label: "Admin",
    icon: Settings,
    items: [
      { to: `${basePath}/settings`, icon: Settings, label: "Settings", ownerOnly: true },
    ],
  },
];

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [crewMode, setCrewMode] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { orgName, orgLogo } = useOrgSettings();
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const basePath = `/app/${slug}`;
  const navGroups = getNavGroups(basePath);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isItemVisible = (item: NavItem) => {
    if (item.ownerOnly) return role === "owner";
    if (item.minRole === "manager") return role === "owner" || role === "manager";
    return true;
  };

  const toggleGroup = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isGroupActive = (group: NavGroup) =>
    group.items.some(i => {
      if (i.end) return location.pathname === i.to;
      return location.pathname.startsWith(i.to);
    });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transform transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo / Company */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            {role === "owner" ? (
              <button
                onClick={() => { setSidebarOpen(false); navigate(`${basePath}/settings`); }}
                className="flex items-center gap-2 group min-w-0"
                title="Edit company branding"
              >
                {orgLogo ? (
                  <img src={orgLogo} alt="Company logo" className="w-7 h-7 rounded object-contain flex-shrink-0" />
                ) : (
                  <ShieldLogo size={24} />
                )}
                <span className="font-display font-bold text-lg text-sidebar-accent-foreground truncate">
                  {orgName || "SIOTO"}
                </span>
                <Settings size={14} className="text-sidebar-foreground/30 group-hover:text-sidebar-foreground/70 transition-colors flex-shrink-0" />
              </button>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                {orgLogo ? (
                  <img src={orgLogo} alt="Company logo" className="w-7 h-7 rounded object-contain flex-shrink-0" />
                ) : (
                  <ShieldLogo size={24} />
                )}
                <span className="font-display font-bold text-lg text-sidebar-accent-foreground truncate">
                  {orgName || "SIOTO"}
                </span>
              </div>
            )}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground">
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            {navGroups.map(group => {
              const visibleItems = group.items.filter(isItemVisible);
              if (visibleItems.length === 0) return null;

              const isNonCollapsible = group.collapsible === false;
              const groupActive = isGroupActive(group);
              const isOpen = isNonCollapsible || !collapsed[group.label] || groupActive;

              if (isNonCollapsible) {
                return (
                  <div key={group.label} className="mb-1">
                    {visibleItems.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                );
              }

              return (
                <div key={group.label} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                      groupActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <group.icon size={14} />
                      {group.label}
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-0.5 space-y-0.5 ml-2 border-l border-sidebar-border/50 pl-2">
                      {visibleItems.map(item => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon size={16} />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Crew Mode Toggle */}
          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={() => setCrewMode(!crewMode)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                crewMode ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <Users size={18} />
                Crew Mode
              </span>
              <span className={cn(
                "w-8 h-5 rounded-full relative transition-colors",
                crewMode ? "bg-success" : "bg-sidebar-border"
              )}>
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-sidebar-accent-foreground transition-transform",
                  crewMode ? "left-3.5" : "left-0.5"
                )} />
              </span>
            </button>
          </div>

          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="flex items-center gap-4 h-14 px-4 border-b border-border bg-card lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu size={20} />
          </button>
          <WorkspaceSwitcher />
          <div className="flex-1" />
          <NotificationBell />
          <div className="flex items-center gap-2 text-sm">
            {crewMode && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                CREW MODE
              </span>
            )}
            <span className="text-muted-foreground">{profile?.display_name || user?.email || "User"}</span>
            {role && (
              <span className="bg-secondary text-secondary-foreground text-xs font-medium px-2 py-0.5 rounded-full capitalize">
                {role}
              </span>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet context={{ crewMode }} />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
