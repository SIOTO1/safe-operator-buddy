import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertTriangle, Clock, Package, FileWarning, CheckCircle2, XCircle, ShieldCheck, Plus, Trash2, ExternalLink, Wrench, ClipboardCheck } from "lucide-react";
import ComplianceReportGenerator from "@/components/compliance/ComplianceReportGenerator";
import { motion } from "framer-motion";
import { format, addDays, isBefore, differenceInDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type StatusLevel = "green" | "yellow" | "red";

interface MetricCard {
  title: string;
  value: string | number;
  subtitle: string;
  status: StatusLevel;
  icon: React.ElementType;
}

interface InsurancePolicy {
  id: string;
  provider: string;
  policy_number: string;
  coverage_amount: number;
  effective_date: string;
  expiration_date: string;
  document_url: string | null;
}

interface Inspection {
  id: string;
  product_id: string;
  inspection_date: string;
  inspected_by: string;
  inspection_status: "pass" | "fail" | "needs_repair";
  notes: string | null;
  next_due_date: string | null;
  products?: { name: string } | null;
}

const statusColors: Record<StatusLevel, { bg: string; text: string; label: string }> = {
  green: { bg: "bg-success/15", text: "text-success", label: "Compliant" },
  yellow: { bg: "bg-warning/15", text: "text-warning", label: "Warning" },
  red: { bg: "bg-destructive/15", text: "text-destructive", label: "Non-Compliant" },
};

const inspectionStatusMap: Record<string, { color: string; label: string }> = {
  pass: { color: "text-success bg-success/15", label: "Pass" },
  fail: { color: "text-destructive bg-destructive/15", label: "Fail" },
  needs_repair: { color: "text-warning bg-warning/15", label: "Needs Repair" },
};

const ComplianceDashboardPage = () => {
  const { role, user } = useAuth();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectionAlerts, setInspectionAlerts] = useState<Inspection[]>([]);
  const [productsList, setProductsList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ provider: "", policy_number: "", coverage_amount: "", effective_date: "", expiration_date: "", document_url: "" });
  const [newInspection, setNewInspection] = useState({ product_id: "", inspection_status: "pass" as string, notes: "", next_due_date: "" });
  const canManage = role === "owner" || role === "manager";

  useEffect(() => { loadData(); }, []);

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
      { data: insurancePolicies },
      { data: inspectionData },
    ] = await Promise.all([
      supabase.from("employees").select("id, status"),
      supabase.from("employee_certifications").select("*, employees(name)"),
      supabase.from("incident_reports").select("*, events(title)").order("date_reported", { ascending: false }).limit(10),
      supabase.from("products").select("id, name, is_active"),
      supabase.from("insurance_policies").select("*").order("expiration_date", { ascending: true }),
      supabase.from("equipment_inspections").select("*, products(name)").order("inspection_date", { ascending: false }),
    ]);

    setProductsList((products || []).map(p => ({ id: p.id, name: p.name })));

    // Certified employees
    const totalEmployees = employees?.length || 0;
    const activeCerts = certs?.filter(c => c.certification_status === "active") || [];
    const uniqueCertifiedIds = new Set(activeCerts.map(c => c.employee_id));
    const certifiedCount = uniqueCertifiedIds.size;
    const certRatio = totalEmployees > 0 ? certifiedCount / totalEmployees : 0;
    const certStatus: StatusLevel = certRatio >= 0.9 ? "green" : certRatio >= 0.7 ? "yellow" : "red";

    // Expiring certs
    const expiring = certs?.filter(c => {
      if (!c.expiration_date || c.certification_status !== "active") return false;
      return isBefore(new Date(c.expiration_date), in60Days);
    }) || [];
    const expiringIn30 = expiring.filter(c => isBefore(new Date(c.expiration_date), in30Days));
    const expiredNow = expiring.filter(c => isBefore(new Date(c.expiration_date), now));
    const certExpStatus: StatusLevel = expiredNow.length > 0 ? "red" : expiringIn30.length > 0 ? "yellow" : "green";

    // Incidents
    const recentCount = incidents?.filter(i => new Date(i.date_reported) >= addDays(now, -30)).length || 0;
    const incidentStatus: StatusLevel = recentCount >= 5 ? "red" : recentCount >= 2 ? "yellow" : "green";

    // Equipment
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.is_active).length || 0;
    const eqRatio = totalProducts > 0 ? activeProducts / totalProducts : 1;
    const eqStatus: StatusLevel = eqRatio >= 0.95 ? "green" : eqRatio >= 0.8 ? "yellow" : "red";

    // Insurance
    const pols = (insurancePolicies || []) as InsurancePolicy[];
    const expiredPolicies = pols.filter(p => isBefore(new Date(p.expiration_date), now));
    const warningPolicies = pols.filter(p => {
      const exp = new Date(p.expiration_date);
      return !isBefore(exp, now) && isBefore(exp, in30Days);
    });
    const insStatus: StatusLevel = expiredPolicies.length > 0 ? "red" : warningPolicies.length > 0 ? "yellow" : pols.length === 0 ? "yellow" : "green";

    // Inspections
    const allInspections = (inspectionData || []) as Inspection[];
    const failedOrRepair = allInspections.filter(i => i.inspection_status === "fail" || i.inspection_status === "needs_repair");
    const overdue = allInspections.filter(i => i.next_due_date && isBefore(new Date(i.next_due_date), now));
    const dueSoon = allInspections.filter(i => i.next_due_date && !isBefore(new Date(i.next_due_date), now) && isBefore(new Date(i.next_due_date), in30Days));
    const inspStatus: StatusLevel = failedOrRepair.length > 0 || overdue.length > 0 ? "red" : dueSoon.length > 0 ? "yellow" : "green";

    // Alerts: failed/needs_repair + overdue next_due_date
    const alerts = [
      ...failedOrRepair,
      ...overdue.filter(o => !failedOrRepair.some(f => f.id === o.id)),
    ];

    setMetrics([
      { title: "Certified Employees", value: `${certifiedCount}/${totalEmployees}`, subtitle: `${Math.round(certRatio * 100)}% certified`, status: certStatus, icon: Users },
      { title: "Cert Expirations", value: expiring.length, subtitle: expiredNow.length > 0 ? `${expiredNow.length} expired` : expiringIn30.length > 0 ? `${expiringIn30.length} within 30 days` : "All current", status: certExpStatus, icon: Clock },
      { title: "Inspections", value: `${failedOrRepair.length + overdue.length}`, subtitle: failedOrRepair.length > 0 ? `${failedOrRepair.length} failed/repair` : overdue.length > 0 ? `${overdue.length} overdue` : dueSoon.length > 0 ? `${dueSoon.length} due soon` : "All current", status: inspStatus, icon: ClipboardCheck },
      { title: "Recent Incidents", value: recentCount, subtitle: `Last 30 days (${incidents?.length || 0} total)`, status: incidentStatus, icon: FileWarning },
      { title: "Insurance Policies", value: pols.length, subtitle: expiredPolicies.length > 0 ? `${expiredPolicies.length} expired` : warningPolicies.length > 0 ? `${warningPolicies.length} expiring soon` : pols.length === 0 ? "No policies added" : "All current", status: insStatus, icon: ShieldCheck },
      { title: "Equipment Status", value: `${activeProducts}/${totalProducts}`, subtitle: `${Math.round(eqRatio * 100)}% active`, status: eqStatus, icon: Package },
    ]);

    setExpiringCerts(expiring.sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()));
    setRecentIncidents(incidents || []);
    setPolicies(pols);
    setInspections(allInspections);
    setInspectionAlerts(alerts);
    setLoading(false);
  };

  const handleAddPolicy = async () => {
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user?.id || "").single();
    if (!profile?.company_id) return;
    const { error } = await supabase.from("insurance_policies").insert({
      company_id: profile.company_id,
      provider: newPolicy.provider,
      policy_number: newPolicy.policy_number,
      coverage_amount: parseFloat(newPolicy.coverage_amount) || 0,
      effective_date: newPolicy.effective_date,
      expiration_date: newPolicy.expiration_date,
      document_url: newPolicy.document_url || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Policy added" }); setAddOpen(false); setNewPolicy({ provider: "", policy_number: "", coverage_amount: "", effective_date: "", expiration_date: "", document_url: "" }); loadData(); }
  };

  const handleAddInspection = async () => {
    const { error } = await supabase.from("equipment_inspections").insert({
      product_id: newInspection.product_id,
      inspected_by: user?.id!,
      inspection_status: newInspection.inspection_status as "pass" | "fail" | "needs_repair",
      notes: newInspection.notes || null,
      next_due_date: newInspection.next_due_date || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Inspection logged" }); setInspectionOpen(false); setNewInspection({ product_id: "", inspection_status: "pass", notes: "", next_due_date: "" }); loadData(); }
  };

  const handleDeletePolicy = async (id: string) => {
    await supabase.from("insurance_policies").delete().eq("id", id);
    loadData();
  };

  const getPolicyStatus = (p: InsurancePolicy): StatusLevel => {
    const now = new Date();
    const exp = new Date(p.expiration_date);
    if (isBefore(exp, now)) return "red";
    if (differenceInDays(exp, now) <= 30) return "yellow";
    return "green";
  };

  const overallStatus: StatusLevel = metrics.some(m => m.status === "red") ? "red" : metrics.some(m => m.status === "yellow") ? "yellow" : "green";

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <h1 className="text-2xl font-display font-bold">Insurance & Compliance</h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
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
          <p className="text-muted-foreground text-sm mt-1">Monitor certifications, inspections, insurance, and incidents</p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && <ComplianceReportGenerator />}
          <Badge className={`${statusColors[overallStatus].bg} ${statusColors[overallStatus].text} border-0 text-sm px-3 py-1`}>
            {overallStatus === "green" ? <CheckCircle2 size={14} className="mr-1.5" /> : overallStatus === "red" ? <XCircle size={14} className="mr-1.5" /> : <AlertTriangle size={14} className="mr-1.5" />}
            {statusColors[overallStatus].label}
          </Badge>
        </div>
      </div>

      {/* Certification Expiration Alerts */}
      {expiringCerts.filter(c => isBefore(new Date(c.expiration_date), addDays(new Date(), 30))).length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 rounded-full bg-warning/15 p-2">
                  <AlertTriangle size={18} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">Certification Expiration Alert</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                    The following employee certifications expire within 30 days and require immediate attention.
                  </p>
                  <div className="space-y-1.5">
                    {expiringCerts
                      .filter(c => isBefore(new Date(c.expiration_date), addDays(new Date(), 30)))
                      .map(cert => {
                        const exp = new Date(cert.expiration_date);
                        const isExpired = isBefore(exp, new Date());
                        const days = differenceInDays(exp, new Date());
                        return (
                          <div key={cert.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-background/80">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium truncate">{(cert.employees as { name: string } | null)?.name}</span>
                              <span className="text-xs text-muted-foreground">— {cert.certification_name}</span>
                            </div>
                            <Badge variant="outline" className={`shrink-0 border-0 text-[10px] ${isExpired ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                              {isExpired ? "Expired" : `${days}d remaining`}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m, i) => {
          const s = statusColors[m.status];
          return (
            <motion.div key={m.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${m.status === "green" ? "bg-success" : m.status === "yellow" ? "bg-warning" : "bg-destructive"}`} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <m.icon size={20} className={s.text} />
                    <Badge variant="outline" className={`${s.bg} ${s.text} border-0 text-[10px]`}>{s.label}</Badge>
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

      {/* Equipment Inspections */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <ClipboardCheck size={18} className="text-primary" />
              Equipment Inspections
            </CardTitle>
            <Dialog open={inspectionOpen} onOpenChange={setInspectionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus size={14} className="mr-1.5" />Log Inspection</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Equipment Inspection</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Equipment</Label>
                    <Select value={newInspection.product_id} onValueChange={v => setNewInspection(p => ({ ...p, product_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                      <SelectContent>
                        {productsList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={newInspection.inspection_status} onValueChange={v => setNewInspection(p => ({ ...p, inspection_status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                        <SelectItem value="needs_repair">Needs Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Notes (optional)</Label><Textarea value={newInspection.notes} onChange={e => setNewInspection(p => ({ ...p, notes: e.target.value }))} placeholder="Inspection notes..." /></div>
                  <div><Label>Next Due Date (optional)</Label><Input type="date" value={newInspection.next_due_date} onChange={e => setNewInspection(p => ({ ...p, next_due_date: e.target.value }))} /></div>
                  <Button onClick={handleAddInspection} disabled={!newInspection.product_id} className="w-full">Log Inspection</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Alerts */}
          {inspectionAlerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {inspectionAlerts.map(a => {
                const isOverdue = a.next_due_date && isBefore(new Date(a.next_due_date), new Date());
                const isFail = a.inspection_status === "fail" || a.inspection_status === "needs_repair";
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                    <AlertTriangle size={16} className="text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{(a.products as any)?.name || "Equipment"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isFail && <span className="text-destructive font-medium">{inspectionStatusMap[a.inspection_status]?.label}</span>}
                        {isFail && isOverdue && " · "}
                        {isOverdue && <span className="text-destructive font-medium">Overdue since {format(new Date(a.next_due_date!), "MMM d")}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent inspections */}
          {inspections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No inspections logged yet</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {inspections.slice(0, 15).map(ins => {
                const sm = inspectionStatusMap[ins.inspection_status] || inspectionStatusMap.pass;
                return (
                  <div key={ins.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{(ins.products as any)?.name || "Equipment"}</p>
                        <Badge variant="outline" className={`${sm.color} border-0 text-[10px]`}>{sm.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{format(new Date(ins.inspection_date), "MMM d, yyyy")}</span>
                        {ins.next_due_date && <span>Next: {format(new Date(ins.next_due_date), "MMM d, yyyy")}</span>}
                        {ins.notes && <span className="truncate max-w-48">{ins.notes}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insurance Policies */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              Insurance Policies
            </CardTitle>
            {canManage && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus size={14} className="mr-1.5" />Add Policy</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Insurance Policy</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Provider</Label><Input value={newPolicy.provider} onChange={e => setNewPolicy(p => ({ ...p, provider: e.target.value }))} placeholder="e.g. State Farm" /></div>
                      <div><Label>Policy Number</Label><Input value={newPolicy.policy_number} onChange={e => setNewPolicy(p => ({ ...p, policy_number: e.target.value }))} placeholder="POL-123456" /></div>
                    </div>
                    <div><Label>Coverage Amount ($)</Label><Input type="number" value={newPolicy.coverage_amount} onChange={e => setNewPolicy(p => ({ ...p, coverage_amount: e.target.value }))} placeholder="1000000" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Effective Date</Label><Input type="date" value={newPolicy.effective_date} onChange={e => setNewPolicy(p => ({ ...p, effective_date: e.target.value }))} /></div>
                      <div><Label>Expiration Date</Label><Input type="date" value={newPolicy.expiration_date} onChange={e => setNewPolicy(p => ({ ...p, expiration_date: e.target.value }))} /></div>
                    </div>
                    <div><Label>Document URL (optional)</Label><Input value={newPolicy.document_url} onChange={e => setNewPolicy(p => ({ ...p, document_url: e.target.value }))} placeholder="https://..." /></div>
                    <Button onClick={handleAddPolicy} disabled={!newPolicy.provider || !newPolicy.policy_number || !newPolicy.effective_date || !newPolicy.expiration_date} className="w-full">Add Policy</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No insurance policies added yet</p>
          ) : (
            <div className="space-y-3">
              {policies.map(p => {
                const ps = getPolicyStatus(p);
                const sc = statusColors[ps];
                const daysLeft = differenceInDays(new Date(p.expiration_date), new Date());
                return (
                  <div key={p.id} className={`flex items-center justify-between p-4 rounded-lg border ${ps === "red" ? "border-destructive/30 bg-destructive/5" : ps === "yellow" ? "border-warning/30 bg-warning/5" : "border-border bg-muted/30"}`}>
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">{p.provider}</p>
                        <Badge variant="outline" className={`${sc.bg} ${sc.text} border-0 text-[10px]`}>
                          {ps === "red" ? "Expired" : ps === "yellow" ? `${daysLeft}d left` : "Active"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>#{p.policy_number}</span>
                        <span>${Number(p.coverage_amount).toLocaleString()} coverage</span>
                        <span>{format(new Date(p.effective_date), "MMM d, yyyy")} – {format(new Date(p.expiration_date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.document_url && (
                        <Button size="icon" variant="ghost" asChild><a href={p.document_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a></Button>
                      )}
                      {canManage && (
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeletePolicy(p.id)}><Trash2 size={14} /></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Panels */}
      <div className="grid lg:grid-cols-2 gap-6">
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
