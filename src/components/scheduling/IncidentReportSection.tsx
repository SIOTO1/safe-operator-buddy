import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { AlertTriangle, Camera, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface IncidentReport {
  id: string;
  description: string;
  equipment_product_id: string | null;
  photo_urls: string[];
  reported_by_employee_id: string | null;
  reported_by_user_id: string;
  date_reported: string;
  created_at: string;
  employee_name?: string;
  product_name?: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface IncidentReportSectionProps {
  eventId: string;
  eventProducts: Product[];
}

export function IncidentReportSection({ eventId, eventProducts }: IncidentReportSectionProps) {
  const { user, role } = useAuth();
  const canManage = role === "owner" || role === "manager";

  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [form, setForm] = useState({
    description: "",
    equipment_product_id: "",
    reported_by_employee_id: "",
    date_reported: format(new Date(), "yyyy-MM-dd"),
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .eq("event_id", eventId)
        .order("date_reported", { ascending: false });

      if (error) throw error;

      // Fetch employee and product names for display
      const reports = (data || []) as IncidentReport[];
      const employeeIds = [...new Set(reports.map(r => r.reported_by_employee_id).filter(Boolean))] as string[];
      const productIds = [...new Set(reports.map(r => r.equipment_product_id).filter(Boolean))] as string[];

      const [empRes, prodRes] = await Promise.all([
        employeeIds.length > 0
          ? supabase.from("employees").select("id, name").in("id", employeeIds)
          : { data: [] },
        productIds.length > 0
          ? supabase.from("products").select("id, name").in("id", productIds)
          : { data: [] },
      ]);

      const empMap = new Map((empRes.data || []).map(e => [e.id, e.name]));
      const prodMap = new Map((prodRes.data || []).map(p => [p.id, p.name]));

      setReports(reports.map(r => ({
        ...r,
        employee_name: r.reported_by_employee_id ? empMap.get(r.reported_by_employee_id) : undefined,
        product_name: r.equipment_product_id ? prodMap.get(r.equipment_product_id) : undefined,
      })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load incident reports");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name")
      .eq("status", "active")
      .order("name");
    setEmployees((data || []) as Employee[]);
  }, []);

  useEffect(() => {
    fetchReports();
    fetchEmployees();
  }, [fetchReports, fetchEmployees]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photoFiles.length > 5) {
      toast.error("Maximum 5 photos per report");
      return;
    }
    setPhotoFiles(prev => [...prev, ...files]);
    const urls = files.map(f => URL.createObjectURL(f));
    setPhotoPreviewUrls(prev => [...prev, ...urls]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photoFiles) {
      const ext = file.name.split(".").pop();
      const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("incident-photos")
        .upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("incident-photos")
        .getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!form.description.trim()) return;
    setSubmitting(true);
    try {
      let photoUrls: string[] = [];
      if (photoFiles.length > 0) {
        setUploadingPhotos(true);
        photoUrls = await uploadPhotos();
        setUploadingPhotos(false);
      }

      const { error } = await supabase.from("incident_reports").insert({
        event_id: eventId,
        description: form.description.trim(),
        equipment_product_id: form.equipment_product_id || null,
        reported_by_employee_id: form.reported_by_employee_id || null,
        reported_by_user_id: user!.id,
        photo_urls: photoUrls,
        date_reported: form.date_reported,
      });

      if (error) throw error;
      toast.success("Incident report filed");
      setDialogOpen(false);
      setForm({ description: "", equipment_product_id: "", reported_by_employee_id: "", date_reported: format(new Date(), "yyyy-MM-dd") });
      setPhotoFiles([]);
      photoPreviewUrls.forEach(u => URL.revokeObjectURL(u));
      setPhotoPreviewUrls([]);
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to file incident report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Delete this incident report?")) return;
    try {
      const { error } = await supabase.from("incident_reports").delete().eq("id", reportId);
      if (error) throw error;
      toast.success("Incident report deleted");
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete report");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle size={16} className="text-destructive" />
          Incident Reports
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus size={14} className="mr-1" />
          Report Incident
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />Loading…
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No incidents reported for this event.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{report.description}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {report.product_name && (
                        <Badge variant="outline" className="text-[10px]">
                          🔧 {report.product_name}
                        </Badge>
                      )}
                      {report.employee_name && (
                        <Badge variant="secondary" className="text-[10px]">
                          👤 {report.employee_name}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        📅 {format(new Date(report.date_reported), "MMM d, yyyy")}
                      </Badge>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleDelete(report.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
                {report.photo_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {report.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Incident photo ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-md border border-border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* File Incident Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File Incident Report</DialogTitle>
            <DialogDescription>Document any damage, safety issues, or incidents.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the incident, damage, or safety concern…"
                rows={3}
              />
            </div>
            <div>
              <Label>Equipment Involved</Label>
              <Select
                value={form.equipment_product_id}
                onValueChange={(v) => setForm({ ...form, equipment_product_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select equipment (optional)" /></SelectTrigger>
                <SelectContent>
                  {eventProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reported By Employee</Label>
              <Select
                value={form.reported_by_employee_id}
                onValueChange={(v) => setForm({ ...form, reported_by_employee_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Reported</Label>
              <Input
                type="date"
                value={form.date_reported}
                onChange={(e) => setForm({ ...form, date_reported: e.target.value })}
              />
            </div>
            <div>
              <Label>Photos</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {photoPreviewUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-md border border-border" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photoFiles.length < 5 && (
                  <label className="w-16 h-16 border-2 border-dashed border-border rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Camera size={16} className="text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Up to 5 photos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.description.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" />
                  {uploadingPhotos ? "Uploading…" : "Saving…"}
                </>
              ) : (
                "File Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
