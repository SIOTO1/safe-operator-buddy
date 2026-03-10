import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Shield, MessageSquare, BookOpen, ClipboardCheck, FileText, BarChart3, Users, Menu, X, LogOut, Settings, AlertTriangle, FileSignature, ScrollText, ClipboardList, Truck, MessageSquareWarning, CalendarDays, Inbox, Package, Contact, Kanban, ListTodo, MapPin, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard", end: true },
  { to: "/dashboard/chat", icon: MessageSquare, label: "AI Assistant" },
  { to: "/dashboard/knowledge", icon: BookOpen, label: "Knowledge Base" },
  { to: "/dashboard/checklists", icon: ClipboardCheck, label: "Checklists" },
  { to: "/dashboard/contracts", icon: FileText, label: "Contracts" },
  { to: "/dashboard/incident-report", icon: AlertTriangle, label: "Incident Report" },
  { to: "/dashboard/waiver", icon: FileSignature, label: "Liability Waiver" },
  { to: "/dashboard/sops", icon: ScrollText, label: "SOPs & Policies" },
  { to: "/dashboard/interview-guide", icon: ClipboardList, label: "Interview Guides" },
  { to: "/dashboard/drivers", icon: Truck, label: "Driver Management" },
  { to: "/dashboard/conversations", icon: MessageSquareWarning, label: "Difficult Conversations" },
  { to: "/dashboard/crew", icon: Users, label: "Crew" },
  { to: "/dashboard/scheduling", icon: CalendarDays, label: "Scheduling" },
  { to: "/dashboard/bookings", icon: Inbox, label: "Bookings", minRole: "manager" as const },
  { to: "/dashboard/equipment", icon: Package, label: "Equipment", minRole: "manager" as const },
  { to: "/dashboard/deliveries", icon: MapPin, label: "Delivery Schedule" },
  { to: "/dashboard/routes", icon: Route, label: "Route Planning", minRole: "manager" as const },
  { to: "/dashboard/crm/leads", icon: Contact, label: "Leads", section: "CRM" },
  { to: "/dashboard/crm/pipeline", icon: Kanban, label: "Pipeline", section: "CRM" },
  { to: "/dashboard/crm/tasks", icon: ListTodo, label: "Tasks", section: "CRM" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings", ownerOnly: true },
];

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [crewMode, setCrewMode] = useState(false);
  const { orgName, orgLogo } = useOrgSettings();
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transform transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              {orgLogo ? (
                <img src={orgLogo} alt="Company logo" className="w-7 h-7 rounded object-contain" />
              ) : (
                <Shield className="text-sidebar-primary" size={24} strokeWidth={2.5} fill="hsl(24 95% 53%)" />
              )}
              <span className="font-display font-bold text-lg text-sidebar-accent-foreground truncate">
                {orgName || <>SIOTO<span className="text-sidebar-primary">.AI</span></>}
              </span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {(() => {
              const filtered = navItems.filter(item => {
                if (item.ownerOnly) return role === "owner";
                if ((item as any).minRole === "manager") return role === "owner" || role === "manager";
                return true;
              });
              const mainItems = filtered.filter((i) => !(i as any).section);
              const crmItems = filtered.filter((i) => (i as any).section === "CRM");

              const renderItem = (item: typeof navItems[0]) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              );

              return (
                <>
                  {mainItems.map(renderItem)}
                  {crmItems.length > 0 && (
                    <>
                      <div className="pt-3 pb-1 px-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">CRM</span>
                      </div>
                      {crmItems.map(renderItem)}
                    </>
                  )}
                </>
              );
            })()}
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
