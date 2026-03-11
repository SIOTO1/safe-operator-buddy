import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Package, CalendarIcon, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

const BookingSuccessPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "confirmed" | "error">("loading");
  const [bookingData, setBookingData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("No payment session found.");
      return;
    }

    const confirmPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("confirm-booking-payment", {
          body: { session_id: sessionId },
        });

        if (error || data?.error) {
          setStatus("error");
          setErrorMsg(data?.error || "Failed to confirm payment.");
          return;
        }

        if (data?.status === "confirmed" || data?.status === "already_processed") {
          setBookingData(data);
          setStatus("confirmed");
          // Clear cart from localStorage
          if (slug) localStorage.removeItem(`storefront-cart-${slug}`);
        } else {
          setStatus("error");
          setErrorMsg("Payment was not completed.");
        }
      } catch {
        setStatus("error");
        setErrorMsg("An unexpected error occurred.");
      }
    };

    confirmPayment();
  }, [sessionId, slug]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {status === "loading" && (
            <>
              <Loader2 size={48} className="mx-auto animate-spin text-primary" />
              <div>
                <h1 className="font-display font-bold text-xl">Confirming Your Booking...</h1>
                <p className="text-muted-foreground text-sm mt-1">Please wait while we process your payment.</p>
              </div>
            </>
          )}

          {status === "confirmed" && bookingData && (
            <>
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} className="text-success" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl">Booking Confirmed!</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Your deposit has been processed and your event is booked.
                </p>
              </div>

              <Separator />

              <div className="text-left space-y-3">
                <div className="flex items-start gap-3">
                  <DollarSign size={18} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Payment Summary</p>
                    <p className="text-xs text-muted-foreground">
                      Deposit Paid: <span className="font-semibold text-foreground">${bookingData.deposit_amount?.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance Due: <span className="font-semibold text-foreground">${bookingData.balance_due?.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">${bookingData.subtotal?.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground">
                A confirmation email has been sent. We'll contact you with setup details closer to your event.
              </p>

              <Button asChild variant="outline" className="w-full">
                <Link to={`/rentals/${slug}`}>Back to Store</Link>
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle size={36} className="text-destructive" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl">Something Went Wrong</h1>
                <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
              </div>
              <Button asChild variant="outline">
                <Link to={`/rentals/${slug}`}>Back to Store</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingSuccessPage;