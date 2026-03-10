import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { getContractById, getContractByQuoteId, signContract } from "@/lib/crm/contractService";
import { getQuoteById, getQuoteItems } from "@/lib/crm/quoteService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSignature, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ContractSigningPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orgName } = useOrgSettings();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

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

  // Signature canvas setup
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
        {isSigned ? (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-sm px-3 py-1">
            <CheckCircle2 size={14} className="mr-1" /> Signed
          </Badge>
        ) : (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-sm px-3 py-1">
            Awaiting Signature
          </Badge>
        )}
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
            {(contract.signature_image) && (
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

            <Button
              className="w-full"
              size="lg"
              onClick={handleSign}
              disabled={signing}
            >
              <FileSignature size={18} className="mr-2" />
              {signing ? "Signing…" : "Sign Contract"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContractSigningPage;
