import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Receipt, CheckCircle2, XCircle, ArrowDownCircle, RefreshCw, Ban, Pencil } from "lucide-react";
import { format } from "date-fns";

interface PaymentActivityLogProps {
  eventId: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Receipt; color: string }> = {
  payment_created: { label: "Payment Created", icon: Receipt, color: "text-blue-600 bg-blue-500/10" },
  payment_completed: { label: "Payment Completed", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
  payment_failed: { label: "Payment Failed", icon: XCircle, color: "text-destructive bg-destructive/10" },
  deposit_received: { label: "Deposit Received", icon: ArrowDownCircle, color: "text-emerald-600 bg-emerald-500/10" },
  refund_issued: { label: "Refund Issued", icon: RefreshCw, color: "text-amber-600 bg-amber-500/10" },
  payment_voided: { label: "Payment Voided", icon: Ban, color: "text-muted-foreground bg-muted" },
  payment_updated: { label: "Payment Updated", icon: Pencil, color: "text-blue-600 bg-blue-500/10" },
};

export const PaymentActivityLog = ({ eventId }: PaymentActivityLogProps) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["payment-activity-logs", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_activity_logs")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Payment Activity</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
      </Card>
    );
  }

  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt size={16} /> Payment Activity
          <Badge variant="secondary" className="ml-auto text-xs">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className={logs.length > 5 ? "h-[320px]" : ""}>
          <div className="relative pl-6 space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

            {logs.map((log, i) => {
              const config = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.payment_created;
              const Icon = config.icon;
              return (
                <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div className={`absolute -left-6 mt-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon size={12} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold">${Number(log.amount).toFixed(2)}</span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
