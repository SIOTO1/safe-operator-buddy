import { CrmTask } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: CrmTask[];
  onToggleStatus: (task: CrmTask) => void;
  onSelectTask?: (task: CrmTask) => void;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent text-accent-foreground",
  high: "bg-destructive text-destructive-foreground",
};

const TaskList = ({ tasks, onToggleStatus, onSelectTask }: TaskListProps) => {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No tasks found.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow cursor-pointer",
            task.status === "done" && "opacity-60"
          )}
          onClick={() => onSelectTask?.(task)}
        >
          <Checkbox
            checked={task.status === "done"}
            onCheckedChange={(e) => {
              e && onToggleStatus(task);
              if (!e) onToggleStatus(task);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", task.status === "done" && "line-through")}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={cn("text-xs", priorityColors[task.priority])} variant="secondary">
                {task.priority}
              </Badge>
              {task.due_date && (
                <span className="text-xs text-muted-foreground">
                  Due {format(new Date(task.due_date), "MMM d")}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
