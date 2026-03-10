import { format } from "date-fns";
import { MessageSquare, ListTodo, DollarSign, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  type: "note" | "task" | "deal" | "status_change";
  description: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

const iconMap: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  note_added: MessageSquare,
  task: ListTodo,
  task_created: ListTodo,
  task_completed: ListTodo,
  deal: DollarSign,
  deal_created: DollarSign,
  deal_updated: DollarSign,
  status_change: ArrowRightLeft,
  lead_status_changed: ArrowRightLeft,
  lead_created: ArrowRightLeft,
};

const labelMap: Record<string, string> = {
  note: "Note",
  note_added: "Note Added",
  task: "Task",
  task_created: "Task Created",
  task_completed: "Task Completed",
  deal: "Deal",
  deal_created: "Deal Created",
  deal_updated: "Deal Updated",
  status_change: "Status Change",
  lead_status_changed: "Status Change",
  lead_created: "Lead Created",
};

const colorMap: Record<string, string> = {
  note: "bg-primary/10 text-primary",
  note_added: "bg-primary/10 text-primary",
  task: "bg-accent text-accent-foreground",
  task_created: "bg-accent text-accent-foreground",
  task_completed: "bg-accent text-accent-foreground",
  deal: "bg-chart-4/20 text-chart-4",
  deal_created: "bg-chart-4/20 text-chart-4",
  deal_updated: "bg-chart-4/20 text-chart-4",
  status_change: "bg-secondary text-secondary-foreground",
  lead_status_changed: "bg-secondary text-secondary-foreground",
  lead_created: "bg-secondary text-secondary-foreground",
};

const ActivityTimeline = ({ events }: ActivityTimelineProps) => {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>;
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />

      {events.map((event) => {
        const Icon = iconMap[event.type] || MessageSquare;
        return (
          <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            <div className={cn("relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0", colorMap[event.type] || "bg-muted text-muted-foreground")}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {labelMap[event.type] || event.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.timestamp), "MMM d, yyyy · h:mm a")}
                </span>
              </div>
              <p className="text-sm">{event.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;
