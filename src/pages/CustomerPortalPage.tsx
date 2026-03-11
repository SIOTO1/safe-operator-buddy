import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  CalendarDays, MapPin, Package, DollarSign, FileText, Phone, Mail,
  Download, CreditCard, CheckCircle2, Clock, AlertCircle, Globe,
  History, XCircle, Loader2, PenTool, Eraser, CalendarClock, TriangleAlert,
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
  const [paymentMode, setPaymentMode] = useState<"full" | "custom">("full");
  const [customAmount, setCustomAmount] = useState("");

  // Contract signing state
  const [showContractView, setShowContractView] = useState(false);
  const [showSigningPad, setShowSigningPad] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

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

  useEffect(() => {
    if (paymentStatus === "success" && sessionId) {
      const verify = async () => {
        try {
          const { data: result } = await supabase.functions.invoke("verify-payment", {
            body: { session_id: sessionId },
          });
          if (result?.status === "completed") {
            toast.success("Payment completed successfully!");
            const { data: refreshed } = await supabase.functions.invoke("portal-event-data", {
              body: { token },
            });
            if (refreshed && !refreshed.error) setData(refreshed);
          }
        } catch {
          // Silent
        }
      };
      verify();
    }
  }, [paymentStatus, sessionId, token]);

  // Signature pad setup
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (showSigningPad) {
      setTimeout(initCanvas, 100);
    }
  }, [showSigningPad, initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => { isDrawingRef.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((val, i) => i % 4 === 3 && val > 0);
  };

  const handleSignContract = async () => {
    if (!data?.contract || !token || !signerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (isCanvasEmpty()) {
      toast.error("Please draw your signature");
      return;
    }
    setSigning(true);
    try {
      const signatureImage = canvasRef.current!.toDataURL("image/png");
      const { data: result, error: fnError } = await supabase.functions.invoke("portal-sign-contract", {
        body: {
          token,
          contract_id: data.contract.id,
          signed_by: signerName.trim(),
          signature_image: signatureImage,
        },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      toast.success("Contract signed successfully!");
      setShowSigningPad(false);
      // Refresh data
      const { data: refreshed } = await supabase.functions.invoke("portal-event-data", {
        body: { token },
      });
      if (refreshed && !refreshed.error) setData(refreshed);
    } catch (err: any) {
      toast.error(err.message || "Failed to sign contract");
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadContractPdf = () => {
    if (!data?.contract) return;
    const doc = new jsPDF();
    const org = data.organization;
    const contract = data.contract;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(org?.company_name || "Contract", 20, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RENTAL AGREEMENT / CONTRACT", 20, 33);

    // Contract text - strip HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = contract.contract_text;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    let y = 45;
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(plainText, 170);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 5;
    }

    // Signature section
    if (contract.signed_at) {
      y += 10;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text("SIGNATURE", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.text(`Signed by: ${contract.signed_by}`, 20, y);
      y += 6;
      doc.text(`Date: ${format(new Date(contract.signed_at), "MMMM d, yyyy 'at' h:mm a")}`, 20, y);
      
      if (contract.signature_image) {
        y += 8;
        try {
          doc.addImage(contract.signature_image, "PNG", 20, y, 80, 30);
        } catch {
          // Skip if image can't be added
        }
      }
    }

    doc.save(`contract-${data.event.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    toast.success("Contract PDF downloaded");
  };

  const handlePayBalance = async () => {
    if (!data || data.remainingBalance <= 0) return;
    setPayingBalance(true);
    try {
      const payAmount = paymentMode === "custom" ? parseFloat(customAmount) : undefined;
      if (paymentMode === "custom") {
        if (!payAmount || payAmount < 0.50) {
          toast.error("Minimum payment is $0.50");
          setPayingBalance(false);
          return;
        }
        if (payAmount > data.remainingBalance) {
          toast.error(`Amount cannot exceed remaining balance of $${data.remainingBalance.toFixed(2)}`);
          setPayingBalance(false);
          return;
        }
      }
      const { data: result, error: fnError } = await supabase.functions.invoke("create-portal-payment", {
        body: {
          token,
          customer_email: data.customer?.customer_email,
          customer_name: data.customer?.customer_name,
          amount: payAmount,
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

    let y = 58;
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    if (data.customer?.customer_name) { doc.text(data.customer.customer_name, 20, y); y += 5; }
    if (data.customer?.customer_email) { doc.text(data.customer.customer_email, 20, y); y += 5; }
    if (data.customer?.customer_phone) { doc.text(data.customer.customer_phone, 20, y); y += 5; }

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

  const openContractView = () => {
    if (!data?.contract) return;
    const contract = data.contract;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`
        <html><head><title>Contract</title>
        <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}
        img{max-width:300px;border:1px solid #ccc;margin-top:20px}
        .sig-section{margin-top:40px;padding-top:20px;border-top:2px solid #333}
        </style></head>
        <body>${contract.contract_text}
        ${contract.signed_at ? `<div class="sig-section">
          <p><strong>Signed by:</strong> ${contract.signed_by}</p>
          <p><strong>Date:</strong> ${format(new Date(contract.signed_at), "MMMM d, yyyy 'at' h:mm a")}</p>
          ${contract.signature_image ? `<img src="${contract.signature_image}" alt="Signature" />` : ""}
        </div>` : ""}
        </body></html>
      `);
      w.document.close();
    }
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
  const contractSigned = !!contract?.signed_at;
  const contractExists = !!contract;

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

        {/* Contract Section */}
        {contractExists && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={16} /> Contract
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  contractSigned
                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700"
                    : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
                )}
              >
                {contractSigned ? "Signed" : "Awaiting Signature"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {contractSigned ? (
                <>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Signed by <span className="font-medium text-foreground">{contract.signed_by}</span> on{" "}
                      {format(new Date(contract.signed_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                    {contract.signature_image && (
                      <div className="mt-3 p-3 border border-border rounded-lg bg-muted/30 inline-block">
                        <img src={contract.signature_image} alt="Signature" className="h-16 w-auto" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={openContractView}>
                      <FileText size={14} className="mr-1.5" /> View Contract
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadContractPdf}>
                      <Download size={14} className="mr-1.5" /> Download PDF
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your contract is ready for review and signature. Please read the terms below and sign to confirm.
                  </p>

                  {/* Contract preview */}
                  <div className="border border-border rounded-lg p-4 max-h-64 overflow-y-auto bg-muted/20 text-sm leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: contract.contract_text }} />
                  </div>

                  {!showSigningPad ? (
                    <Button onClick={() => {
                      setShowSigningPad(true);
                      setSignerName(customer?.customer_name || "");
                    }} className="w-full" size="lg">
                      <PenTool size={16} className="mr-2" /> Sign Contract
                    </Button>
                  ) : (
                    <div className="space-y-4 border border-border rounded-lg p-4 bg-card">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Your Full Name</label>
                        <Input
                          value={signerName}
                          onChange={e => setSignerName(e.target.value)}
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-medium">Signature</label>
                          <Button variant="ghost" size="sm" onClick={clearCanvas} className="h-7 text-xs">
                            <Eraser size={12} className="mr-1" /> Clear
                          </Button>
                        </div>
                        <canvas
                          ref={canvasRef}
                          className="w-full h-32 border-2 border-dashed border-border rounded-lg cursor-crosshair bg-background touch-none"
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={endDraw}
                          onMouseLeave={endDraw}
                          onTouchStart={startDraw}
                          onTouchMove={draw}
                          onTouchEnd={endDraw}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Draw your signature above using mouse or touch</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowSigningPad(false)}
                          disabled={signing}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleSignContract}
                          disabled={signing || !signerName.trim()}
                        >
                          {signing ? (
                            <><Loader2 size={14} className="mr-1.5 animate-spin" /> Signing...</>
                          ) : (
                            <><PenTool size={14} className="mr-1.5" /> Confirm & Sign</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
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
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <Button
                    variant={paymentMode === "full" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentMode("full")}
                  >
                    Pay Full Balance
                  </Button>
                  <Button
                    variant={paymentMode === "custom" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setPaymentMode("custom"); setCustomAmount(""); }}
                  >
                    Custom Amount
                  </Button>
                </div>

                {paymentMode === "custom" && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min="0.50"
                      max={remainingBalance}
                      step="0.01"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder={`0.50 – ${remainingBalance.toFixed(2)}`}
                      className="pl-7"
                    />
                  </div>
                )}

                <Button
                  onClick={handlePayBalance}
                  disabled={payingBalance || (paymentMode === "custom" && !customAmount)}
                  className="w-full"
                  size="lg"
                >
                  {payingBalance ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Redirecting to payment...</>
                  ) : (
                    <><CreditCard size={16} className="mr-2" />
                      Pay ${paymentMode === "custom" && customAmount
                        ? parseFloat(customAmount).toFixed(2)
                        : remainingBalance.toFixed(2)} Now
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        {data.payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History size={16} /> Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.payments.map(p => {
                  const isCompleted = p.payment_status === "completed";
                  const isFailed = p.payment_status === "failed";
                  const isPending = p.payment_status === "pending";

                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          isCompleted && "bg-green-100 dark:bg-green-900/30",
                          isFailed && "bg-destructive/10",
                          isPending && "bg-muted"
                        )}>
                          {isCompleted && <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />}
                          {isFailed && <XCircle size={14} className="text-destructive" />}
                          {isPending && <Clock size={14} className="text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {p.payment_type === "deposit" ? "Deposit" :
                             p.payment_type === "balance" ? "Balance Payment" :
                             p.payment_type === "auto_balance" ? "Auto-Charge" :
                             p.payment_type === "partial" ? "Partial Payment" :
                             "Payment"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-semibold",
                          isCompleted && "text-green-600 dark:text-green-400",
                          isFailed && "text-destructive",
                          isPending && "text-muted-foreground"
                        )}>
                          ${Number(p.amount).toFixed(2)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5",
                            isCompleted && "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400",
                            isFailed && "border-destructive/30 text-destructive",
                            isPending && "text-muted-foreground"
                          )}
                        >
                          {isCompleted ? "Completed" : isFailed ? "Failed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
