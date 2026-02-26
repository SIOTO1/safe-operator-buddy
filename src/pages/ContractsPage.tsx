import { useState } from "react";
import { format } from "date-fns";
import { FileText, Download, MapPin, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { contractTemplates, ContractTemplate } from "@/lib/contractTemplates";
import DatePicker from "@/components/DatePicker";
import jsPDF from "jspdf";

const ContractsPage = () => {
  const { toast } = useToast();
  const { orgName } = useOrgSettings();
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate>(contractTemplates[0]);
  const [eventDate, setEventDate] = useState<Date>();
  const [formData, setFormData] = useState({
    customerName: "",
    eventType: "",
    numberOfUnits: "1",
    location: "",
    setupTime: "",
    takedownTime: "",
  });
  const [generated, setGenerated] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    if (!formData.customerName || !eventDate) return;
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

      const eventDateStr = eventDate ? format(eventDate, "PPP") : "";

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, pageWidth / 2, y, { align: "center" });
      y += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Safety & Operations", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`RENTAL AGREEMENT — ${selectedTemplate.label.toUpperCase()}`, pageWidth / 2, y, { align: "center" });
      y += 4;
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      const details = [
        ["Customer", formData.customerName],
        ["Equipment Type", selectedTemplate.label],
        ["Number of Units", formData.numberOfUnits],
        ["Event Date", eventDateStr],
        ["Location", formData.location],
        ["Setup Time", formData.setupTime],
        ["Takedown Time", formData.takedownTime],
      ];

      doc.setFontSize(10);
      for (const [label, value] of details) {
        if (!value) continue;
        doc.setFont("helvetica", "normal");
        doc.text(label + ":", margin + 5, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, 80, y);
        y += 8;
      }

      y += 6;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS & CONDITIONS", margin + 5, y);
      y += 7;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      selectedTemplate.terms.forEach((term, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${term}`, contentWidth - 10);
        if (y + lines.length * 4 > 270) { doc.addPage(); y = 20; }
        doc.text(lines, margin + 5, y);
        y += lines.length * 4 + 3;
      });

      y += 4;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("INDEMNIFICATION & HOLD HARMLESS", margin + 5, y);
      y += 7;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const indemnityLines = doc.splitTextToSize(selectedTemplate.indemnity, contentWidth - 10);
      if (y + indemnityLines.length * 4 > 270) { doc.addPage(); y = 20; }
      doc.text(indemnityLines, margin + 5, y);
      y += indemnityLines.length * 4 + 6;

      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("SAFETY NOTES", margin + 5, y);
      y += 7;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      selectedTemplate.safetyNotes.forEach(note => {
        const lines = doc.splitTextToSize(`• ${note}`, contentWidth - 10);
        if (y + lines.length * 4 > 270) { doc.addPage(); y = 20; }
        doc.text(lines, margin + 5, y);
        y += lines.length * 4 + 2;
      });

      y += 12;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.text("By signing below, the Client acknowledges reading, understanding, and agreeing to all terms, conditions, and indemnification provisions stated herein.", margin + 5, y, { maxWidth: contentWidth - 10 });
      y += 18;

      doc.line(margin + 5, y, 95, y);
      doc.text("Client Signature", margin + 20, y + 5);
      doc.line(110, y, 185, y);
      doc.text("Date", 140, y + 5);
      y += 16;
      doc.line(margin + 5, y, 95, y);
      doc.text("Printed Name", margin + 20, y + 5);
      doc.line(110, y, 185, y);
      doc.text("Operator Signature", 125, y + 5);

      const fileName = `${selectedTemplate.id}-agreement-${formData.customerName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      doc.save(fileName);
      toast({ title: "PDF Downloaded", description: `Saved as ${fileName}` });
    } catch {
      toast({ title: "Download Failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  const eventDateStr = eventDate ? format(eventDate, "PPP") : "";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Contract Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">Create equipment-specific rental agreements with your company branding</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">Equipment Type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {contractTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t); setGenerated(false); }}
                  className={`text-left p-3 rounded-lg border text-sm transition-all ${
                    selectedTemplate.id === t.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">Event Details</h2>

            {[
              { label: "Customer Name", field: "customerName", icon: User, type: "text", placeholder: "John Smith" },
              { label: "Number of Units", field: "numberOfUnits", icon: FileText, type: "number", placeholder: "1" },
              { label: "Location", field: "location", icon: MapPin, type: "text", placeholder: "123 Main St, City, State" },
              { label: "Setup Time", field: "setupTime", icon: Clock, type: "time", placeholder: "" },
              { label: "Takedown Time", field: "takedownTime", icon: Clock, type: "time", placeholder: "" },
            ].map((f) => (
              <div key={f.field}>
                <label className="text-sm font-medium mb-1.5 block">{f.label}</label>
                <div className="relative">
                  <f.icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={f.type}
                    value={formData[f.field as keyof typeof formData]}
                    onChange={e => handleChange(f.field, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Event Date</label>
              <DatePicker value={eventDate} onChange={setEventDate} placeholder="Select event date" />
            </div>

            <Button onClick={handleGenerate} className="w-full" size="lg">
              <FileText size={18} />
              Generate Contract
            </Button>
          </div>
        </div>

        <div>
          {generated ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border-2 border-primary/20 bg-card p-6 space-y-5 text-sm"
            >
              <div className="text-center border-b border-border pb-4">
                <h2 className="font-display font-bold text-lg text-primary">{orgName || "Your Company"}</h2>
                <p className="text-xs text-muted-foreground">Safety & Operations</p>
                <h3 className="font-display font-bold mt-3">RENTAL AGREEMENT — {selectedTemplate.label.toUpperCase()}</h3>
              </div>

              <div className="space-y-2">
                {[
                  ["Customer", formData.customerName],
                  ["Equipment", selectedTemplate.label],
                  ["Units", formData.numberOfUnits],
                  ["Date", eventDateStr],
                  ["Location", formData.location],
                  ["Setup", formData.setupTime],
                  ["Takedown", formData.takedownTime],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Terms & Conditions</h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {selectedTemplate.terms.slice(0, 3).map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                  {selectedTemplate.terms.length > 3 && (
                    <li className="text-primary font-medium">+ {selectedTemplate.terms.length - 3} more terms in PDF</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Indemnification</h4>
                <p className="text-xs text-muted-foreground line-clamp-3">{selectedTemplate.indemnity}</p>
                <p className="text-xs text-primary font-medium mt-1">Full text in PDF</p>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between">
                  <div className="border-b border-foreground w-36 pb-1 text-center text-xs">Client Signature</div>
                  <div className="border-b border-foreground w-36 pb-1 text-center text-xs">Date</div>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
                <Download size={16} />
                Download Full PDF
              </Button>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <FileText size={48} className="text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-semibold text-muted-foreground">Contract Preview</h3>
              <p className="text-sm text-muted-foreground/60 mt-1">Select an equipment type and fill in details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractsPage;
