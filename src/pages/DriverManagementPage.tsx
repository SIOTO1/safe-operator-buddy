import { useState, useMemo } from "react";
import {
  Truck, CheckCircle2, Circle, AlertTriangle, Phone, Cigarette, ShieldCheck,
  Clock, Eye, ChevronDown, ChevronUp, Award, XCircle, BookOpen, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import jsPDF from "jspdf";

// ─── Driver Rules Data ───────────────────────────────────────────────

interface RuleItem {
  id: string;
  rule: string;
  category: "safety" | "conduct" | "vehicle" | "customer";
  severity: "critical" | "important" | "standard";
}

const driverRules: RuleItem[] = [
  // Safety
  { id: "s1", rule: "Wear seatbelt at ALL times while vehicle is in motion", category: "safety", severity: "critical" },
  { id: "s2", rule: "ZERO TOLERANCE for phone use while driving — no calls, texts, or GPS adjustments", category: "safety", severity: "critical" },
  { id: "s3", rule: "Obey all posted speed limits — no exceptions", category: "safety", severity: "critical" },
  { id: "s4", rule: "Maintain safe following distance (minimum 4 seconds for trucks/trailers)", category: "safety", severity: "critical" },
  { id: "s5", rule: "Complete pre-trip vehicle inspection before every departure", category: "safety", severity: "critical" },
  { id: "s6", rule: "Use proper lifting techniques — lift with legs, not back", category: "safety", severity: "critical" },
  { id: "s7", rule: "Never lift more than 75 lbs alone — always use a partner or equipment", category: "safety", severity: "important" },
  { id: "s8", rule: "Wear closed-toe shoes and appropriate work attire at all times", category: "safety", severity: "important" },
  { id: "s9", rule: "Report any vehicle damage, accidents, or near-misses immediately", category: "safety", severity: "critical" },

  // Conduct
  { id: "c1", rule: "No smoking, vaping, or tobacco use in company vehicles or at customer sites", category: "conduct", severity: "critical" },
  { id: "c2", rule: "No alcohol or drug use before or during work — ZERO TOLERANCE", category: "conduct", severity: "critical" },
  { id: "c3", rule: "Arrive on time for all scheduled shifts and deliveries", category: "conduct", severity: "important" },
  { id: "c4", rule: "No unauthorized passengers in company vehicles", category: "conduct", severity: "important" },
  { id: "c5", rule: "Maintain professional language — no profanity on the job", category: "conduct", severity: "standard" },
  { id: "c6", rule: "Follow the company uniform policy at all times", category: "conduct", severity: "standard" },
  { id: "c7", rule: "No personal errands or stops during company time (time theft)", category: "conduct", severity: "important" },
  { id: "c8", rule: "Keep company information and customer data confidential", category: "conduct", severity: "important" },

  // Vehicle
  { id: "v1", rule: "Lock vehicle when unattended — even during deliveries", category: "vehicle", severity: "important" },
  { id: "v2", rule: "Keep vehicle clean and organized at all times", category: "vehicle", severity: "standard" },
  { id: "v3", rule: "Check tire pressure, fluids, and lights during pre-trip inspection", category: "vehicle", severity: "important" },
  { id: "v4", rule: "Properly secure all cargo before driving — use straps, ties, and pads", category: "vehicle", severity: "critical" },
  { id: "v5", rule: "Do not exceed vehicle weight capacity", category: "vehicle", severity: "critical" },
  { id: "v6", rule: "Park in designated areas only — never block fire lanes or emergency exits", category: "vehicle", severity: "important" },

  // Customer
  { id: "cu1", rule: "Greet every customer professionally and introduce yourself by name", category: "customer", severity: "standard" },
  { id: "cu2", rule: "Walk the setup area with the customer and confirm placement before unloading", category: "customer", severity: "important" },
  { id: "cu3", rule: "Provide a complete safety briefing to the customer before leaving the site", category: "customer", severity: "critical" },
  { id: "cu4", rule: "Never argue with a customer — escalate issues to management", category: "customer", severity: "important" },
  { id: "cu5", rule: "Leave the site clean — remove all packing materials, straps, and debris", category: "customer", severity: "standard" },
];

const categoryLabels: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  safety: { label: "Safety & Driving", icon: ShieldCheck, color: "text-destructive" },
  conduct: { label: "Professional Conduct", icon: Award, color: "text-primary" },
  vehicle: { label: "Vehicle Care", icon: Truck, color: "text-blue-500" },
  customer: { label: "Customer Interaction", icon: Eye, color: "text-emerald-500" },
};

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  important: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  standard: "bg-secondary text-secondary-foreground border-border",
};

// ─── Pre-Trip Inspection Checklist ───────────────────────────────────

interface InspectionItem {
  id: string;
  label: string;
  checked: boolean;
}

const defaultInspection: InspectionItem[] = [
  { id: "i1", label: "Tires — check pressure, tread depth, and condition", checked: false },
  { id: "i2", label: "Lights — headlights, taillights, brake lights, turn signals", checked: false },
  { id: "i3", label: "Mirrors — clean, properly adjusted, no cracks", checked: false },
  { id: "i4", label: "Fluids — oil, coolant, windshield washer, brake fluid", checked: false },
  { id: "i5", label: "Brakes — test before leaving, check parking brake", checked: false },
  { id: "i6", label: "Horn — functional", checked: false },
  { id: "i7", label: "Wipers — operational, blades in good condition", checked: false },
  { id: "i8", label: "Cargo area — clean, equipment properly secured", checked: false },
  { id: "i9", label: "First aid kit — present and stocked", checked: false },
  { id: "i10", label: "Fire extinguisher — present and charged", checked: false },
  { id: "i11", label: "Registration and insurance docs in vehicle", checked: false },
  { id: "i12", label: "Fuel level adequate for route", checked: false },
];

// ─── Compliance Tracking ─────────────────────────────────────────────

interface ComplianceItem {
  id: string;
  label: string;
  status: "compliant" | "due_soon" | "overdue" | "na";
  dueDate?: string;
}

const defaultCompliance: ComplianceItem[] = [
  { id: "cl1", label: "Driver's License Valid", status: "compliant", dueDate: "2026-12-15" },
  { id: "cl2", label: "Vehicle Insurance Current", status: "compliant", dueDate: "2026-08-01" },
  { id: "cl3", label: "Vehicle Registration Current", status: "compliant", dueDate: "2026-06-30" },
  { id: "cl4", label: "Pre-Trip Inspection Completed Today", status: "due_soon" },
  { id: "cl5", label: "Safety Training — Annual Refresher", status: "compliant", dueDate: "2027-01-15" },
  { id: "cl6", label: "Lifting Technique Certification", status: "compliant", dueDate: "2026-09-01" },
  { id: "cl7", label: "First Aid / CPR Training", status: "due_soon", dueDate: "2026-04-01" },
  { id: "cl8", label: "Drug/Alcohol Screening", status: "compliant", dueDate: "2026-11-01" },
  { id: "cl9", label: "Vehicle Maintenance — Oil Change", status: "due_soon", dueDate: "2026-03-15" },
  { id: "cl10", label: "Vehicle Maintenance — Brake Inspection", status: "compliant", dueDate: "2026-07-01" },
];

const statusStyles: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  compliant: { label: "Compliant", color: "text-emerald-600 bg-emerald-500/10", icon: CheckCircle2 },
  due_soon: { label: "Due Soon", color: "text-amber-600 bg-amber-500/10", icon: Clock },
  overdue: { label: "Overdue", color: "text-destructive bg-destructive/10", icon: XCircle },
  na: { label: "N/A", color: "text-muted-foreground bg-muted", icon: Circle },
};

// ─── Page Component ──────────────────────────────────────────────────

type TabType = "rules" | "inspection" | "compliance";

const DriverManagementPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("rules");
  const [acknowledgedRules, setAcknowledgedRules] = useState<Set<string>>(new Set());
  const [expandedCategory, setExpandedCategory] = useState<string | null>("safety");
  const [inspection, setInspection] = useState(defaultInspection);
  const [compliance, setCompliance] = useState(defaultCompliance);
  const { orgName } = useOrgSettings();

  const toggleRule = (id: string) => {
    setAcknowledgedRules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleInspection = (id: string) => {
    setInspection(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const inspectionProgress = useMemo(() => {
    const done = inspection.filter(i => i.checked).length;
    return { done, total: inspection.length, pct: Math.round((done / inspection.length) * 100) };
  }, [inspection]);

  const complianceStats = useMemo(() => ({
    compliant: compliance.filter(c => c.status === "compliant").length,
    dueSoon: compliance.filter(c => c.status === "due_soon").length,
    overdue: compliance.filter(c => c.status === "overdue").length,
  }), [compliance]);

  const downloadRulesPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxW = pw - margin * 2;
    let y = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(orgName || "SIOTO.AI", pw / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Driver Rules & Expectations", pw / 2, y, { align: "center" });
    y += 10;
    doc.setDrawColor(180);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    const cats = ["safety", "conduct", "vehicle", "customer"] as const;
    for (const cat of cats) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(categoryLabels[cat].label, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const rule of driverRules.filter(r => r.category === cat)) {
        const sev = rule.severity === "critical" ? "🔴" : rule.severity === "important" ? "🟡" : "⚪";
        const lines = doc.splitTextToSize(`${sev} ${rule.rule}`, maxW - 5);
        if (y + lines.length * 5 > 270) { doc.addPage(); y = 20; }
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 2;
      }
      y += 4;
    }

    y += 10;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.text("I acknowledge that I have read, understand, and agree to follow all rules listed above.", margin, y, { maxWidth: maxW });
    y += 16;
    doc.line(margin, y, 95, y);
    doc.text("Driver Signature", margin + 15, y + 5);
    doc.line(110, y, pw - margin, y);
    doc.text("Date", 140, y + 5);
    y += 14;
    doc.line(margin, y, 95, y);
    doc.text("Printed Name", margin + 15, y + 5);

    doc.save("Driver_Rules_and_Expectations.pdf");
  };

  const tabs: { key: TabType; label: string; icon: React.ComponentType<any> }[] = [
    { key: "rules", label: "Driver Rules", icon: BookOpen },
    { key: "inspection", label: "Pre-Trip Inspection", icon: Truck },
    { key: "compliance", label: "Compliance Tracker", icon: ShieldCheck },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Driver Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rules, inspections, and compliance tracking for your delivery crew
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Rules", value: driverRules.length, sub: `${acknowledgedRules.size} acknowledged`, icon: BookOpen },
          { label: "Inspection", value: `${inspectionProgress.pct}%`, sub: `${inspectionProgress.done}/${inspectionProgress.total} items`, icon: Truck },
          { label: "Compliant", value: complianceStats.compliant, sub: "items up to date", icon: CheckCircle2 },
          { label: "Action Needed", value: complianceStats.dueSoon + complianceStats.overdue, sub: "due soon or overdue", icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <s.icon size={14} />
              {s.label}
            </div>
            <p className="text-2xl font-bold font-display">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "rules" && (
          <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {acknowledgedRules.size}/{driverRules.length} rules acknowledged
              </p>
              <Button size="sm" variant="outline" onClick={downloadRulesPDF} className="gap-1.5">
                <Download size={14} /> Download PDF
              </Button>
            </div>

            {(["safety", "conduct", "vehicle", "customer"] as const).map(cat => {
              const catInfo = categoryLabels[cat];
              const CatIcon = catInfo.icon;
              const rules = driverRules.filter(r => r.category === cat);
              const acked = rules.filter(r => acknowledgedRules.has(r.id)).length;
              const expanded = expandedCategory === cat;

              return (
                <div key={cat} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expanded ? null : cat)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CatIcon size={20} className={catInfo.color} />
                      <div>
                        <h3 className="font-semibold text-sm">{catInfo.label}</h3>
                        <p className="text-xs text-muted-foreground">{acked}/{rules.length} acknowledged</p>
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                          {rules.map(rule => (
                            <button
                              key={rule.id}
                              onClick={() => toggleRule(rule.id)}
                              className={cn(
                                "w-full flex items-start gap-3 p-3 rounded-lg text-sm text-left transition-colors",
                                acknowledgedRules.has(rule.id) ? "bg-emerald-500/5" : "hover:bg-muted/50"
                              )}
                            >
                              {acknowledgedRules.has(rule.id) ? (
                                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <Circle size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <span className={acknowledgedRules.has(rule.id) ? "text-muted-foreground" : ""}>
                                  {rule.rule}
                                </span>
                                <span className={cn("inline-block ml-2 text-[10px] px-1.5 py-0.5 rounded border", severityStyles[rule.severity])}>
                                  {rule.severity}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {acknowledgedRules.size === driverRules.length && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 text-emerald-600 font-medium text-sm">
                <CheckCircle2 size={18} />
                All driver rules acknowledged! You're ready to roll.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "inspection" && (
          <motion.div key="inspection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-lg">Pre-Trip Vehicle Inspection</h2>
                <p className="text-sm text-muted-foreground">Complete before every departure</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{inspectionProgress.done}/{inspectionProgress.total}</span>
                <div className="w-24 h-1.5 rounded-full bg-muted mt-1">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${inspectionProgress.pct}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              {inspection.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleInspection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-sm text-left transition-colors",
                    item.checked ? "bg-emerald-500/5" : "hover:bg-muted/50"
                  )}
                >
                  {item.checked ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Circle size={18} className="text-muted-foreground shrink-0" />
                  )}
                  <span className={item.checked ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                </button>
              ))}

              {inspectionProgress.pct === 100 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Pre-trip inspection complete — vehicle cleared for departure!
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspection(defaultInspection)}
            >
              Reset Inspection
            </Button>
          </motion.div>
        )}

        {activeTab === "compliance" && (
          <motion.div key="compliance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl space-y-4">
            <h2 className="font-display font-semibold text-lg">Compliance Tracker</h2>
            <p className="text-sm text-muted-foreground">Track certifications, inspections, and training deadlines</p>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Item</th>
                    <th className="text-left font-medium p-4">Status</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.map(item => {
                    const st = statusStyles[item.status];
                    const StatusIcon = st.icon;
                    return (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{item.label}</td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full", st.color)}>
                            <StatusIcon size={12} />
                            {st.label}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground hidden sm:table-cell">
                          {item.dueDate || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Compliance items are tracked manually. Update status as certifications and inspections are completed.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriverManagementPage;
