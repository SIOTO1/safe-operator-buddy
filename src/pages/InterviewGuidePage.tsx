import { useState, useRef } from "react";
import { Sparkles, Download, FileText, Briefcase, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";

const SAMPLE_DESCRIPTIONS: Record<string, string> = {
  driver: `Delivery Driver / Setup Technician

Responsibilities:
- Drive box trucks and pull trailers to event locations
- Load and unload inflatable equipment (bounce houses, water slides, obstacle courses)
- Set up and anchor inflatables per manufacturer guidelines
- Perform pre-trip vehicle inspections
- Communicate with customers on-site regarding placement and safety rules
- Maintain clean and organized truck and warehouse
- Work weekends, holidays, and some evenings

Requirements:
- Valid driver's license (CDL preferred but not required)
- Ability to lift 75+ lbs repeatedly
- Clean driving record
- Professional appearance and customer service skills
- Ability to work in all weather conditions`,

  sales: `Sales Consultant / Event Coordinator

Responsibilities:
- Handle inbound inquiries via phone, email, and website
- Consult with customers on equipment selection for their events
- Create quotes and process reservations
- Upsell additional equipment and services
- Follow up on leads and abandoned quotes
- Coordinate delivery schedules with operations team
- Handle customer complaints and resolve issues

Requirements:
- Previous sales or customer service experience
- Knowledge of event planning (preferred)
- Strong communication and organizational skills
- Proficiency with CRM and booking software
- Ability to work Saturdays during peak season`,

  operations: `Operations Manager

Responsibilities:
- Oversee daily delivery and pickup schedules
- Manage warehouse inventory and equipment maintenance
- Supervise and train delivery crews
- Ensure compliance with safety standards and SOPs
- Handle escalated customer issues
- Manage vehicle fleet maintenance and inspections
- Implement process improvements for efficiency

Requirements:
- 3+ years management experience (event rental industry preferred)
- Strong leadership and problem-solving skills
- CDL or willingness to obtain
- Knowledge of inflatable safety standards
- Budget management experience
- Available for weekend oversight during peak season`,
};

const InterviewGuidePage = () => {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [guide, setGuide] = useState("");
  const [generating, setGenerating] = useState(false);
  const { orgName } = useOrgSettings();
  const { toast } = useToast();
  const guideRef = useRef<HTMLDivElement>(null);

  const loadSample = (key: string) => {
    const desc = SAMPLE_DESCRIPTIONS[key];
    const title = desc.split("\n")[0].trim();
    setJobTitle(title);
    setJobDescription(desc);
    setGuide("");
  };

  const generateGuide = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      toast({ title: "Missing info", description: "Please enter a job title and description.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGuide("");

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-interview-guide`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            jobTitle: jobTitle.trim(),
            jobDescription: jobDescription.trim(),
            companyName: orgName || "Your Company",
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setGuide(accumulated);
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      if (!accumulated) {
        toast({ title: "No content generated", description: "Please try again.", variant: "destructive" });
      }
    } catch (e: any) {
      console.error("Interview guide error:", e);
      toast({ title: "Generation failed", description: e.message || "Could not generate guide.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!guide) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(orgName || "SIOTO.AI", margin, y);
    doc.text("Interview Guide", pageWidth - margin, y, { align: "right" });
    y += 12;

    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text(`Interview Guide: ${jobTitle}`, margin, y, { maxWidth });
    y += 10;

    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(40);

    const lines = guide.split("\n");
    for (const line of lines) {
      const cleaned = line.replace(/^#{1,4}\s/, "").replace(/\*\*/g, "").replace(/^- /, "• ");
      if (y > 270) { doc.addPage(); y = 20; }

      if (line.startsWith("## ") || line.startsWith("# ")) {
        y += 4;
        doc.setFontSize(12);
        doc.setTextColor(30);
        doc.setFont("helvetica", "bold");
        const wrapped = doc.splitTextToSize(cleaned, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 6 + 2;
        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.setFont("helvetica", "normal");
      } else if (line.startsWith("### ")) {
        y += 2;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const wrapped = doc.splitTextToSize(cleaned, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5.5 + 2;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
      } else if (cleaned.trim()) {
        const wrapped = doc.splitTextToSize(cleaned, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5;
      } else {
        y += 3;
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(170);
    doc.text(`Generated by ${orgName || "SIOTO.AI"} — ${new Date().toLocaleDateString()}`, margin, 285);
    doc.save(`Interview_Guide_${jobTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Interview Guide Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste a job description and AI will generate a tailored interview guide with scoring rubric
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Briefcase size={18} className="text-primary" /> Job Details
            </h2>

            {/* Quick-fill templates */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick-fill a sample role:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "driver", label: "Driver / Setup Tech" },
                  { key: "sales", label: "Sales Consultant" },
                  { key: "operations", label: "Operations Manager" },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => loadSample(s.key)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:border-primary transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Job Title</label>
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g., Delivery Driver, Sales Consultant, Operations Manager"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Job Description</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here — include responsibilities, requirements, qualifications, and any special notes..."
                rows={12}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <Button
              onClick={generateGuide}
              disabled={generating}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <><Loader2 size={18} className="animate-spin" /> Generating Guide...</>
              ) : (
                <><Sparkles size={18} /> Generate Interview Guide</>
              )}
            </Button>
          </div>
        </div>

        {/* Output Panel */}
        <div>
          <AnimatePresence mode="wait">
            {guide ? (
              <motion.div
                key="guide"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border-2 border-primary/20 bg-card p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                    <ClipboardList size={18} className="text-primary" /> Interview Guide
                  </h2>
                  <Button size="sm" variant="outline" onClick={downloadPDF} className="gap-1.5">
                    <Download size={14} /> Download PDF
                  </Button>
                </div>

                <div ref={guideRef} className="prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-display font-bold mt-6 mb-3 text-foreground">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-display font-bold mt-5 mb-2 text-foreground">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1 text-foreground">{children}</h3>,
                      p: ({ children }) => <p className="text-sm text-muted-foreground mb-2">{children}</p>,
                      li: ({ children }) => <li className="text-sm text-muted-foreground ml-4">{children}</li>,
                      strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                      table: ({ children }) => <table className="w-full text-xs border-collapse my-3">{children}</table>,
                      th: ({ children }) => <th className="border border-border bg-muted px-2 py-1.5 text-left font-semibold text-foreground">{children}</th>,
                      td: ({ children }) => <td className="border border-border px-2 py-1.5 text-muted-foreground">{children}</td>,
                    }}
                  >
                    {guide}
                  </ReactMarkdown>
                </div>

                {generating && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Still generating...
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-border bg-muted/30 p-12 flex flex-col items-center justify-center text-center h-full min-h-[500px]"
              >
                <ClipboardList size={48} className="text-muted-foreground/30 mb-4" />
                <h3 className="font-display font-semibold text-muted-foreground">Interview Guide Preview</h3>
                <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
                  Enter a job description and click generate to create a tailored interview guide with scoring rubric
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default InterviewGuidePage;
