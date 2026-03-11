import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeadById, updateLead } from "@/lib/crm/leadService";
import { getNotesByLeadId, createNote, deleteNote } from "@/lib/crm/noteService";
import { getTasksByLeadId, createTask, updateTask } from "@/lib/crm/taskService";
import { getDealsByLeadId, updateDeal } from "@/lib/crm/dealService";
import { getActivityForLead } from "@/lib/crm/activityService";
import { getQuotes, createQuote, type Quote, type QuoteStatus } from "@/lib/crm/quoteService";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import { PIPELINE_STAGES } from "@/types/crm";
import NotesTimeline from "@/components/crm/NotesTimeline";
import TaskList from "@/components/crm/TaskList";
import ActivityTimeline, { type TimelineEvent } from "@/components/crm/ActivityTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Mail, Phone, Plus, DollarSign, CalendarPlus, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const LeadDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { basePath } = useCompanySlug();
  const { user } = useAuth();
  const { can, companyId, workspaceId } = useCrmPermissions();
  const queryClient = useQueryClient();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", due_date: "" });
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ event_name: "", event_date: "", location: "", notes: "" });
  const [converting, setConverting] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ title: "", total_amount: "", notes: "" });

  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ["crm-lead", id],
    queryFn: () => getLeadById(id!),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["crm-notes", id],
    queryFn: () => getNotesByLeadId(id!),
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["crm-tasks", id],
    queryFn: () => getTasksByLeadId(id!),
    enabled: !!id,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["crm-deals", id],
    queryFn: () => getDealsByLeadId(id!),
    enabled: !!id,
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["crm-activity", id],
    queryFn: () => getActivityForLead(id!),
    enabled: !!id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["crm-quotes-lead", id],
    queryFn: async () => {
      const all = await getQuotes();
      return all.filter((q) => q.lead_id === id);
    },
    enabled: !!id,
  });

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    notes.forEach((n) =>
      events.push({ id: `note-${n.id}`, type: "note", description: n.content, timestamp: n.created_at })
    );
    tasks.forEach((t) =>
      events.push({ id: `task-${t.id}`, type: "task", description: `${t.title}${t.status === "done" ? " (completed)" : ""}`, timestamp: t.due_date || "" })
    );
    deals.forEach((d) =>
      events.push({ id: `deal-${d.id}`, type: "deal", description: `${d.title} — $${d.value?.toLocaleString() ?? 0}`, timestamp: d.created_at })
    );
    activityLogs.forEach((a) =>
      events.push({ id: a.id, type: a.type, description: a.description, timestamp: a.timestamp })
    );
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, tasks, deals, activityLogs]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-notes", id] });
    queryClient.invalidateQueries({ queryKey: ["crm-tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["crm-activity", id] });
    queryClient.invalidateQueries({ queryKey: ["crm-quotes-lead", id] });
    queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
  };

  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      createNote({ lead_id: id!, user_id: user?.id || "", content, company_id: companyId, workspace_id: workspaceId } as any),
    onSuccess: () => { invalidateAll(); toast.success("Note added"); },
    onError: () => toast.error("Failed to add note"),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => { invalidateAll(); toast.success("Note deleted"); },
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      invalidateAll();
      setTaskDialogOpen(false);
      setTaskForm({ title: "", description: "", due_date: "" });
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (task: { id: string; status: string }) =>
      updateTask(task.id, { status: task.status === "done" ? "todo" : "done" }),
    onSuccess: () => invalidateAll(),
  });

  const updateStageMutation = useMutation({
    mutationFn: (stage: string) => updateLead(id!, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-lead", id] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-activity", id] });
      toast.success("Status updated");
    },
  });

  const handleCreateTask = () => {
    if (!taskForm.title) return toast.error("Title is required");
    createTaskMutation.mutate({
      lead_id: id!,
      title: taskForm.title,
      description: taskForm.description || undefined,
      due_date: taskForm.due_date || "",
      assigned_to: user?.id || "",
      status: "todo",
      company_id: companyId,
      workspace_id: workspaceId,
    } as any);
  };

  const createQuoteMutation = useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      invalidateAll();
      setQuoteDialogOpen(false);
      setQuoteForm({ title: "", total_amount: "", notes: "" });
      toast.success("Quote created");
    },
    onError: () => toast.error("Failed to create quote"),
  });

  const handleCreateQuote = () => {
    if (!quoteForm.title) return toast.error("Title is required");
    createQuoteMutation.mutate({
      title: quoteForm.title,
      total_amount: quoteForm.total_amount ? parseFloat(quoteForm.total_amount) : 0,
      notes: quoteForm.notes || null,
      status: "draft" as QuoteStatus,
      lead_id: id!,
      company_id: companyId ?? null,
      workspace_id: workspaceId ?? null,
      created_by: user?.id || "",
    });
  };

  const handleConvertToEvent = async () => {
    if (!convertForm.event_name || !convertForm.event_date || !user) return;
    setConverting(true);
    try {
      const { data, error } = await supabase.from("events").insert({
        title: convertForm.event_name,
        event_date: convertForm.event_date,
        location: convertForm.location || null,
        notes: [
          lead?.name ? `Customer: ${lead.name}` : "",
          lead?.phone ? `Phone: ${lead.phone}` : "",
          lead?.email ? `Email: ${lead.email}` : "",
          convertForm.notes,
        ].filter(Boolean).join("\n"),
        created_by: user.id,
      }).select("id").single();
      if (error) throw error;
      toast.success("Event created from lead");
      setConvertOpen(false);
      navigate(`${basePath}/scheduling`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setConverting(false);
    }
  };

  if (leadLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!lead) return <div className="p-6 text-muted-foreground">Lead not found.</div>;

  const stageInfo = PIPELINE_STAGES.find((s) => s.value === lead.stage);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/crm/leads")}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          {lead.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 size={14} /> {lead.company}
            </p>
          )}
        </div>
        {can("update_lead_status") ? (
          <Select value={lead.stage} onValueChange={(v) => updateStageMutation.mutate(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className={stageInfo?.color ? `${stageInfo.color} text-white` : ""}>
            {stageInfo?.label || lead.stage}
          </Badge>
        )}
        <Dialog open={convertOpen} onOpenChange={(o) => {
          setConvertOpen(o);
          if (o) setConvertForm({
            event_name: `${lead.name} Event`,
            event_date: "",
            location: "",
            notes: lead.notes || "",
          });
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarPlus size={14} className="mr-1.5" />Convert to Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Convert Lead to Event</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Event Name <span className="text-destructive">*</span></Label>
                <Input value={convertForm.event_name} onChange={(e) => setConvertForm({ ...convertForm, event_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Event Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={convertForm.event_date} onChange={(e) => setConvertForm({ ...convertForm, event_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Location / Address</Label>
                <Input value={convertForm.location} onChange={(e) => setConvertForm({ ...convertForm, location: e.target.value })} placeholder="Event address" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={convertForm.notes} onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })} rows={3} />
              </div>
              <p className="text-xs text-muted-foreground">Customer info ({lead.name}, {lead.email}, {lead.phone || "no phone"}) will be included in event notes.</p>
              <Button onClick={handleConvertToEvent} className="w-full" disabled={converting || !convertForm.event_name || !convertForm.event_date}>
                {converting ? "Creating…" : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lead Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Lead Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="text-muted-foreground" />
              <span>{lead.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-muted-foreground" />
              <span>{lead.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 size={14} className="text-muted-foreground" />
              <span>{lead.company || "—"}</span>
            </div>
            {lead.source && (
              <div className="text-sm">
                <span className="text-muted-foreground">Source:</span> {lead.source}
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant="secondary" className={stageInfo?.color ? `${stageInfo.color} text-white` : ""}>
                {stageInfo?.label || lead.stage}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Created {format(new Date(lead.created_at), "MMM d, yyyy")}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            {can("add_notes") ? (
              <NotesTimeline
                notes={notes}
                onAddNote={(content) => addNoteMutation.mutate(content)}
                onDeleteNote={(noteId) => deleteNoteMutation.mutate(noteId)}
                isLoading={addNoteMutation.isPending}
              />
            ) : (
              <NotesTimeline notes={notes} isLoading={false} />
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tasks</CardTitle>
            {can("create_tasks") && (
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus size={14} className="mr-1" />Add Task</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Title <span className="text-destructive">*</span></Label>
                      <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Due Date</Label>
                      <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                    </div>
                    <Button onClick={handleCreateTask} className="w-full" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <TaskList tasks={tasks} onToggleStatus={(task) => toggleTaskMutation.mutate(task)} />
          </CardContent>
        </Card>
      </div>

      {/* Deals — only visible to Admin & Sales Manager */}
      {can("manage_deals") && (
        <Card>
          <CardHeader><CardTitle className="text-base">Deals</CardTitle></CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No deals linked to this lead.</p>
            ) : (
              <div className="space-y-3">
                {deals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{deal.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Select
                          value={deal.stage}
                          onValueChange={async (newStage) => {
                            try {
                              await updateDeal(deal.id, { stage: newStage });
                              queryClient.invalidateQueries({ queryKey: ["crm-deals", id] });
                              queryClient.invalidateQueries({ queryKey: ["crm-activity", id] });
                              toast.success("Deal stage updated");

                              if (newStage === "won" && lead && user) {
                                const { data: evt, error } = await supabase.from("events").insert({
                                  title: `${deal.title} — ${lead.name}`,
                                  event_date: deal.expected_close_date || new Date().toISOString().split("T")[0],
                                  location: null,
                                  notes: [
                                    `Deal: ${deal.title} ($${deal.value?.toLocaleString() ?? 0})`,
                                    `Customer: ${lead.name}`,
                                    lead.email ? `Email: ${lead.email}` : "",
                                    lead.phone ? `Phone: ${lead.phone}` : "",
                                    lead.notes || "",
                                  ].filter(Boolean).join("\n"),
                                  created_by: user.id,
                                }).select("id").single();

                                if (!error && evt) {
                                  toast.success("Event created from closed deal — redirecting…");
                                  navigate("/dashboard/scheduling");
                                }
                              }
                            } catch {
                              toast.error("Failed to update deal");
                            }
                          }}
                        >
                          <SelectTrigger className="h-6 text-[11px] w-32 px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["new", "qualified", "proposal", "negotiation", "won", "lost"].map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <DollarSign size={14} />
                      {deal.value?.toLocaleString() ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Quotes</CardTitle>
          <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Receipt size={14} className="mr-1" />New Quote</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Create Quote for {lead.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input value={quoteForm.title} onChange={(e) => setQuoteForm({ ...quoteForm, title: e.target.value })} placeholder="e.g. Birthday Party Package" />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Amount ($)</Label>
                  <Input type="number" min="0" step="0.01" value={quoteForm.total_amount} onChange={(e) => setQuoteForm({ ...quoteForm, total_amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} rows={3} />
                </div>
                <Button onClick={handleCreateQuote} className="w-full" disabled={createQuoteMutation.isPending}>
                  {createQuoteMutation.isPending ? "Creating…" : "Create Quote"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No quotes for this lead yet.</p>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{q.title}</p>
                    <Badge variant="secondary" className="mt-1 capitalize text-xs">{q.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <DollarSign size={14} />
                    {(q.total_amount ?? 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          <ActivityTimeline events={timelineEvents} />
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadDetailPage;
