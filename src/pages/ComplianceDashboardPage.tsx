import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Users, AlertTriangle, Clock, Package, FileWarning, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { format, addDays, isBefore } from "date-fns";

type StatusLevel = "green" | "yellow" | "red";

interface MetricCard {
  title: string;
  value: string | number;
  subtitle: string;
  status: StatusLevel;
  icon: React.ElementType;
}

const statusColors: Record<StatusLevel, { bg: string; text: string; label: string }> = {
  green: { bg: "bg-success/15", text: "text-success", label: "Compliant" },
  yellow: { bg: "bg-warning/15", text: "text-warning", label: "Warning" },
  red: { bg: "bg-destructive/15", text: "text-destructive", label: "Non-Compliant" },
};

const ComplianceDashboardPage = () => {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const now = new Date();
    const in30Days = addDays(now, 30);
    const in60Days = addDays(now, 60);

    const [
      { data: employees },
      { data: certs },
      { data: incidents },
      { data: products },
    ] = await Promise.all([
      supabase.from("employees").select("id, status"),
      supabase.from("employee_certifications").select("*, employees(name)"),
      supabase.from("incident_reports").select("*, events(title)").order("date_reported", { ascending: false }).limit(10),
      supabase.from("products").select("id, name, is_active"),
    ]);

    // Certified employees
    const totalEmployees = employees?.length || 0;
    const activeCerts = certs?.filter(c => c.certification_status === "active") || [];
    const uniqueCertifiedIds = new Set(activeCerts.map(c => c.employee_id));
    const certifiedCount = uniqueCertifiedIds.size;
    const certRatio = totalEmployees > 0 ? certifiedCount / totalEmployees : 0;
    const certStatus: StatusLevel = certRatio >= 0.9 ? "green" : certRatio >= 0.7 ? "yellow" : "red";

    // Expiring certs (next 60 days)
    const expiring = certs?.filter(c => {
      if (!c.expiration_date || c.certification_status !== "active") return false;
      const exp = new Date(c.expiration_date);
      return isBefore(exp, in60Days);
    }) || [];
    const expiringIn30 = expiring.filter(c => isBefore(new Date(c.expiration_date), in30Days));
    const expiredNow = expiring.filter(c => isBefore(new Date(c.expiration_date), now));
    const certExpStatus: StatusLevel = expiredNow.length > 0 ? "red" : expiringIn30.length > 0 ? "yellow" : "green";

    // Incidents
    const incidentCount = incidents?.length || 0;
    const recentCount = incidents?.filter(i => {
      const d = new Date(i.date_reported);
      return d >= addDays(now, -30);
    }).length || 0;
    const incidentStatus: StatusLevel = recentCount >= 5 ? "red" : recentCount >= 2 ? "yellow" : "green";

    // Equipment / products active
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.is_active).length || 0;
    const eqRatio = totalProducts > 0 ? activeProducts / totalProducts : 1;
    const eqStatus: StatusLevel = eqRatio >= 0.95 ? "green" : eqRatio >= 0.8 ? "yellow" : "red";

    setMetrics([
      {
        title: "Certified Employees",
        value: `${certifiedCount}/${totalEmployees}`,
        subtitle: `${Math.round(certRatio * 100)}% certified`,
        status: certStatus,
        icon: Users,
      },
      {
        title: "Cert Expirations",
        value: expiring.length,
        subtitle: expiredNow.length > 0 ? `${expiredNow.length} expired` : expiringIn30.length > 0 ? `${expiringIn30.length} within 30 days` : "All current",
        status: certExpStatus,
        icon: Clock,
      },
      {
        title: "Equipment Status",
        value: `${activeProducts}/${totalProducts}`,
        subtitle: `${Math.round(eqRatio * 100)}% active`,
        status: eqStatus,
        icon: Package,
      },
      {
        title: "Recent Incidents",
        value: recentCount,
        subtitle: `Last 30 days (${incidentCount} total)`,
        status: incidentStatus,
        icon: FileWarning,
      },
    ]);

    setExpiringCerts(expiring.sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()));
    setRecentIncidents(incidents || []);
    setLoading(false);
  };

  const overallStatus: StatusLevel = metrics.some(m => m.status === "red")
    ? "red"
    : metrics.some(m => m.status === "yellow")
    ? "yellow"
    : "green";

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <h1 className="text-2xl font-display font-bold">Insurance & Compliance</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Insurance & Compliance</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor certifications, equipment, and incident history</p>
        </div>
        <Badge className={`${statusColors[overallStatus].bg} ${statusColors[overallStatus].text} border-0 text-sm px-3 py-1`}>
          {overallStatus === "green" ? <CheckCircle2 size={14} className="mr-1.5" /> : overallStatus === "red" ? <XCircle size={14} className="mr-1.5" /> : <AlertTriangle size={14} className="mr-1.5" />}
          {statusColors[overallStatus].label}
        </Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const s = statusColors[m.status];
          return (
            <motion.div key={m.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${m.status === "green" ? "bg-success" : m.status === "yellow" ? "bg-warning" : "bg-destructive"}`} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <m.icon size={20} className={s.text} />
                    <Badge variant="outline" className={`${s.bg} ${s.text} border-0 text-[10px]`}>
                      {s.label}
                    </Badge>
                  </div>
                  <div className="text-2xl font-display font-bold">{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.title}</div>
                  <div className={`text-xs mt-1 ${s.text}`}>{m.subtitle}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Panels */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expiring Certifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Clock size={18} className="text-warning" />
              Upcoming Cert Expirations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringCerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All certifications are current ✓</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {expiringCerts.map(cert => {
                  const exp = new Date(cert.expiration_date);
                  const isExpired = isBefore(exp, new Date());
                  return (
                    <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{(cert.employees as any)?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{cert.certification_name}</p>
                      </div>
                      <Badge variant="outline" className={isExpired ? "bg-destructive/15 text-destructive border-0" : "bg-warning/15 text-warning border-0"}>
                        {isExpired ? "Expired" : format(exp, "MMM d, yyyy")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <FileWarning size={18} className="text-destructive" />
              Recent Incident Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No incident reports filed</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {recentIncidents.map(inc => (
                  <div key={inc.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{(inc.events as any)?.title || "Event"}</p>
                      <span className="text-xs text-muted-foreground">{format(new Date(inc.date_reported), "MMM d")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{inc.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceDashboardPage;
