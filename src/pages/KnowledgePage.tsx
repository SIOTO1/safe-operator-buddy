import { useState, useEffect, useMemo } from "react";
import { Search, BookOpen, ChevronRight, Shield, Wind, Zap, ClipboardCheck, FileText, Eye, Wrench, Video, Globe, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ── icon map for DB-stored icon names ── */
const iconMap: Record<string, React.ElementType> = {
  Wrench, ClipboardCheck, Shield, Wind, Zap, Eye, BookOpen, Video, FileText, Globe, AlertTriangle,
};

/* ── static category metadata (icon + label) ── */
const categoryMeta: Record<string, { icon: React.ElementType; label: string }> = {
  setup:       { icon: Wrench, label: "Setup Procedures" },
  takedown:    { icon: ClipboardCheck, label: "Takedown Procedures" },
  anchoring:   { icon: Shield, label: "Anchoring Rules" },
  wind:        { icon: Wind, label: "Wind & Weather" },
  electrical:  { icon: Zap, label: "Electrical Safety" },
  inspection:  { icon: Eye, label: "Inspection Protocols" },
  tips:        { icon: BookOpen, label: "Safety Tip Guides" },
  clips:       { icon: Video, label: "Smart Clips" },
  contracts:   { icon: FileText, label: "Rental Agreement Templates" },
  compliance:  { icon: Globe, label: "State Compliance Rules" },
};

const CATEGORY_OPTIONS = Object.entries(categoryMeta).map(([id, meta]) => ({ id, label: meta.label }));

/* ── fallback seed data (used when DB returns empty) ── */
const seedArticles: { category: string; title: string; preview: string; icon: string }[] = [
  { category: "setup", title: "Standard Bounce House Setup Procedure", preview: "Step-by-step guide for setting up residential bounce houses. Always follow your manufacturer's specific instructions.", icon: "Wrench" },
  { category: "setup", title: "Commercial Inflatable Setup Guide", preview: "For large commercial units including obstacle courses. Anchoring and electrical requirements vary by manufacturer.", icon: "Wrench" },
  { category: "setup", title: "Water Slide Setup Requirements", preview: "Special considerations for water inflatables including drainage, water supply, and slip-prevention measures.", icon: "Wrench" },
  { category: "anchoring", title: "Grass & Dirt Anchoring (Stakes)", preview: "Steel stakes driven at 45° angle. Stake length and depth per your manufacturer's specifications for the specific unit.", icon: "Shield" },
  { category: "anchoring", title: "Hard Surface Anchoring (Sandbags)", preview: "Sandbag weight requirements vary by unit size, type, and manufacturer. Always consult your unit's manual for exact weights.", icon: "Shield" },
  { category: "anchoring", title: "Indoor Setup Anchoring", preview: "Sandbag-only anchoring for indoor events. Weight requirements per manufacturer specifications.", icon: "Shield" },
  { category: "wind", title: "Wind Speed Operating Limits", preview: "General guideline: 15-20 mph monitor closely, 20+ mph deflate immediately. Some manufacturers set stricter limits.", icon: "Wind" },
  { category: "wind", title: "Using an Anemometer", preview: "Proper wind measurement techniques and tools for accurate on-site wind speed monitoring.", icon: "Wind" },
  { category: "wind", title: "Severe Weather Action Plan", preview: "Steps to follow when weather turns dangerous. Have a written plan before every event.", icon: "Wind" },
  { category: "electrical", title: "Extension Cord Selection Guide", preview: "Cord gauge requirements depend on run length and blower amperage. Consult your blower manufacturer's specifications.", icon: "Zap" },
  { category: "electrical", title: "GFCI Protection Requirements", preview: "All outdoor electrical connections must be GFCI-protected. Never daisy-chain extension cords.", icon: "Zap" },
  { category: "electrical", title: "Blower Electrical Requirements", preview: "Amperage, voltage, and dedicated circuit requirements vary by blower model. Always check your blower's nameplate.", icon: "Zap" },
  { category: "inspection", title: "Pre-Event Inspection Checklist", preview: "Check seams, anchor loops, blower tubes, netting, and vinyl for damage before every setup.", icon: "Eye" },
  { category: "inspection", title: "During-Event Monitoring Protocol", preview: "Monitor occupancy, rider behavior, and wind conditions at regular intervals throughout the event.", icon: "Eye" },
  { category: "inspection", title: "Post-Event Inspection & Documentation", preview: "Document equipment condition after every event. Note any repairs needed for maintenance tracking.", icon: "Eye" },
];

interface Article {
  id: string;
  category: string;
  title: string;
  preview: string;
  content: string;
  icon: string;
}

const KnowledgePage = () => {
  const { role, companyId } = useAuth();
  const isManager = role === "owner" || role === "manager";

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  /* ── add article dialog ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: "setup", title: "", preview: "", content: "" });

  /* ── fetch articles from DB ── */
  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from("knowledge_articles")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Failed to load knowledge base");
    } else if (data && data.length > 0) {
      setArticles(data as Article[]);
    } else {
      /* Use seed data as fallback display (not yet persisted) */
      setArticles(seedArticles.map((a, i) => ({ ...a, id: `seed-${i}`, content: "" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  /* ── derived category list with counts from actual data ── */
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1; });
    return Object.entries(categoryMeta).map(([id, meta]) => ({
      id,
      icon: meta.icon,
      label: meta.label,
      count: counts[id] || 0,
      color: "text-primary",
    }));
  }, [articles]);

  const filteredCategories = categories.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  const categoryArticles = selectedCat
    ? articles.filter(a => a.category === selectedCat)
    : [];

  /* ── save new article ── */
  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("knowledge_articles").insert({
        company_id: companyId!,
        category: form.category,
        title: form.title,
        preview: form.preview,
        content: form.content,
        icon: categoryMeta[form.category]?.icon?.name || "BookOpen",
      });
      if (error) throw error;
      toast.success("Article added");
      setDialogOpen(false);
      setForm({ category: "setup", title: "", preview: "", content: "" });
      fetchArticles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save article");
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-display font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm mt-1">SIOTO safety guidelines — always verify with your manufacturer's specs</p>
        </div>
        {isManager && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            Add Article
          </Button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 max-w-3xl">
        <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Important Disclaimer</p>
          <p className="text-muted-foreground mt-1">
            These are general safety guidelines. Specific requirements (sandbag weights, stake dimensions, electrical specs, occupancy limits)
            <strong className="text-foreground"> vary by manufacturer, unit type, and unit size</strong>. Always follow your manufacturer's recommendations and local regulations.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search categories, articles, procedures..."
          className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {!selectedCat ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedCat(cat.id)}
              className="text-left p-5 rounded-xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
            >
              <cat.icon size={24} className={cat.color} />
              <h3 className="font-display font-semibold mt-3 mb-1">{cat.label}</h3>
              <p className="text-xs text-muted-foreground">{cat.count} articles</p>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary mt-2 transition-colors" />
            </motion.button>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedCat(null)}
            className="text-sm text-primary font-medium mb-4 flex items-center gap-1 hover:underline"
          >
            ← Back to Categories
          </button>
          <h2 className="text-xl font-display font-bold mb-4">
            {categoryMeta[selectedCat]?.label || selectedCat}
          </h2>
          {categoryArticles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <BookOpen size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No articles in this category yet.</p>
              {isManager && (
                <Button variant="outline" className="mt-4" onClick={() => { setForm({ ...form, category: selectedCat }); setDialogOpen(true); }}>
                  <Plus size={14} /> Add Article
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {categoryArticles.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors cursor-pointer"
                >
                  <h3 className="font-semibold text-sm mb-1">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">{a.preview}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Article Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Knowledge Article</DialogTitle>
            <DialogDescription>Create a new article for your team's knowledge base.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Article title" />
            </div>
            <div>
              <Label>Preview / Summary</Label>
              <Input value={form.preview} onChange={e => setForm({ ...form, preview: e.target.value })} placeholder="Short description shown in the list" />
            </div>
            <div>
              <Label>Content</Label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Full article content..."
                rows={6}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Add Article"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgePage;
