import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import {
  getQuoteById,
  getQuoteItems,
  updateQuote,
  addQuoteItem,
  deleteQuoteItem,
  type Quote,
  type QuoteItem,
  type QuoteStatus,
} from "@/lib/crm/quoteService";
import { createContract } from "@/lib/crm/contractService";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, DollarSign, ShoppingCart, Save, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  expired: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const QuoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCrmPermissions();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ["crm-quote", id],
    queryFn: () => getQuoteById(id!),
    enabled: !!id,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["crm-quote-items", id],
    queryFn: () => getQuoteItems(id!),
    enabled: !!id,
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

  // Seed form from loaded quote
  useEffect(() => {
    if (quote) {
      setTitle(quote.title || "");
      setNotes(quote.notes || "");
      setStatus(quote.status);
    }
  }, [quote]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
    [items]
  );

  // --- Mutations ---
  const addItemMutation = useMutation({
    mutationFn: (product: { id: string; name: string; price: number }) => {
      return addQuoteItem({
        quote_id: id!,
        product_id: product.id,
        product_name: product.name,
        description: "",
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-quote-items", id] });
      recalcTotal();
    },
    onError: () => toast.error("Failed to add item"),
  });

  const removeItemMutation = useMutation({
    mutationFn: deleteQuoteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-quote-items", id] });
      recalcTotal();
    },
    onError: () => toast.error("Failed to remove item"),
  });

  const updateItemQuantity = async (item: QuoteItem, newQty: number) => {
    if (newQty < 1) return removeItemMutation.mutate(item.id);
    const newTotal = item.unit_price * newQty;
    const { error } = await supabase
      .from("quote_items" as any)
      .update({ quantity: newQty, total_price: newTotal } as any)
      .eq("id", item.id);
    if (error) return toast.error("Failed to update quantity");
    queryClient.invalidateQueries({ queryKey: ["crm-quote-items", id] });
    recalcTotal();
  };

  const recalcTotal = async () => {
    const freshItems = await getQuoteItems(id!);
    const newTotal = freshItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    await updateQuote(id!, { total_amount: newTotal });
    queryClient.invalidateQueries({ queryKey: ["crm-quote", id] });
    queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      await updateQuote(id!, { title, notes: notes || null, status, total_amount: total });
      queryClient.invalidateQueries({ queryKey: ["crm-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
      toast.success("Quote saved");
    } catch {
      toast.error("Failed to save quote");
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!quote || !user) return;
    setAccepting(true);
    try {
      // 1. Update quote status to accepted
      await updateQuote(id!, { status: "accepted", total_amount: total });

      // 2. Get lead info if linked
      let leadName = "";
      let leadNotes = "";
      if (quote.lead_id) {
        const { data: lead } = await supabase
          .from("crm_leads" as any)
          .select("name, email, phone")
          .eq("id", quote.lead_id)
          .single();
        if (lead) {
          const l = lead as any;
          leadName = l.name || "";
          leadNotes = [
            l.name && `Customer: ${l.name}`,
            l.email && `Email: ${l.email}`,
            l.phone && `Phone: ${l.phone}`,
          ].filter(Boolean).join("\n");
        }
      }

      // Build product summary for event notes
      const productSummary = items
        .map((i) => `${i.product_name} x${i.quantity} ($${(i.unit_price * i.quantity).toFixed(2)})`)
        .join("\n");

      const eventNotes = [
        leadNotes,
        `\nQuote: ${quote.title} — $${total.toFixed(2)}`,
        `\nProducts:\n${productSummary}`,
        quote.notes && `\nNotes: ${quote.notes}`,
      ].filter(Boolean).join("\n");

      // 3. Create event linked to quote
      const eventTitle = leadName
        ? `${leadName} — ${quote.title}`
        : quote.title || "Event from Quote";

      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          title: eventTitle,
          event_date: new Date().toISOString().split("T")[0],
          created_by: user.id,
          notes: eventNotes,
          quote_id: id,
        } as any)
        .select()
        .single();

      if (eventError) throw eventError;

      // 4. Populate event_products from quote_items
      const eventProducts = items
        .filter((i) => i.product_id)
        .map((i) => ({
          event_id: event.id,
          product_id: i.product_id!,
          quantity: i.quantity,
        }));

      if (eventProducts.length > 0) {
        const { error: epError } = await supabase
          .from("event_products")
          .insert(eventProducts);
        if (epError) throw epError;
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["crm-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });

      toast.success("Quote accepted! Event created. Redirecting to contracts…");

      // 5. Redirect to contracts page
      navigate("/dashboard/contracts");
    } catch (err) {
      console.error("Accept quote error:", err);
      toast.error("Failed to accept quote");
    } finally {
      setAccepting(false);
    }
  };

  if (quoteLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading quote…
      </div>
    );
  }

  if (!quote) {
    return <div className="p-6 text-muted-foreground">Quote not found.</div>;
  }

  const isAccepted = quote.status === "accepted";

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/crm/quotes")}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Quote Details</h1>
          <p className="text-sm text-muted-foreground">
            Created {format(new Date(quote.created_at), "MMM d, yyyy")}
            {quote.lead && <> · <span className="font-medium text-foreground">{quote.lead.name}</span></>}
          </p>
        </div>
        <Badge className={STATUS_COLORS[quote.status] + " capitalize border-0 text-sm px-3 py-1"}>
          {quote.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details + Product picker */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quote Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["draft", "sent", "accepted", "expired"] as QuoteStatus[]).map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                <Save size={15} className="mr-1.5" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
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
                    const inCart = items.filter((i) => i.product_id === p.id);
                    const totalQty = inCart.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <button
                        key={p.id}
                        onClick={() => addItemMutation.mutate({ id: p.id, name: p.name, price: p.price ?? 0 })}
                        disabled={addItemMutation.isPending}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                            <ShoppingCart size={14} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">${(p.price ?? 0).toFixed(2)}</p>
                        </div>
                        {totalQty > 0 && (
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            ×{totalQty}
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

        {/* Right: Line Items Summary + Accept */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No items yet. Add products from the catalog.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-md border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">${item.unit_price.toFixed(2)} each</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center text-sm"
                      />
                      <p className="text-sm font-semibold w-20 text-right">
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeItemMutation.mutate(item.id)}
                        disabled={removeItemMutation.isPending}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
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

          {/* Accept Quote Action */}
          {!isAccepted && items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                  disabled={accepting}
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  {accepting ? "Processing…" : "Accept Quote"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Accept this quote?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the quote as <strong>Accepted</strong>, automatically create an event with
                    all {items.length} product{items.length !== 1 ? "s" : ""} (${total.toFixed(2)} total),
                    and redirect you to the contracts page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleAcceptQuote}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Accept & Create Event
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isAccepted && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Quote Accepted</p>
                  <p className="text-xs text-muted-foreground">An event has been created for this quote.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailPage;
