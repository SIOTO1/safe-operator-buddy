import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, GripVertical, Package, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface EquipmentItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const MAX_ITEMS = 20;

const EquipmentCatalogPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", image_url: "" });
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("equipment_catalog")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      toast.error("Failed to load equipment");
    } else {
      setItems((data || []) as EquipmentItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    if (items.length >= MAX_ITEMS) {
      toast.error(`Maximum of ${MAX_ITEMS} items reached`);
      return;
    }
    setEditing(null);
    setForm({ name: "", description: "", image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: EquipmentItem) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description || "", image_url: item.image_url || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("equipment_catalog").update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          image_url: form.image_url.trim() || null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Equipment updated");
      } else {
        const { error } = await supabase.from("equipment_catalog").insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          image_url: form.image_url.trim() || null,
          sort_order: items.length,
          created_by: user!.id,
        });
        if (error) throw error;
        toast.success("Equipment added");
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: EquipmentItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase.from("equipment_catalog").delete().eq("id", item.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    fetchItems();
  };

  const handleToggleActive = async (item: EquipmentItem) => {
    const { error } = await supabase.from("equipment_catalog").update({ is_active: !item.is_active }).eq("id", item.id);
    if (error) { toast.error("Failed to update"); return; }
    fetchItems();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Equipment Catalog</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your rental inventory ({items.length}/{MAX_ITEMS} items)
          </p>
        </div>
        <Button onClick={openAdd} disabled={items.length >= MAX_ITEMS}>
          <Plus size={16} className="mr-1" /> Add Item
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No equipment yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your rental items so customers can select them when booking.</p>
            <Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add First Item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={!item.is_active ? "opacity-60" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package size={20} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{item.name}</span>
                        {!item.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={item.is_active} onCheckedChange={() => handleToggleActive(item)} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., 15x15 Bounce House" maxLength={100} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the item..." rows={3} maxLength={500} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">Paste a link to an image of this item</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentCatalogPage;
