import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { getContractById, signContract } from "@/lib/crm/contractService";
import { getQuoteById, getQuoteItems } from "@/lib/crm/quoteService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSignature, RotateCcw, CheckCircle2, Loader2, CreditCard, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DEPOSIT_PERCENT = 0.25;

const ContractSigningPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { orgName } = useOrgSettings();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  // Handle payment return
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      // Verify the payment
      supabase.functions.invoke("verify-payment", {
        body: { session_id: sessionId },
      }).then(({ data, error }) => {
        if (!error && data?.status === "completed") {
          toast.success("Payment completed successfully!");
          queryClient.invalidateQueries({ queryKey: ["payments", id] });
        }
      });
    } else if (paymentStatus === "canceled") {
      toast.info("Payment was canceled.");
    }
  }, [searchParams]);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => getContractById(id!),
    enabled: !!id,
  });

  const { data: quote } = useQuery({
    queryKey: ["crm-quote", contract?.quote_id],
    queryFn: () => getQuoteById(contract!.quote_id!),
    enabled: !!contract?.quote_id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["crm-quote-items", contract?.quote_id],
    queryFn: () => getQuoteItems(contract!.quote_id!),
    enabled: !!contract?.quote_id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments" as any)
        .select("*")
        .eq("contract_id", id!)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
  }, [contract]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasBlank = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((channel, i) => i % 4 === 3 && channel !== 0);
  };

  const handleSign = async () => {
    if (!contract || !user) return;
    if (!signerName.trim()) return toast.error("Please enter your full name");
    if (isCanvasBlank()) return toast.error("Please draw your signature");

    setSigning(true);
    try {
      const canvas = canvasRef.current!;
      const signatureDataUrl = canvas.toDataURL("image/png");
      await signContract(contract.id, signerName, signatureDataUrl);
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      setHasSigned(true);
      toast.success("Contract signed successfully!");
    } catch {
      toast.error("Failed to sign contract");
    } finally {
      setSigning(false);
    }
  };

  const handlePayment = async (type: "deposit" | "partial" | "full") => {
    if (!contract) return;
    setPaymentLoading(type);

    let amount = total;
    let description = "Full Payment";

    if (type === "deposit") {
      amount = total * DEPOSIT_PERCENT;
      description = `Deposit (${DEPOSIT_PERCENT * 100}%)`;
    } else if (type === "partial") {
      const parsed = parseFloat(customAmount);
      if (!parsed || parsed <= 0 || parsed > remaining) {
        toast.error(`Enter an amount between $0.01 and $${remaining.toFixed(2)}`);
        setPaymentLoading(null);
        return;
      }
      amount = parsed;
      description = "Partial Payment";
    } else {
      amount = remaining;
      description = "Full Payment";
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-event-payment", {
        body: {
          quote_id: contract.quote_id,
          event_id: contract.event_id,
          contract_id: contract.id,
          amount,
          payment_type: type,
          description: `${orgName || "Rental"} - ${description}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment session");
    } finally {
      setPaymentLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading contract…
      </div>
    );
  }

  if (!contract) {
    return <div className="p-6 text-muted-foreground">Contract not found.</div>;
  }

  const isSigned = !!contract.signed_at || hasSigned;
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalPaid = payments
    .filter((p: any) => p.payment_status === "completed")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const remaining = Math.max(0, total - totalPaid);
  const isFullyPaid = remaining <= 0 && total > 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Rental Agreement</h1>
          <p className="text-sm text-muted-foreground">
            {orgName || "Company"} · {format(new Date(contract.created_at), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          {isSigned ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-sm px-3 py-1">
              <CheckCircle2 size={14} className="mr-1" /> Signed
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-sm px-3 py-1">
              Awaiting Signature
            </Badge>
          )}
          {isFullyPaid ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-sm px-3 py-1">
              <DollarSign size={14} className="mr-1" /> Paid
            </Badge>
          ) : totalPaid > 0 ? (
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-sm px-3 py-1">
              <DollarSign size={14} className="mr-1" /> Partial
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Quote Summary */}
      {quote && (
        <Card>
          <CardHeader><CardTitle className="text-base">Quote Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Quote</p>
                <p className="font-semibold">{quote.title}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-semibold">{quote.lead?.name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Items</p>
                <p className="font-semibold">{items.length} product{items.length !== 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold text-lg">${total.toFixed(2)}</p>
              </div>
            </div>

            {items.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span className="font-medium">${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contract Text */}
      <Card>
        <CardHeader><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {contract.contract_text}
          </div>
        </CardContent>
      </Card>

      {/* Signature Section */}
      {isSigned ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader><CardTitle className="text-base">Signature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Signed by</p>
                <p className="font-semibold">{contract.signed_by || signerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Signed at</p>
                <p className="font-semibold">
                  {contract.signed_at
                    ? format(new Date(contract.signed_at), "MMM d, yyyy h:mm a")
                    : format(new Date(), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
            {contract.signature_image && (
              <div className="border border-border rounded-lg p-4 bg-background">
                <img src={contract.signature_image} alt="Signature" className="max-h-24 mx-auto" />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Sign Contract</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full legal name"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Signature <span className="text-destructive">*</span></Label>
                <Button variant="ghost" size="sm" onClick={clearSignature} className="h-7 text-xs">
                  <RotateCcw size={12} className="mr-1" /> Clear
                </Button>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg bg-background overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair touch-none"
                  style={{ height: 150 }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              <p className="text-xs text-muted-foreground">Draw your signature above using your mouse or finger.</p>
            </div>

            <Button className="w-full" size="lg" onClick={handleSign} disabled={signing}>
              <FileSignature size={18} className="mr-2" />
              {signing ? "Signing…" : "Sign Contract"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Section - Show after signing */}
      {isSigned && total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard size={18} /> Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Summary */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="font-bold text-lg">${total.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
                <p className="text-muted-foreground text-xs">Paid</p>
                <p className="font-bold text-lg text-emerald-600">${totalPaid.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 text-center">
                <p className="text-muted-foreground text-xs">Remaining</p>
                <p className="font-bold text-lg text-amber-600">${remaining.toFixed(2)}</p>
              </div>
            </div>

            {isFullyPaid ? (
              <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={20} />
                <span className="font-semibold">Fully Paid</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Deposit */}
                  {totalPaid === 0 && (
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col gap-1"
                      onClick={() => handlePayment("deposit")}
                      disabled={!!paymentLoading}
                    >
                      {paymentLoading === "deposit" ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          <span className="font-semibold">Deposit</span>
                          <span className="text-xs text-muted-foreground">
                            {DEPOSIT_PERCENT * 100}% · ${(total * DEPOSIT_PERCENT).toFixed(2)}
                          </span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Full Payment */}
                  <Button
                    className="h-auto py-4 flex flex-col gap-1"
                    onClick={() => handlePayment("full")}
                    disabled={!!paymentLoading}
                  >
                    {paymentLoading === "full" ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span className="font-semibold">Pay in Full</span>
                        <span className="text-xs opacity-80">${remaining.toFixed(2)}</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Custom Partial Payment */}
                <Separator />
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-sm">Custom Amount</Label>
                    <Input
                      type="number"
                      min="0.01"
                      max={remaining}
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={`Up to $${remaining.toFixed(2)}`}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handlePayment("partial")}
                    disabled={!!paymentLoading || !customAmount}
                  >
                    {paymentLoading === "partial" ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      "Pay"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Payment History */}
            {payments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Payment History</p>
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={p.payment_status === "completed" ? "default" : "secondary"}
                          className={p.payment_status === "completed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0" : ""}
                        >
                          {p.payment_status}
                        </Badge>
                        <span className="capitalize">{p.payment_type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">${Number(p.amount).toFixed(2)}</span>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(p.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContractSigningPage;
