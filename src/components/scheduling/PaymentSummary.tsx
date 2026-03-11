import { useState, useEffect } from "react";
import { format, addHours } from "date-fns";
import { DollarSign, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface PaymentSummaryProps {
  eventId: string;
  eventDate: string;
  quoteId: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  payment_status: string;
  payment_type: string;
  created_at: string;
}

type PaymentBadgeStatus = "paid" | "deposit_paid" | "balance_due" | "payment_failed";

const STATUS_STYLES: Record<PaymentBadgeStatus, string> = {
  paid: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700",
  deposit_paid: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700",
  balance_due: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
  payment_failed: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_LABELS: Record<PaymentBadgeStatus, string> = {
  paid: "Paid",
  deposit_paid: "Deposit Paid",
  balance_due: "Balance Due",
  payment_failed: "Payment Failed",
};

export const PaymentSummary = ({ eventId, eventDate, quoteId }: PaymentSummaryProps) => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // Fetch payments for this event
        const { data: paymentData } = await supabase
          .from("payments")
          .select("id, amount, payment_status, payment_type, created_at")
          .eq("event_id", eventId)
          .order("created_at");

        setPayments((paymentData || []) as PaymentRow[]);

        // Fetch quote total if linked
        if (quoteId) {
          const { data: quoteData } = await supabase
            .from("quotes")
            .select("total_amount")
            .eq("id", quoteId)
            .single();
          setTotalPrice(quoteData?.total_amount ?? 0);
        } else {
          // Fallback: sum all successful payments as total if no quote
          const successfulTotal = (paymentData || [])
            .filter((p: any) => p.payment_status === "completed")
            .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
          setTotalPrice(successfulTotal);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [eventId, quoteId]);

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const successfulPayments = payments.filter(p => p.payment_status === "completed");
  const failedPayments = payments.filter(p => p.payment_status === "failed");
  const depositPayments = successfulPayments.filter(p => p.payment_type === "deposit");
  const totalPaid = successfulPayments.reduce((s, p) => s + Number(p.amount), 0);
  const depositPaid = depositPayments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, totalPrice - totalPaid);

  // Determine overall status
  let status: PaymentBadgeStatus = "balance_due";
  if (failedPayments.length > 0 && remaining > 0) {
    status = "payment_failed";
  } else if (remaining <= 0 && totalPaid > 0) {
    status = "paid";
  } else if (depositPaid > 0 && remaining > 0) {
    status = "deposit_paid";
  }

  // Next scheduled charge: 48h before event
  const eventDateObj = new Date(eventDate + "T00:00:00");
  const autoChargeDate = addHours(eventDateObj, -48);
  const now = new Date();
  const hasUpcomingCharge = remaining > 0 && autoChargeDate > now;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign size={16} /> Payment Summary
        </CardTitle>
        <Badge variant="outline" className={cn("text-xs", STATUS_STYLES[status])}>
          {STATUS_LABELS[status]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Event Price</span>
            <span className="font-medium">${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit Paid</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${depositPaid.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${totalPaid.toFixed(2)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Remaining Balance</span>
            <span className={cn("font-semibold", remaining > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400")}>
              ${remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {hasUpcomingCharge && (
          <>
            <Separator />
            <div className="flex items-start gap-2 text-xs">
              <CalendarClock size={14} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">Next Scheduled Payment</p>
                <p className="text-muted-foreground">
                  ${remaining.toFixed(2)} auto-charge on {format(autoChargeDate, "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </>
        )}

        {failedPayments.length > 0 && (
          <>
            <Separator />
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
              <p className="text-xs font-medium text-destructive">
                {failedPayments.length} payment{failedPayments.length > 1 ? "s" : ""} failed
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                The customer has been notified. Manual follow-up may be needed.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
