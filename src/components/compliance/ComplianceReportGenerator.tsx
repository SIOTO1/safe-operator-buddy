import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileText, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { format, isBefore } from "date-fns";

interface ReportSection {
  id: string;
  label: string;
  description: string;
}

const SECTIONS: ReportSection[] = [
  { id: "certifications", label: "Employee Certifications", description: "All employee certifications with status and expiration dates" },
  { id: "inspections", label: "Equipment Inspections", description: "Inspection history with pass/fail results and next due dates" },
  { id: "insurance", label: "Insurance Policies", description: "Active and expired insurance policy details and coverage" },
  { id: "incidents", label: "Incident Reports", description: "Documented incidents with dates, descriptions, and linked events" },
];

const ComplianceReportGenerator = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(SECTIONS.map(s => s.id)));

  const toggleSection = (id: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateReport = async () => {
    if (selectedSections.size === 0) {
      toast({ title: "Select at least one section", variant: "destructive" });
      return;
    }

    setGenerating(true);

    try {
      // Fetch all data in parallel
      const [
        { data: employees },
        { data: certs },
        { data: inspectionData },
        { data: insurancePolicies },
        { data: incidents },
        { data: orgSettings },
        { data: profile },
      ] = await Promise.all([
        supabase.from("employees").select("id, name, status, role"),
        supabase.from("employee_certifications").select("*, employees(name)"),
        supabase.from("equipment_inspections").select("*, products(name)").order("inspection_date", { ascending: false }),
        supabase.from("insurance_policies").select("*").order("expiration_date", { ascending: true }),
        supabase.from("incident_reports").select("*, events(title)").order("date_reported", { ascending: false }),
        supabase.from("organization_settings").select("company_name").limit(1).single(),
        supabase.from("profiles").select("display_name, company_id").eq("user_id", user?.id || "").single(),
      ]);

      const companyName = orgSettings?.company_name || "Company";
      const generatedBy = profile?.display_name || user?.email || "System";
      const reportDate = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
      const now = new Date();

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 25) {
          doc.addPage();
          y = margin;
          addFooter();
        }
      };

      const addFooter = () => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`${companyName} — Compliance Report — Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.text(`Generated: ${reportDate}`, pageWidth / 2, pageHeight - 6, { align: "center" });
      };

      // ── Title Page ──
      doc.setFontSize(28);
      doc.setTextColor(30);
      doc.text("Compliance Report", pageWidth / 2, 60, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text(companyName, pageWidth / 2, 72, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(130);
      doc.text(`Generated: ${reportDate}`, pageWidth / 2, 84, { align: "center" });
      doc.text(`Prepared by: ${generatedBy}`, pageWidth / 2, 91, { align: "center" });

      // Sections included
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Sections Included:", pageWidth / 2, 108, { align: "center" });
      const includedLabels = SECTIONS.filter(s => selectedSections.has(s.id)).map(s => s.label);
      doc.text(includedLabels.join("  •  "), pageWidth / 2, 115, { align: "center" });

      // Disclaimer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("This report is generated for insurance and regulatory audit purposes.", pageWidth / 2, 135, { align: "center" });
      doc.text("All data is sourced from the company's compliance management system.", pageWidth / 2, 140, { align: "center" });

      addFooter();

      // ── Helper: Section Header ──
      const addSectionHeader = (title: string) => {
        doc.addPage();
        y = margin;
        doc.setFontSize(18);
        doc.setTextColor(30);
        doc.text(title, margin, y);
        y += 4;
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
        addFooter();
      };

      // ── Helper: Table Header ──
      const addTableHeader = (cols: { label: string; x: number; width: number }[]) => {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, contentWidth, 8, "F");
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.setFont("helvetica", "bold");
        cols.forEach(col => {
          doc.text(col.label, col.x, y, { maxWidth: col.width });
        });
        doc.setFont("helvetica", "normal");
        y += 8;
      };

      // ── Helper: Table Row ──
      const addTableRow = (values: string[], cols: { x: number; width: number }[], highlight?: boolean) => {
        checkPageBreak(8);
        if (highlight) {
          doc.setFillColor(254, 242, 242);
          doc.rect(margin, y - 4, contentWidth, 7, "F");
        }
        doc.setFontSize(8);
        doc.setTextColor(50);
        values.forEach((val, i) => {
          doc.text(val || "—", cols[i].x, y, { maxWidth: cols[i].width });
        });
        y += 7;
      };

      // ══════════════════════════════════════════
      // SECTION 1: Employee Certifications
      // ══════════════════════════════════════════
      if (selectedSections.has("certifications")) {
        addSectionHeader("Employee Certifications");

        const allCerts = certs || [];
        const activeCerts = allCerts.filter(c => c.certification_status === "active");
        const expiredCerts = allCerts.filter(c => c.certification_status === "expired");
        const totalEmployees = employees?.length || 0;
        const certifiedEmployeeIds = new Set(activeCerts.map(c => c.employee_id));

        // Summary
        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text(`Total Employees: ${totalEmployees}`, margin, y);
        y += 6;
        doc.text(`Certified Employees: ${certifiedEmployeeIds.size} (${totalEmployees > 0 ? Math.round((certifiedEmployeeIds.size / totalEmployees) * 100) : 0}%)`, margin, y);
        y += 6;
        doc.text(`Active Certifications: ${activeCerts.length}`, margin, y);
        y += 6;
        doc.text(`Expired Certifications: ${expiredCerts.length}`, margin, y);
        y += 12;

        if (allCerts.length > 0) {
          const cols = [
            { label: "Employee", x: margin, width: 40 },
            { label: "Certification", x: margin + 42, width: 45 },
            { label: "Status", x: margin + 89, width: 20 },
            { label: "Issued", x: margin + 111, width: 28 },
            { label: "Expires", x: margin + 141, width: 28 },
          ];
          addTableHeader(cols);

          allCerts.forEach(cert => {
            const isExpired = cert.expiration_date && isBefore(new Date(cert.expiration_date), now);
            addTableRow([
              (cert.employees as { name: string } | null)?.name || "Unknown",
              cert.certification_name,
              cert.certification_status,
              cert.issued_date ? format(new Date(cert.issued_date), "MMM d, yyyy") : "—",
              cert.expiration_date ? format(new Date(cert.expiration_date), "MMM d, yyyy") : "—",
            ], cols, isExpired);
          });
        } else {
          doc.setFontSize(10);
          doc.setTextColor(130);
          doc.text("No certification records found.", margin, y);
        }
      }

      // ══════════════════════════════════════════
      // SECTION 2: Equipment Inspections
      // ══════════════════════════════════════════
      if (selectedSections.has("inspections")) {
        addSectionHeader("Equipment Inspections");

        const allInspections = (inspectionData || []) as { inspection_status: string; next_due_date: string | null; products: { name: string } | null; inspection_date: string; notes: string | null }[];
        const passCount = allInspections.filter(i => i.inspection_status === "pass").length;
        const failCount = allInspections.filter(i => i.inspection_status === "fail").length;
        const repairCount = allInspections.filter(i => i.inspection_status === "needs_repair").length;

        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text(`Total Inspections: ${allInspections.length}`, margin, y);
        y += 6;
        doc.text(`Passed: ${passCount}  |  Failed: ${failCount}  |  Needs Repair: ${repairCount}`, margin, y);
        y += 12;

        if (allInspections.length > 0) {
          const cols = [
            { label: "Equipment", x: margin, width: 40 },
            { label: "Date", x: margin + 42, width: 28 },
            { label: "Status", x: margin + 72, width: 24 },
            { label: "Next Due", x: margin + 98, width: 28 },
            { label: "Notes", x: margin + 128, width: 42 },
          ];
          addTableHeader(cols);

          allInspections.forEach(ins => {
            const isFail = ins.inspection_status === "fail" || ins.inspection_status === "needs_repair";
            addTableRow([
              ins.products?.name || "Equipment",
              format(new Date(ins.inspection_date), "MMM d, yyyy"),
              ins.inspection_status === "needs_repair" ? "Needs Repair" : ins.inspection_status === "pass" ? "Pass" : "Fail",
              ins.next_due_date ? format(new Date(ins.next_due_date), "MMM d, yyyy") : "—",
              ins.notes?.substring(0, 50) || "—",
            ], cols, isFail);
          });
        } else {
          doc.setFontSize(10);
          doc.setTextColor(130);
          doc.text("No inspection records found.", margin, y);
        }
      }

      // ══════════════════════════════════════════
      // SECTION 3: Insurance Policies
      // ══════════════════════════════════════════
      if (selectedSections.has("insurance")) {
        addSectionHeader("Insurance Policies");

        const pols = (insurancePolicies || []) as { provider: string; policy_number: string; coverage_amount: number; effective_date: string; expiration_date: string }[];
        const activePols = pols.filter(p => !isBefore(new Date(p.expiration_date), now));
        const expiredPols = pols.filter(p => isBefore(new Date(p.expiration_date), now));
        const totalCoverage = pols.reduce((s, p) => s + Number(p.coverage_amount || 0), 0);

        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text(`Total Policies: ${pols.length}  (Active: ${activePols.length}, Expired: ${expiredPols.length})`, margin, y);
        y += 6;
        doc.text(`Total Coverage: $${totalCoverage.toLocaleString()}`, margin, y);
        y += 12;

        if (pols.length > 0) {
          const cols = [
            { label: "Provider", x: margin, width: 35 },
            { label: "Policy #", x: margin + 37, width: 30 },
            { label: "Coverage", x: margin + 69, width: 28 },
            { label: "Effective", x: margin + 99, width: 28 },
            { label: "Expires", x: margin + 129, width: 28 },
            { label: "Status", x: margin + 159, width: 15 },
          ];
          addTableHeader(cols);

          pols.forEach(p => {
            const isExpired = isBefore(new Date(p.expiration_date), now);
            addTableRow([
              p.provider,
              p.policy_number,
              `$${Number(p.coverage_amount).toLocaleString()}`,
              format(new Date(p.effective_date), "MMM d, yyyy"),
              format(new Date(p.expiration_date), "MMM d, yyyy"),
              isExpired ? "EXPIRED" : "Active",
            ], cols, isExpired);
          });
        } else {
          doc.setFontSize(10);
          doc.setTextColor(130);
          doc.text("No insurance policies on file.", margin, y);
        }
      }

      // ══════════════════════════════════════════
      // SECTION 4: Incident Reports
      // ══════════════════════════════════════════
      if (selectedSections.has("incidents")) {
        addSectionHeader("Incident Reports");

        const allIncidents = incidents || [];

        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text(`Total Incident Reports: ${allIncidents.length}`, margin, y);
        y += 12;

        if (allIncidents.length > 0) {
          const cols = [
            { label: "Date", x: margin, width: 28 },
            { label: "Event", x: margin + 30, width: 45 },
            { label: "Description", x: margin + 77, width: 93 },
          ];
          addTableHeader(cols);

          allIncidents.forEach(inc => {
            addTableRow([
              format(new Date(inc.date_reported), "MMM d, yyyy"),
              (inc.events as { title: string } | null)?.title || "—",
              (inc.description || "").substring(0, 100),
            ], cols);
          });
        } else {
          doc.setFontSize(10);
          doc.setTextColor(130);
          doc.text("No incident reports filed.", margin, y);
        }
      }

      // Save
      const filename = `compliance-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      toast({ title: "Report downloaded", description: filename });
      setOpen(false);
    } catch (err: any) {
      console.error("Report generation error:", err);
      toast({ title: "Error generating report", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText size={14} className="mr-1.5" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Compliance Report Generator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Select the sections to include in your compliance report. The report will be exported as a PDF suitable for insurance or regulatory audits.
          </p>
          <div className="space-y-3">
            {SECTIONS.map(section => (
              <label
                key={section.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedSections.has(section.id)}
                  onCheckedChange={() => toggleSection(section.id)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </label>
            ))}
          </div>
          <Button
            onClick={generateReport}
            disabled={generating || selectedSections.size === 0}
            className="w-full"
          >
            {generating ? (
              <><Loader2 size={14} className="mr-1.5 animate-spin" />Generating...</>
            ) : (
              <><Download size={14} className="mr-1.5" />Download PDF Report</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplianceReportGenerator;
