import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, createTask, updateTask } from "@/lib/crm/taskService";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import TaskList from "@/components/crm/TaskList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const TasksPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can, companyId, workspaceId } = useCrmPermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", assigned_to: "" });

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["crm-tasks", workspaceId], queryFn: () => getTasks(workspaceId) });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      setDialogOpen(false);
      setForm({ title: "", description: "", due_date: "", assigned_to: "" });
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });

  const toggleMutation = useMutation({
    mutationFn: (task: { id: string; status: string }) =>
      updateTask(task.id, { status: task.status === "done" ? "todo" : "done" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-tasks"] }),
  });

  const handleCreate = () => {
    if (!form.title) return toast.error("Title is required");
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      due_date: form.due_date || new Date().toISOString(),
      status: "todo",
      lead_id: "",
      assigned_to: form.assigned_to || user?.id || "",
      company_id: companyId,
    } as any);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM Tasks</h1>
        {can("create_tasks") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" />Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <TaskList tasks={tasks} onToggleStatus={(t) => toggleMutation.mutate(t)} />
      )}
    </div>
  );
};

export default TasksPage;
