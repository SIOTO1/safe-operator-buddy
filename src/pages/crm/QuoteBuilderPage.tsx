import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import { getLeads } from "@/lib/crm/leadService";
import { createQuote, addQuoteItem } from "@/lib/crm/quoteService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, DollarSign, ShoppingCart, Send, Save } from "lucide-react";
import { toast } from "sonner";

type CartItem = {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  image_url: string | null;
};

const QuoteBuilderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { companyId, workspaceId } = useCrmPermissions();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>(searchParams.get("lead_id") || "");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ["crm-leads", workspaceId],
    queryFn: () => getLeads(workspaceId),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [cart]
  );

  const addProduct = (productId: string) => {
    const existing = cart.find((c) => c.product_id === productId);
    if (existing) {
      setCart(cart.map((c) => (c.product_id === productId ? { ...c, quantity: c.quantity + 1 } : c)));
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart([
      ...cart,
      {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price ?? 0,
        quantity: 1,
        image_url: product.image_url,
      },
    ]);
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return removeItem(productId);
    setCart(cart.map((c) => (c.product_id === productId ? { ...c, quantity: qty } : c)));
  };

  const removeItem = (productId: string) => {
    setCart(cart.filter((c) => c.product_id !== productId));
  };

  const handleSave = async (status: "draft" | "sent") => {
    if (!title.trim()) return toast.error("Please enter a quote title");
    if (cart.length === 0) return toast.error("Add at least one product");

    setSaving(true);
    try {
      const quote = await createQuote({
        title,
        notes: notes || null,
        status,
        total_amount: total,
        lead_id: selectedLeadId || null,
        company_id: companyId ?? null,
        workspace_id: workspaceId ?? null,
        created_by: user?.id || "",
      });

      await Promise.all(
        cart.map((item) =>
          addQuoteItem({
            quote_id: quote.id,
            product_id: item.product_id,
            product_name: item.product_name,
            description: "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
          })
        )
      );

      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
      toast.success(`Quote saved as ${status}`);
      navigate("/dashboard/crm/quotes");
    } catch {
      toast.error("Failed to save quote");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/crm/quotes")}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Quote Builder</h1>
          <p className="text-sm text-muted-foreground">Create a new quote with products from your catalog</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quote details + product picker */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quote Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Birthday Party Package" />
                </div>
                <div className="space-y-1.5">
                  <Label>Lead</Label>
                  <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lead…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No lead</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} — {l.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes for this quote…" />
              </div>
            </CardContent>
          </Card>

          {/* Product Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart size={16} /> Add Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active products in your catalog.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((p) => {
                    const inCart = cart.find((c) => c.product_id === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors text-left"
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            <ShoppingCart size={14} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">${(p.price ?? 0).toFixed(2)}</p>
                        </div>
                        {inCart && (
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            ×{inCart.quantity}
                          </span>
                        )}
                        <Plus size={14} className="text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Cart / Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No items yet. Add products from the catalog.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-3 p-2 rounded-md border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">${item.unit_price.toFixed(2)} each</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center text-sm"
                      />
                      <p className="text-sm font-semibold w-20 text-right">
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product_id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold flex items-center gap-0.5">
                      <DollarSign size={16} />{total.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => handleSave("sent")} disabled={saving}>
              <Send size={15} className="mr-1.5" />
              {saving ? "Saving…" : "Save & Send"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleSave("draft")} disabled={saving}>
              <Save size={15} className="mr-1.5" />
              Save as Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteBuilderPage;
