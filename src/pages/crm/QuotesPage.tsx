import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import { getQuotes, updateQuote, deleteQuote, type QuoteStatus } from "@/lib/crm/quoteService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, FileText, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  expired: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const QuotesPage = () => {
  const { companyId } = useCrmPermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["crm-quotes"],
    queryFn: () => getQuotes(companyId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) => updateQuote(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
      toast.success("Quote status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
      toast.success("Quote deleted");
    },
  });

  const filtered = filterStatus === "all" ? quotes : quotes.filter((q) => q.status === filterStatus);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading quotes…</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-1">{quotes.length} total quotes</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/dashboard/quotes/create")}>
            <Plus size={16} className="mr-1.5" />New Quote
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto mb-2 text-muted-foreground/50" size={32} />
                    No quotes found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/dashboard/crm/quotes/${q.id}`)}>
                    <TableCell className="font-medium">{q.title || "Untitled"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{q.lead?.name || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={q.status}
                        onValueChange={(v) => updateStatusMutation.mutate({ id: q.id, status: v as QuoteStatus })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <Badge className={STATUS_COLORS[q.status] + " capitalize border-0"}>{q.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(["draft", "sent", "accepted", "expired"] as QuoteStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className="flex items-center justify-end gap-0.5">
                        <DollarSign size={13} />{(q.total_amount ?? 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(q.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(q.id); }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesPage;
