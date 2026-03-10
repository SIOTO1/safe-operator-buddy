import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeads, createLead } from "@/lib/crm/leadService";
import LeadCard from "@/components/crm/LeadCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

const LeadsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", source: "", status: "new" });

  const { data: leads = [], isLoading } = useQuery({ queryKey: ["crm-leads"], queryFn: getLeads });

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      setDialogOpen(false);
      setForm({ name: "", email: "", phone: "", company: "", source: "", status: "new" });
      toast.success("Lead created");
    },
    onError: () => toast.error("Failed to create lead"),
  });

  const filtered = leads.filter((l) =>
    [l.name, l.email, l.company].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = () => {
    if (!form.name || !form.email) return toast.error("Name and email are required");
    createMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company || undefined,
      source: form.source || undefined,
      status: form.status,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-2" />Add Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>Create Lead</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No leads found.</p>}
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
