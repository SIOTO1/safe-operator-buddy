import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Circle, ClipboardCheck, AlertTriangle, ChevronDown, ChevronUp, Download, Plus, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";

interface ChecklistItem {
  id: string;
  label: string;
  sort_order: number;
  checked: boolean; // local state, derived from completions
}

interface Checklist {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

/* ── default seed checklists (shown when DB is empty) ── */
const defaultChecklists: Omit<Checklist, "id">[] = [
  {
    title: "Pre-Delivery Checklist",
    description: "Complete before leaving the warehouse",
    items: [
      { id: "s1", label: "Unit clean and dry", sort_order: 0, checked: false },
      { id: "s2", label: "All anchor straps present and intact", sort_order: 1, checked: false },
      { id: "s3", label: "Blower tested and operational", sort_order: 2, checked: false },
      { id: "s4", label: "Stakes/sandbags loaded in vehicle", sort_order: 3, checked: false },
      { id: "s5", label: "Extension cords (correct gauge) packed", sort_order: 4, checked: false },
      { id: "s6", label: "Ground tarp included", sort_order: 5, checked: false },
      { id: "s7", label: "Safety signage packed", sort_order: 6, checked: false },
      { id: "s8", label: "First aid kit in vehicle", sort_order: 7, checked: false },
    ],
  },
  {
    title: "Setup Checklist",
    description: "Complete during on-site installation",
    items: [
      { id: "s1", label: "Area inspected — clear of debris, holes, overhead wires", sort_order: 0, checked: false },
      { id: "s2", label: "Surface approved (grass, dirt, concrete w/ tarp)", sort_order: 1, checked: false },
      { id: "s3", label: "Unit unrolled and positioned correctly", sort_order: 2, checked: false },
      { id: "s4", label: "Blower connected and inflated", sort_order: 3, checked: false },
      { id: "s5", label: "All anchor points staked/sandbagged", sort_order: 4, checked: false },
      { id: "s6", label: "Safety perimeter established (6ft minimum)", sort_order: 5, checked: false },
      { id: "s7", label: "Electrical connections GFCI protected", sort_order: 6, checked: false },
      { id: "s8", label: "Wind speed checked (below 20 mph)", sort_order: 7, checked: false },
      { id: "s9", label: "Customer safety briefing completed", sort_order: 8, checked: false },
    ],
  },
  {
    title: "Wind Check Log",
    description: "Record wind readings during event",
    items: [
      { id: "s1", label: "Initial wind check recorded", sort_order: 0, checked: false },
      { id: "s2", label: "1-hour check recorded", sort_order: 1, checked: false },
      { id: "s3", label: "2-hour check recorded", sort_order: 2, checked: false },
      { id: "s4", label: "Wind speed within safe limits (<20 mph)", sort_order: 3, checked: false },
      { id: "s5", label: "Emergency deflation plan reviewed with crew", sort_order: 4, checked: false },
    ],
  },
  {
    title: "Post-Event Inspection",
    description: "Complete after every rental",
    items: [
      { id: "s1", label: "All riders exited unit", sort_order: 0, checked: false },
      { id: "s2", label: "Unit inspected for damage or tears", sort_order: 1, checked: false },
      { id: "s3", label: "Unit cleaned and sanitized", sort_order: 2, checked: false },
      { id: "s4", label: "All stakes/sandbags retrieved", sort_order: 3, checked: false },
      { id: "s5", label: "Cords and blower stored properly", sort_order: 4, checked: false },
      { id: "s6", label: "Unit folded and strapped", sort_order: 5, checked: false },
      { id: "s7", label: "Site restored to original condition", sort_order: 6, checked: false },
    ],
  },
  {
    title: "Incident Report Form",
    description: "Complete if any safety incident occurs",
    items: [
      { id: "s1", label: "Date, time, and location documented", sort_order: 0, checked: false },
      { id: "s2", label: "Description of incident written", sort_order: 1, checked: false },
      { id: "s3", label: "Witnesses identified and contacted", sort_order: 2, checked: false },
      { id: "s4", label: "Photos of scene taken", sort_order: 3, checked: false },
      { id: "s5", label: "Unit removed from service if damaged", sort_order: 4, checked: false },
      { id: "s6", label: "Owner/manager notified", sort_order: 5, checked: false },
    ],
  },
];

const ChecklistsPage = () => {
  const { role, companyId, workspaceId } = useAuth();
  const isManager = role === "owner" || role === "manager";

  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [usingSeeds, setUsingSeeds] = useState(false);

  /* ── create checklist dialog ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newItems, setNewItems] = useState<string[]>([""]);

  /* ── fetch checklists + items from DB ── */
  const fetchChecklists = async () => {
    const { data: clData, error: clErr } = await supabase
      .from("checklists")
      .select("*")
      .order("sort_order", { ascending: true });

    if (clErr) {
      console.error(clErr);
      toast.error("Failed to load checklists");
      setLoading(false);
      return;
    }

    if (!clData || clData.length === 0) {
      /* Fallback to seed data */
      setChecklists(defaultChecklists.map((cl, i) => ({ ...cl, id: `seed-${i}` })));
      setUsingSeeds(true);
      setExpandedId("seed-0");
      setLoading(false);
      return;
    }

    /* Fetch all items for these checklists */
    const clIds = clData.map(c => c.id);
    const { data: itemData, error: itemErr } = await supabase
      .from("checklist_items")
      .select("*")
      .in("checklist_id", clIds)
      .order("sort_order", { ascending: true });

    if (itemErr) console.error(itemErr);

    const itemsByChecklist: Record<string, ChecklistItem[]> = {};
    (itemData || []).forEach((it: any) => {
      if (!itemsByChecklist[it.checklist_id]) itemsByChecklist[it.checklist_id] = [];
      itemsByChecklist[it.checklist_id].push({ id: it.id, label: it.label, sort_order: it.sort_order, checked: false });
    });

    const mapped: Checklist[] = clData.map((cl: any) => ({
      id: cl.id,
      title: cl.title,
      description: cl.description,
      items: itemsByChecklist[cl.id] || [],
    }));

    setChecklists(mapped);
    setUsingSeeds(false);
    if (mapped.length > 0) setExpandedId(mapped[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchChecklists(); }, []);

  /* ── toggle item checked (local state) ── */
  const toggleItem = (checklistId: string, itemId: string) => {
    setChecklists(prev =>
      prev.map(cl =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it) }
          : cl
      )
    );
  };

  const getProgress = (cl: Checklist) => {
    const done = cl.items.filter(i => i.checked).length;
    return { done, total: cl.items.length, pct: cl.items.length > 0 ? Math.round((done / cl.items.length) * 100) : 0 };
  };

  /* ── save new checklist to DB ── */
  const handleSaveChecklist = async () => {
    if (!newTitle.trim()) { toast.error("Title is required"); return; }
    const validItems = newItems.filter(i => i.trim());
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      const { data: clData, error: clErr } = await supabase
        .from("checklists")
        .insert({
          company_id: companyId!,
          workspace_id: workspaceId,
          title: newTitle,
          description: newDesc,
        })
        .select()
        .single();

      if (clErr) throw clErr;

      const itemInserts = validItems.map((label, idx) => ({
        checklist_id: clData.id,
        label,
        sort_order: idx,
      }));

      const { error: itemErr } = await supabase.from("checklist_items").insert(itemInserts);
      if (itemErr) throw itemErr;

      toast.success("Checklist created");
      setDialogOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewItems([""]);
      fetchChecklists();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save checklist");
    } finally {
      setSaving(false);
    }
  };

  /* ── PDF download ── */
  const handleDownloadPdf = (cl: Checklist) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 25;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(cl.title, margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(cl.description, margin, y);
    y += 12;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 190, y);
    y += 10;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);

    cl.items.forEach((item) => {
      if (y > 270) { doc.addPage(); y = 25; }
      doc.setDrawColor(160, 160, 160);
      doc.rect(margin, y - 4, 5, 5);
      if (item.checked) {
        doc.setFont("helvetica", "bold");
        doc.text("✓", margin + 1, y);
        doc.setFont("helvetica", "normal");
      }
      const lines = doc.splitTextToSize(item.label, 155);
      doc.text(lines, margin + 9, y);
      y += lines.length * 6 + 4;
    });

    y += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 190, y);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);

    doc.save(`${cl.title.replace(/\s+/g, "-").toLowerCase()}-checklist.pdf`);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Safety Checklists</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete checklists for each event</p>
        </div>
        {isManager && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            New Checklist
          </Button>
        )}
      </div>

      <div className="space-y-4 max-w-3xl">
        {checklists.map((cl) => {
          const { done, total, pct } = getProgress(cl);
          const expanded = expandedId === cl.id;

          return (
            <div key={cl.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : cl.id)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    pct === 100 ? "bg-success/10 text-success" : "bg-accent text-accent-foreground"
                  )}>
                    {pct === 100 ? <CheckCircle2 size={20} /> : <ClipboardCheck size={20} />}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{cl.title}</h3>
                    <p className="text-xs text-muted-foreground">{cl.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-sm font-medium">{done}/{total}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted mt-1">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-2 border-t border-border pt-4">
                      {cl.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(cl.id, item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-sm text-left transition-colors",
                            item.checked ? "bg-success/5" : "hover:bg-muted/50"
                          )}
                        >
                          {item.checked ? (
                            <CheckCircle2 size={18} className="text-success shrink-0" />
                          ) : (
                            <Circle size={18} className="text-muted-foreground shrink-0" />
                          )}
                          <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                      <div className="flex items-center justify-between pt-2">
                        {pct === 100 && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm font-medium">
                            <CheckCircle2 size={16} />
                            Checklist complete!
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto gap-1.5"
                          onClick={(e) => { e.stopPropagation(); handleDownloadPdf(cl); }}
                        >
                          <Download size={14} />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Create Checklist Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Checklist</DialogTitle>
            <DialogDescription>Add a new safety checklist for your team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Checklist name" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="When to use this checklist" />
            </div>
            <div>
              <Label>Items</Label>
              <div className="space-y-2 mt-1">
                {newItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={e => {
                        const updated = [...newItems];
                        updated[idx] = e.target.value;
                        setNewItems(updated);
                      }}
                      placeholder={`Item ${idx + 1}`}
                    />
                    {newItems.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setNewItems([...newItems, ""])}>
                  <Plus size={14} /> Add Item
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChecklist} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChecklistsPage;
