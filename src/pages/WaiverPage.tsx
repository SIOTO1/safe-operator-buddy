import { useState, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { contractTemplates } from "@/lib/contractTemplates";
import { FileSignature, Download, RotateCcw, Save, Loader2 } from "lucide-react";
import DatePicker from "@/components/DatePicker";
import jsPDF from "jspdf";

const WaiverPage = () => {
  const { orgName } = useOrgSettings();
  const { companyId, workspaceId } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guardianCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<"participant" | "guardian" | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [eventDate, setEventDate] = useState<Date>();
  const [dateOfBirth, setDateOfBirth] = useState<Date>();

  const [form, setForm] = useState({
    participantName: "",
    email: "",
    phone: "",
    isMinor: false,
    guardianName: "",
    guardianRelationship: "",
    equipmentType: "",
    eventLocation: "",
    medicalConditions: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    ackRisks: false,
    ackRules: false,
    ackMediaRelease: false,
    ackIndemnity: false,
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // --- Signature drawing ---
  const getCtx = (type: "participant" | "guardian") => {
    const canvas = type === "participant" ? canvasRef.current : guardianCanvasRef.current;
    return canvas?.getContext("2d") ?? null;
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>, type: "participant" | "guardian") => {
    setIsDrawing(true);
    setActiveCanvas(type);
    const ctx = getCtx(type);
    if (!ctx) return;
    const rect = e.currentTarget.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeCanvas) return;
    const ctx = getCtx(activeCanvas);
    if (!ctx) return;
    const rect = e.currentTarget.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(0 0% 8%)";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
    setActiveCanvas(null);
  };

  const clearSignature = (type: "participant" | "guardian") => {
    const canvas = type === "participant" ? canvasRef.current : guardianCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((ch, i) => i % 4 === 3 && ch !== 0);
  };

  const selectedTemplate = contractTemplates.find((t) => t.id === form.equipmentType);

  const canSubmit =
    form.participantName &&
    dateOfBirth &&
    form.equipmentType &&
    eventDate &&
    form.ackRisks &&
    form.ackRules &&
    form.ackIndemnity &&
    !isCanvasBlank(canvasRef.current) &&
    (!form.isMinor || (form.guardianName && !isCanvasBlank(guardianCanvasRef.current)));

  /* ── Save waiver to Supabase ── */
  const saveToDb = async () => {
    if (!companyId) {
      toast.error("Company not found. Please log in again.");
      return null;
    }
    setSaving(true);
    try {
      const signatureData = canvasRef.current?.toDataURL("image/png") || null;
      const guardianSignatureData = form.isMinor ? (guardianCanvasRef.current?.toDataURL("image/png") || null) : null;

      const { data, error } = await supabase.from("waivers").insert({
        company_id: companyId,
        workspace_id: workspaceId,
        participant_name: form.participantName,
        participant_age: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
        participant_email: form.email || null,
        participant_phone: form.phone || null,
        guardian_name: form.isMinor ? form.guardianName : null,
        guardian_relationship: form.isMinor ? form.guardianRelationship : null,
        event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : null,
        event_location: form.eventLocation || null,
        equipment_types: form.equipmentType ? [form.equipmentType] : [],
        signature_data: signatureData,
        guardian_signature_data: guardianSignatureData,
        acknowledged_risks: form.ackRisks,
        acknowledged_rules: form.ackRules,
        acknowledged_medical: form.ackIndemnity,
      }).select().single();

      if (error) throw error;
      setSavedId(data.id);
      toast.success("Waiver saved to database");
      return data.id;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save waiver");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    if (!canSubmit) {
      toast.error("Please fill all required fields and sign.");
      return;
    }

    const doc = new jsPDF();
    const companyName = orgName || "SIOTO.AI";
    let y = 20;

    const addText = (text: string, size = 10, bold = false) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, 170);
      if (y + lines.length * (size * 0.5) > 275) { doc.addPage(); y = 20; }
      doc.text(lines, 20, y);
      y += lines.length * (size * 0.5) + 4;
    };

    const eventDateStr = eventDate ? format(eventDate, "PPP") : "N/A";
    const dobStr = dateOfBirth ? format(dateOfBirth, "PPP") : "N/A";

    addText(companyName, 18, true);
    addText("LIABILITY WAIVER & ASSUMPTION OF RISK", 14, true);
    y += 4;

    addText(`Equipment Type: ${selectedTemplate?.label || form.equipmentType}`, 11, true);
    addText(`Event Date: ${eventDateStr}`);
    addText(`Event Location: ${form.eventLocation || "N/A"}`);
    y += 4;

    addText("PARTICIPANT INFORMATION", 12, true);
    addText(`Name: ${form.participantName}`);
    addText(`Date of Birth: ${dobStr}`);
    addText(`Email: ${form.email || "N/A"}`);
    addText(`Phone: ${form.phone || "N/A"}`);
    if (form.medicalConditions) addText(`Medical Conditions: ${form.medicalConditions}`);
    addText(`Emergency Contact: ${form.emergencyContactName || "N/A"} — ${form.emergencyContactPhone || "N/A"}`);
    y += 4;

    if (form.isMinor && form.guardianName) {
      addText("PARENT/GUARDIAN INFORMATION", 12, true);
      addText(`Guardian Name: ${form.guardianName}`);
      addText(`Relationship: ${form.guardianRelationship || "N/A"}`);
      y += 4;
    }

    addText("ASSUMPTION OF RISK", 12, true);
    addText(
      `I, ${form.participantName}, acknowledge that participation in activities involving ${selectedTemplate?.label || "rental equipment"} carries inherent risks including but not limited to physical injury, falls, collisions, sprains, fractures, concussions, and in rare cases, serious injury or death. I voluntarily assume all risks associated with participation.`
    );
    y += 2;

    if (selectedTemplate) {
      addText("SAFETY RULES & GUIDELINES", 12, true);
      selectedTemplate.terms.forEach((term, i) => addText(`${i + 1}. ${term}`));
      y += 2;
    }

    addText("INDEMNIFICATION & HOLD HARMLESS", 12, true);
    if (selectedTemplate) {
      addText(selectedTemplate.indemnity);
    } else {
      addText(`I agree to indemnify, defend, and hold harmless ${companyName}, its owners, employees, and agents from any claims arising from my participation.`);
    }
    y += 2;

    if (form.ackMediaRelease) {
      addText("MEDIA RELEASE", 12, true);
      addText(`I grant ${companyName} permission to use photographs and video taken during the event for promotional purposes.`);
      y += 2;
    }

    addText("ACKNOWLEDGMENTS", 12, true);
    addText("✓ I acknowledge the inherent risks of participation.");
    addText("✓ I agree to follow all safety rules and operator instructions.");
    addText("✓ I accept the indemnification and hold harmless terms above.");
    if (form.ackMediaRelease) addText("✓ I consent to the media release.");
    y += 6;

    addText("PARTICIPANT SIGNATURE", 12, true);
    if (canvasRef.current) {
      const sigData = canvasRef.current.toDataURL("image/png");
      if (y + 30 > 275) { doc.addPage(); y = 20; }
      doc.addImage(sigData, "PNG", 20, y, 80, 25);
      y += 30;
    }
    addText(`Date: ${new Date().toLocaleDateString()}`);
    y += 4;

    if (form.isMinor && guardianCanvasRef.current) {
      addText("PARENT/GUARDIAN SIGNATURE", 12, true);
      const guardSig = guardianCanvasRef.current.toDataURL("image/png");
      if (y + 30 > 275) { doc.addPage(); y = 20; }
      doc.addImage(guardSig, "PNG", 20, y, 80, 25);
      y += 30;
      addText(`Guardian: ${form.guardianName}`);
      addText(`Date: ${new Date().toLocaleDateString()}`);
    }

    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(120);
    const footer = doc.splitTextToSize(
      `This waiver was generated by ${companyName}. This document should be reviewed by a licensed attorney in your jurisdiction. Generated on ${new Date().toLocaleString()}.`,
      170
    );
    if (y + 10 > 275) { doc.addPage(); y = 20; }
    doc.text(footer, 20, y);

    doc.save(`Waiver_${form.participantName.replace(/\s+/g, "_")}_${eventDate ? format(eventDate, "yyyy-MM-dd") : "undated"}.pdf`);
    toast.success("Waiver Generated — PDF downloaded successfully.");
  };

  /* ── Save to DB then generate PDF ── */
  const handleSaveAndGenerate = async () => {
    if (!canSubmit) {
      toast.error("Please fill all required fields and sign.");
      return;
    }
    await saveToDb();
    generatePDF();
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSignature className="text-primary" size={28} />
          Liability Waiver
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Digital waiver for event participants. All fields marked * are required.
        </p>
      </div>

      {/* Equipment & Event */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Equipment Type *</Label>
              <Select value={form.equipmentType} onValueChange={(v) => update("equipmentType", v)}>
                <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent>
                  {contractTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <DatePicker value={eventDate} onChange={setEventDate} placeholder="Select event date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Event Location</Label>
            <Input value={form.eventLocation} onChange={(e) => update("eventLocation", e.target.value)} placeholder="Address or venue name" />
          </div>
        </CardContent>
      </Card>

      {/* Participant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Participant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.participantName} onChange={(e) => update("participantName", e.target.value)} placeholder="Participant full name" />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <DatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                placeholder="Select date of birth"
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Medical Conditions / Allergies</Label>
            <Textarea value={form.medicalConditions} onChange={(e) => update("medicalConditions", e.target.value)} placeholder="List any conditions the operator should be aware of" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact Phone</Label>
              <Input type="tel" value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Minor / Guardian */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Minor Participant</CardTitle>
          <CardDescription>Check if participant is under 18 years old.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.isMinor} onCheckedChange={(v) => update("isMinor", !!v)} id="isMinor" />
            <Label htmlFor="isMinor">Participant is a minor (under 18)</Label>
          </div>
          {form.isMinor && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Parent/Guardian Name *</Label>
                <Input value={form.guardianName} onChange={(e) => update("guardianName", e.target.value)} placeholder="Full legal name" />
              </div>
              <div className="space-y-2">
                <Label>Relationship to Participant</Label>
                <Input value={form.guardianRelationship} onChange={(e) => update("guardianRelationship", e.target.value)} placeholder="e.g. Mother, Father, Legal Guardian" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Acknowledgments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acknowledgment of Risks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTemplate && (
            <div className="bg-accent/50 border border-border rounded-lg p-4 text-sm space-y-2">
              <p className="font-semibold text-accent-foreground">Safety rules for {selectedTemplate.label}:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                {selectedTemplate.safetyNotes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox checked={form.ackRisks} onCheckedChange={(v) => update("ackRisks", !!v)} id="ackRisks" />
              <Label htmlFor="ackRisks" className="leading-snug">
                I acknowledge that participation involves inherent risks including physical injury, and I voluntarily assume all such risks. *
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={form.ackRules} onCheckedChange={(v) => update("ackRules", !!v)} id="ackRules" />
              <Label htmlFor="ackRules" className="leading-snug">
                I agree to follow all safety rules, posted guidelines, and operator instructions at all times. *
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={form.ackIndemnity} onCheckedChange={(v) => update("ackIndemnity", !!v)} id="ackIndemnity" />
              <Label htmlFor="ackIndemnity" className="leading-snug">
                I agree to the indemnification, hold harmless, and assumption of risk terms described in this waiver. *
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={form.ackMediaRelease} onCheckedChange={(v) => update("ackMediaRelease", !!v)} id="ackMedia" />
              <Label htmlFor="ackMedia" className="leading-snug">
                I consent to the use of photographs/video taken during the event for promotional purposes. (Optional)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Digital Signature</CardTitle>
          <CardDescription>Sign below using your mouse or finger.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Participant Signature *</Label>
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={(e) => startDraw(e, "participant")}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => clearSignature("participant")}>
              <RotateCcw size={14} className="mr-1" /> Clear
            </Button>
          </div>

          {form.isMinor && (
            <div className="space-y-2">
              <Label>Parent/Guardian Signature *</Label>
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <canvas
                  ref={guardianCanvasRef}
                  width={500}
                  height={120}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={(e) => startDraw(e, "guardian")}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => clearSignature("guardian")}>
                <RotateCcw size={14} className="mr-1" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSaveAndGenerate} size="lg" className="flex-1" disabled={!canSubmit || saving}>
          {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
          {saving ? "Saving..." : savedId ? "Saved ✓ — Download Again" : "Save & Download Waiver"}
        </Button>
        <Button onClick={generatePDF} size="lg" variant="outline" className="flex-1" disabled={!canSubmit}>
          <Download size={18} className="mr-2" />
          PDF Only
        </Button>
      </div>
    </div>
  );
};

export default WaiverPage;
