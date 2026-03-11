import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, Package, Upload, X, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "inflatables", label: "Inflatables" },
  { value: "slides", label: "Slides" },
  { value: "foam_machines", label: "Foam Machines" },
  { value: "tents", label: "Tents" },
  { value: "tables", label: "Tables" },
  { value: "chairs", label: "Chairs" },
  { value: "generators", label: "Generators" },
  { value: "concessions", label: "Concessions" },
  { value: "other", label: "Other" },
] as const;

type CategoryValue = typeof CATEGORIES[number]["value"];

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: CategoryValue;
  price: number | null;
  quantity_available: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const ProductCatalogPage = () => {
  const { user, companyId, workspaceId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [form, setForm] = useState({ name: "", description: "", category: "other" as CategoryValue, price: "", quantity: "1", image_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("category")
      .order("name");
    if (error) {
      console.error(error);
      toast.error("Failed to load products");
    } else {
      setProducts((data || []) as Product[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = products.filter(p => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", category: "other", price: "", quantity: "1", image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      category: p.category,
      price: p.price != null ? String(p.price) : "",
      quantity: String(p.quantity_available),
      image_url: p.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `product-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("equipment-images").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("equipment-images").getPublicUrl(fileName);
      setForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const priceVal = form.price.trim() ? parseFloat(form.price) : null;
      if (priceVal !== null && (isNaN(priceVal) || priceVal < 0)) { toast.error("Invalid price"); setSaving(false); return; }
      const qty = parseInt(form.quantity) || 1;
      if (qty < 0) { toast.error("Invalid quantity"); setSaving(false); return; }

      if (editing) {
        const { error } = await supabase.from("products").update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category,
          image_url: form.image_url.trim() || null,
          price: priceVal,
          quantity_available: qty,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category,
          image_url: form.image_url.trim() || null,
          price: priceVal,
          quantity_available: qty,
          company_id: companyId,
          workspace_id: workspaceId,
        });
        if (error) throw error;
        toast.success("Product added");
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    fetchProducts();
  };

  const getCategoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Product Catalog</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your rental inventory — {products.length} products
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">{products.length === 0 ? "No products yet" : "No matching products"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {products.length === 0
                ? "Add your rental products so customers can select them when booking."
                : "Try adjusting your search or filter."}
            </p>
            {products.length === 0 && (
              <Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add First Product</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Qty Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className={!p.is_active ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package size={16} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryLabel(p.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.price != null ? `$${p.price.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>{p.quantity_available}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(p)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., 15x15 Bounce House" maxLength={100} />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as CategoryValue })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." rows={3} maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="199.99" />
              </div>
              <div>
                <Label>Quantity Available</Label>
                <Input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="1" />
              </div>
            </div>
            <div>
              <Label>Image</Label>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
              {form.image_url ? (
                <div className="relative w-24 h-24 mt-1.5">
                  <img src={form.image_url} alt="Preview" className="w-full h-full rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, image_url: "" }))} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="mt-1.5 gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload size={14} />
                  {uploading ? "Uploading..." : "Upload Image"}
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
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

export default ProductCatalogPage;
