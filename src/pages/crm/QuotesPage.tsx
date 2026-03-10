import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import { getQuotes, createQuote, updateQuote, deleteQuote, type Quote, type QuoteStatus } from "@/lib/crm/quoteService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const { user } = useAuth();
  const { companyId, workspaceId } = useCrmPermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", total_amount: "", notes: "" });
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["crm-quotes"],
    queryFn: () => getQuotes(companyId),
  });

  const createMutation = useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
      setCreateOpen(false);
      setForm({ title: "", total_amount: "", notes: "" });
      toast.success("Quote created");
    },
    onError: () => toast.error("Failed to create quote"),
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

  const handleCreate = () => {
    if (!form.title) return toast.error("Title is required");
    createMutation.mutate({
      title: form.title,
      total_amount: form.total_amount ? parseFloat(form.total_amount) : 0,
      notes: form.notes || null,
      status: "draft",
      lead_id: null,
      company_id: companyId ?? null,
      workspace_id: workspaceId ?? null,
      created_by: user?.id || "",
    });
  };

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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-1.5" />New Quote</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Create Quote</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Birthday Party Package" />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Amount ($)</Label>
                  <Input type="number" min="0" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Optional notes…" />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create Quote"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50">
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
