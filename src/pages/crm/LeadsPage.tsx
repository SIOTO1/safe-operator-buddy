import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeads, createLead } from "@/lib/crm/leadService";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import LeadCard from "@/components/crm/LeadCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

const LEAD_SOURCES = ["Website", "Phone Inquiry", "Training Inquiry", "Certification Inquiry", "Referral", "Manual Entry", "Other"] as const;

const emptyForm = { name: "", email: "", phone: "", company: "", source: "", stage: "new" };

const LeadsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { basePath } = useCompanySlug();
  const { can, crmRoleLabel, userId, companyId, workspaceId } = useCrmPermissions();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: leads = [], isLoading } = useQuery({ queryKey: ["crm-leads", workspaceId], queryFn: () => getLeads(workspaceId) });

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Lead created successfully");
    },
    onError: () => toast.error("Failed to create lead"),
  });

  // Sales Reps only see their assigned leads
  const visibleLeads = can("view_all_leads")
    ? leads
    : leads.filter((l) => l.assigned_to === userId);

  const filtered = visibleLeads
    .filter((l) => sourceFilter === "all" || (l.source || "").toLowerCase() === sourceFilter.toLowerCase())
    .filter((l) =>
      [l.name, l.email, l.company].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
    );

  const handleCreate = () => {
    if (!form.name) return toast.error("Name is required");
    createMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      company: form.company || undefined,
      source: form.source || undefined,
      stage: form.stage,
      assigned_to: userId,
      company_id: companyId,
      workspace_id: workspaceId,
    } as any);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Leads</h1>
          <Badge variant="outline" className="text-xs">{crmRoleLabel}</Badge>
        </div>
        {can("create_lead") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" />New Lead</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input type="tel" placeholder="(555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Lead Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={(l) => navigate(`${basePath}/crm/leads/${l.id}`)} />)}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No leads found.</p>}
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
