import { motion } from "framer-motion";
import { MessageSquare, ClipboardCheck, FileText, Users, TrendingUp, Shield, AlertTriangle } from "lucide-react";

const stats = [
  { label: "Active Users", value: "12", icon: Users, trend: "+3 this week" },
  { label: "Questions Asked", value: "248", icon: MessageSquare, trend: "+42 today" },
  { label: "Checklists Done", value: "89", icon: ClipboardCheck, trend: "92% completion" },
  { label: "Risk Alerts", value: "3", icon: AlertTriangle, trend: "2 resolved" },
];

const recentQuestions = [
  { q: "What are the wind speed limits for a bounce house?", time: "5 min ago" },
  { q: "How many sandbags needed for 15x15 inflatable?", time: "12 min ago" },
  { q: "Extension cord gauge requirements for blower?", time: "28 min ago" },
  { q: "Can we set up on gravel surface?", time: "1 hr ago" },
];

const DashboardHome = () => {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your safety operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon size={20} className="text-primary" />
              <TrendingUp size={14} className="text-success" />
            </div>
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            <div className="text-xs text-success mt-1">{s.trend}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Recent Questions</h2>
          <div className="space-y-3">
            {recentQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <MessageSquare size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{q.q}</p>
                  <span className="text-xs text-muted-foreground">{q.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Compliance Status</h2>
          <div className="space-y-4">
            {[
              { label: "Setup Procedures", pct: 95 },
              { label: "Wind Compliance", pct: 88 },
              { label: "Electrical Safety", pct: 100 },
              { label: "Inspection Protocols", pct: 72 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
