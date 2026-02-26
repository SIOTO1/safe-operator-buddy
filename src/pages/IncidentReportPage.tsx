import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Download, MapPin, Clock, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import DatePicker from "@/components/DatePicker";
import jsPDF from "jspdf";

const IncidentReportPage = () => {
  const { toast } = useToast();
  const { orgName } = useOrgSettings();
  const [incidentDate, setIncidentDate] = useState<Date>();
  const [formData, setFormData] = useState({
    reporterName: "",
    reporterRole: "",
    time: "",
    location: "",
    equipmentType: "",
    equipmentId: "",
    injuredPerson: "",
    injuredAge: "",
    injuryDescription: "",
    circumstances: "",
    actionTaken: "",
    witnessName: "",
    witnessContact: "",
    weatherConditions: "",
    windSpeed: "",
    surfaceType: "",
    additionalNotes: "",
  });
  const [generated, setGenerated] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    if (!formData.reporterName || !incidentDate || !formData.circumstances) return;
    setGenerated(true);
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const companyName = orgName || "Your Company";
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const dateStr = incidentDate ? format(incidentDate, "PPP") : "";

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, pageWidth / 2, y, { align: "center" });
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(200, 50, 50);
      doc.text("INCIDENT REPORT", pageWidth / 2, y, { align: "center" });
      doc.setTextColor(0);
      y += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("CONFIDENTIAL — For Internal Use Only", pageWidth / 2, y, { align: "center" });
      y += 4;
      doc.setDrawColor(200, 50, 50);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      const addSection = (title: string, fields: [string, string][]) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 5, y);
        y += 7;
        doc.setFontSize(9);
        for (const [label, value] of fields) {
          if (!value) continue;
          doc.setFont("helvetica", "normal");
          doc.text(label + ":", margin + 5, y);
          doc.setFont("helvetica", "bold");
          const lines = doc.splitTextToSize(value, contentWidth - 75);
          doc.text(lines, 75, y);
          y += lines.length * 5 + 3;
        }
        y += 4;
      };

      addSection("REPORT INFORMATION", [
        ["Reporter", formData.reporterName],
        ["Role", formData.reporterRole],
        ["Date", dateStr],
        ["Time", formData.time],
        ["Location", formData.location],
      ]);

      addSection("EQUIPMENT DETAILS", [
        ["Equipment Type", formData.equipmentType],
        ["Equipment ID/Name", formData.equipmentId],
      ]);

      addSection("INCIDENT DETAILS", [
        ["Injured Person", formData.injuredPerson],
        ["Age", formData.injuredAge],
        ["Injury Description", formData.injuryDescription],
        ["Circumstances", formData.circumstances],
        ["Action Taken", formData.actionTaken],
      ]);

      addSection("WITNESS INFORMATION", [
        ["Witness Name", formData.witnessName],
        ["Witness Contact", formData.witnessContact],
      ]);

      addSection("ENVIRONMENTAL CONDITIONS", [
        ["Weather", formData.weatherConditions],
        ["Wind Speed", formData.windSpeed],
        ["Surface Type", formData.surfaceType],
      ]);

      if (formData.additionalNotes) {
        addSection("ADDITIONAL NOTES", [["Notes", formData.additionalNotes]]);
      }

      y += 10;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("I certify that the information provided is accurate to the best of my knowledge.", margin + 5, y);
      y += 14;

      doc.line(margin + 5, y, 95, y);
      doc.text("Reporter Signature", margin + 20, y + 5);
      doc.line(110, y, 185, y);
      doc.text("Date", 140, y + 5);

      const fileName = `incident-report-${incidentDate ? format(incidentDate, "yyyy-MM-dd") : "undated"}-${formData.reporterName.replace(/\s+/g, "-").toLowerCase() || "report"}.pdf`;
      doc.save(fileName);
      toast({ title: "Report Downloaded", description: `Saved as ${fileName}` });
    } catch {
      toast({ title: "Download Failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  const textInputFields = [
    { label: "Your Name", field: "reporterName", icon: User, placeholder: "Operator name" },
    { label: "Your Role", field: "reporterRole", icon: User, placeholder: "Owner, Manager, Crew..." },
    { label: "Incident Time", field: "time", icon: Clock, type: "time" as const, placeholder: "" },
    { label: "Location", field: "location", icon: MapPin, placeholder: "Event address" },
  ];

  const equipmentFields = [
    { label: "Equipment Type", field: "equipmentType", icon: FileText, placeholder: "Bounce house, water slide..." },
    { label: "Equipment ID / Name", field: "equipmentId", icon: FileText, placeholder: "Unit name or serial #" },
  ];

  const incidentFields = [
    { label: "Injured Person Name", field: "injuredPerson", icon: User, placeholder: "Name of injured party" },
    { label: "Injured Person Age", field: "injuredAge", icon: User, placeholder: "Age" },
    { label: "Injury Description", field: "injuryDescription", icon: AlertTriangle, placeholder: "Type and location of injury" },
  ];

  const envFields = [
    { label: "Weather Conditions", field: "weatherConditions", icon: FileText, placeholder: "Sunny, cloudy, windy..." },
    { label: "Wind Speed (mph)", field: "windSpeed", icon: FileText, placeholder: "Measured or estimated" },
    { label: "Surface Type", field: "surfaceType", icon: FileText, placeholder: "Grass, concrete, asphalt..." },
  ];

  const witnessFields = [
    { label: "Witness Name", field: "witnessName", icon: User, placeholder: "Full name" },
    { label: "Witness Contact", field: "witnessContact", icon: User, placeholder: "Phone or email" },
  ];

  const renderFieldGroup = (title: string, fields: typeof textInputFields, extra?: React.ReactNode) => (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="font-display font-semibold text-base">{title}</h2>
      {fields.map(f => (
        <div key={f.field}>
          <label className="text-sm font-medium mb-1 block">{f.label}</label>
          <div className="relative">
            <f.icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type={(f as any).type || "text"}
              value={formData[f.field as keyof typeof formData]}
              onChange={e => handleChange(f.field, e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      ))}
      {extra}
    </div>
  );

  const dateStr = incidentDate ? format(incidentDate, "PPP") : "";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <AlertTriangle className="text-destructive" size={24} />
          Incident Report
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Document incidents immediately — generate a professional PDF report</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl">
        <div className="space-y-4">
          {renderFieldGroup("Report Information", textInputFields, (
            <div>
              <label className="text-sm font-medium mb-1 block">Incident Date</label>
              <DatePicker value={incidentDate} onChange={setIncidentDate} placeholder="Select incident date" />
            </div>
          ))}
          {renderFieldGroup("Equipment Details", equipmentFields)}
          {renderFieldGroup("Incident Details", incidentFields)}
          {renderFieldGroup("Environmental Conditions", envFields)}
          {renderFieldGroup("Witness Information", witnessFields)}

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-display font-semibold text-base">Detailed Description</h2>
            <div>
              <label className="text-sm font-medium mb-1 block">What happened? (Circumstances)</label>
              <textarea
                value={formData.circumstances}
                onChange={e => handleChange("circumstances", e.target.value)}
                placeholder="Describe what happened leading up to and during the incident..."
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Action Taken</label>
              <textarea
                value={formData.actionTaken}
                onChange={e => handleChange("actionTaken", e.target.value)}
                placeholder="First aid administered, EMS called, equipment shut down..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Additional Notes</label>
              <textarea
                value={formData.additionalNotes}
                onChange={e => handleChange("additionalNotes", e.target.value)}
                placeholder="Any other relevant information..."
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <Button onClick={handleGenerate} className="w-full" size="lg" variant="destructive">
            <AlertTriangle size={18} />
            Generate Incident Report
          </Button>
        </div>

        <div>
          {generated ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border-2 border-destructive/30 bg-card p-6 space-y-4 text-sm"
            >
              <div className="text-center border-b border-border pb-4">
                <h2 className="font-display font-bold text-lg">{orgName || "Your Company"}</h2>
                <p className="text-destructive font-bold text-base mt-1">INCIDENT REPORT</p>
                <p className="text-xs text-muted-foreground">Confidential — For Internal Use Only</p>
              </div>

              {[
                { label: "Reporter", value: `${formData.reporterName}${formData.reporterRole ? ` (${formData.reporterRole})` : ""}` },
                { label: "Date/Time", value: `${dateStr}${formData.time ? ` at ${formData.time}` : ""}` },
                { label: "Location", value: formData.location },
                { label: "Equipment", value: `${formData.equipmentType}${formData.equipmentId ? ` — ${formData.equipmentId}` : ""}` },
                { label: "Injured", value: `${formData.injuredPerson}${formData.injuredAge ? `, age ${formData.injuredAge}` : ""}` },
                { label: "Injury", value: formData.injuryDescription },
                { label: "Conditions", value: `${formData.weatherConditions}${formData.windSpeed ? `, ${formData.windSpeed} mph wind` : ""}, ${formData.surfaceType}` },
              ].filter(f => f.value && f.value !== ", ").map(f => (
                <div key={f.label} className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-right max-w-[60%]">{f.value}</span>
                </div>
              ))}

              {formData.circumstances && (
                <div>
                  <h4 className="font-semibold mb-1">Circumstances</h4>
                  <p className="text-xs text-muted-foreground">{formData.circumstances}</p>
                </div>
              )}
              {formData.actionTaken && (
                <div>
                  <h4 className="font-semibold mb-1">Action Taken</h4>
                  <p className="text-xs text-muted-foreground">{formData.actionTaken}</p>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
                <Download size={16} />
                Download Incident Report PDF
              </Button>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <AlertTriangle size={48} className="text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-semibold text-muted-foreground">Incident Report Preview</h3>
              <p className="text-sm text-muted-foreground/60 mt-1">Fill in the details to generate a report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentReportPage;
