import { motion } from "framer-motion";
import { CalendarDays, ClipboardCheck, Users, TrendingUp, DollarSign, AlertTriangle, Package, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  total_events: number;
  upcoming_events: number;
  today_events: number;
  total_leads: number;
  new_leads: number;
  total_deals: number;
  won_revenue: number;
  open_tasks: number;
  active_employees: number;
  total_payments: number;
  pending_bookings: number;
}

const DashboardHome = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as unknown as DashboardStats | null;
    },
    staleTime: 60_000, // 1 minute
  });

  const statCards = [
    { label: "Upcoming Events", value: stats?.upcoming_events ?? 0, icon: CalendarDays, sub: `${stats?.today_events ?? 0} today` },
    { label: "Total Leads", value: stats?.total_leads ?? 0, icon: UserPlus, sub: `${stats?.new_leads ?? 0} new` },
    { label: "Open Tasks", value: stats?.open_tasks ?? 0, icon: ClipboardCheck, sub: `${stats?.total_deals ?? 0} deals` },
    { label: "Revenue", value: `$${((stats?.won_revenue ?? 0) / 100).toLocaleString()}`, icon: DollarSign, sub: `$${((stats?.total_payments ?? 0) / 100).toLocaleString()} collected` },
    { label: "Active Employees", value: stats?.active_employees ?? 0, icon: Users, sub: "on roster" },
    { label: "Pending Bookings", value: stats?.pending_bookings ?? 0, icon: Package, sub: "awaiting review" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="p-5 rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon size={20} className="text-primary" />
              <TrendingUp size={14} className="text-success" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-display font-bold">{s.value}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            <div className="text-xs text-success mt-1">{s.sub}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
