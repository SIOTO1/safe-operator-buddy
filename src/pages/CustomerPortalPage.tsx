import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  CalendarDays, MapPin, Package, DollarSign, FileText, Phone, Mail,
  Download, CreditCard, CheckCircle2, Clock, AlertCircle, Globe,
  History, XCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface PortalData {
  event: any;
  products: { id: string; quantity: number; name: string; category: string; price: number | null; image_url: string | null }[];
  payments: { id: string; amount: number; payment_status: string; payment_type: string; created_at: string }[];
  contract: any | null;
  organization: any | null;
  customer: { customer_name: string; customer_email: string; customer_phone: string | null } | null;
  quoteTotal: number;
  quoteItems: any[];
  totalPaid: number;
  depositPaid: number;
  remainingBalance: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  inflatables: "Inflatables", slides: "Slides", foam_machines: "Foam Machines",
  tents: "Tents", tables: "Tables", chairs: "Chairs", generators: "Generators",
  concessions: "Concessions", other: "Other",
};

const CustomerPortalPage = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingBalance, setPayingBalance] = useState(false);

  const paymentStatus = searchParams.get("payment");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke("portal-event-data", {
          body: { token },
        });
        if (fnError) throw fnError;
        if (result?.error) throw new Error(result.error);
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load portal data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Verify payment after redirect
  useEffect(() => {
    if (paymentStatus === "success" && sessionId) {
      const verify = async () => {
        try {
          const { data: result } = await supabase.functions.invoke("verify-payment", {
            body: { session_id: sessionId },
          });
          if (result?.status === "completed") {
            toast.success("Payment completed successfully!");
            // Refresh data
            const { data: refreshed } = await supabase.functions.invoke("portal-event-data", {
              body: { token },
            });
            if (refreshed && !refreshed.error) setData(refreshed);
          }
        } catch {
          // Silent — data will refresh
        }
      };
      verify();
    }
  }, [paymentStatus, sessionId, token]);

  const handlePayBalance = async () => {
    if (!data || data.remainingBalance <= 0) return;
    setPayingBalance(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("create-portal-payment", {
        body: {
          token,
          customer_email: data.customer?.customer_email,
          customer_name: data.customer?.customer_name,
        },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      if (result?.url) window.location.href = result.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start payment");
    } finally {
      setPayingBalance(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!data) return;
    const doc = new jsPDF();
    const org = data.organization;
    const event = data.event;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(org?.company_name || "Invoice", 20, 25);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (org?.address) doc.text(org.address, 20, 33);
    if (org?.phone) doc.text(org.phone, 20, 38);
    if (org?.email) doc.text(org.email, 20, 43);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 150, 25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${format(new Date(), "MMM d, yyyy")}`, 150, 33);
    doc.text(`Event: ${event.title}`, 150, 38);
    doc.text(`Event Date: ${format(new Date(event.event_date), "MMM d, yyyy")}`, 150, 43);

    // Customer info
    let y = 58;
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    if (data.customer?.customer_name) { doc.text(data.customer.customer_name, 20, y); y += 5; }
    if (data.customer?.customer_email) { doc.text(data.customer.customer_email, 20, y); y += 5; }
    if (data.customer?.customer_phone) { doc.text(data.customer.customer_phone, 20, y); y += 5; }

    // Line items table
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y - 4, 170, 8, "F");
    doc.text("Item", 22, y);
    doc.text("Qty", 120, y);
    doc.text("Price", 140, y);
    doc.text("Total", 170, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    const items = data.quoteItems.length > 0 ? data.quoteItems : data.products.map(p => ({
      product_name: p.name, quantity: p.quantity, unit_price: p.price || 0, total_price: (p.price || 0) * p.quantity,
    }));

    items.forEach((item: any) => {
      doc.text(item.product_name || item.name, 22, y);
      doc.text(String(item.quantity), 120, y);
      doc.text(`$${Number(item.unit_price || item.price || 0).toFixed(2)}`, 140, y);
      doc.text(`$${Number(item.total_price || (item.price || 0) * item.quantity).toFixed(2)}`, 170, y);
      y += 6;
    });

    // Totals
    y += 4;
    doc.line(120, y, 190, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 140, y);
    doc.text(`$${data.quoteTotal.toFixed(2)}`, 170, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Paid:", 140, y);
    doc.text(`$${data.totalPaid.toFixed(2)}`, 170, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Balance Due:", 140, y);
    doc.text(`$${data.remainingBalance.toFixed(2)}`, 170, y);

    doc.save(`invoice-${event.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    toast.success("Invoice downloaded");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-6">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="mx-auto text-destructive" size={48} />
            <h2 className="text-xl font-display font-bold">Access Denied</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { event, products, contract, organization, customer, quoteTotal, totalPaid, depositPaid, remainingBalance } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">
              {organization?.company_name || "Event Portal"}
            </h1>
            {organization?.website && (
              <a
                href={organization.website.startsWith("http") ? organization.website : `https://${organization.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Globe size={10} /> {organization.website}
              </a>
            )}
          </div>
          <Badge variant="outline" className="text-xs">Customer Portal</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Payment success banner */}
        {paymentStatus === "success" && (
          <div className="rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4 flex items-center gap-3">
            <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" size={20} />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Payment received! Thank you.</p>
          </div>
        )}

        {/* Event Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-display">{event.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {customer?.customer_name && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {customer.customer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">Customer</p>
                    <p className="text-muted-foreground">{customer.customer_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <CalendarDays size={16} className="mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Event Date</p>
                  <p className="text-muted-foreground">
                    {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                  </p>
                  {(event.start_time || event.end_time) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {event.start_time?.slice(0, 5) || "TBD"} – {event.end_time?.slice(0, 5) || "TBD"}
                    </p>
                  )}
                </div>
              </div>
              {event.location && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        {products.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package size={16} /> Booked Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package size={14} className="text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[p.category] || p.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">×{p.quantity}</Badge>
                      {p.price != null && (
                        <p className="text-xs text-muted-foreground mt-0.5">${(p.price * p.quantity).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign size={16} /> Payment Summary
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                remainingBalance <= 0
                  ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700"
                  : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
              )}
            >
              {remainingBalance <= 0 ? "Paid in Full" : "Balance Due"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Price</span>
                <span className="font-medium">${quoteTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit Paid</span>
                <span className="font-medium text-green-600 dark:text-green-400">${depositPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium text-green-600 dark:text-green-400">${totalPaid.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Remaining Balance</span>
                <span className={cn(
                  "font-semibold",
                  remainingBalance > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"
                )}>
                  ${remainingBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {remainingBalance > 0 && (
              <Button onClick={handlePayBalance} disabled={payingBalance} className="w-full" size="lg">
                <CreditCard size={16} className="mr-2" />
                {payingBalance ? "Redirecting to payment..." : `Pay $${remainingBalance.toFixed(2)} Now`}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* View Contract */}
          {contract?.signed_at && (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
              // Open contract in dialog/modal — for now show toast
              const w = window.open("", "_blank");
              if (w) {
                w.document.write(`
                  <html><head><title>Contract</title>
                  <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}
                  img{max-width:300px;border:1px solid #ccc;margin-top:20px}</style></head>
                  <body>${contract.contract_text}
                  ${contract.signature_image ? `<hr><p><strong>Signed by:</strong> ${contract.signed_by}</p>
                  <p><strong>Date:</strong> ${format(new Date(contract.signed_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                  <img src="${contract.signature_image}" alt="Signature" />` : ""}
                  </body></html>
                `);
                w.document.close();
              }
            }}>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">View Signed Contract</p>
                  <p className="text-xs text-muted-foreground">
                    Signed {format(new Date(contract.signed_at), "MMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download Invoice */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleDownloadInvoice}>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Download size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Download Invoice</p>
                <p className="text-xs text-muted-foreground">PDF with itemized breakdown</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Company */}
          {(organization?.phone || organization?.email) && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <p className="text-sm font-medium mb-2">Contact Us</p>
                {organization.phone && (
                  <a href={`tel:${organization.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Phone size={14} /> {organization.phone}
                  </a>
                )}
                {organization.email && (
                  <a href={`mailto:${organization.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Mail size={14} /> {organization.email}
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by {organization?.company_name || "SIOTO"} • Customer Portal
        </p>
      </footer>
    </div>
  );
};

export default CustomerPortalPage;
