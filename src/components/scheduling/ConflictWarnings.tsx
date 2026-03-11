import { AlertTriangle, Package, Truck, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConflictWarning } from "@/hooks/use-event-conflicts";

const iconMap = {
  equipment: Package,
  route: Truck,
  staff: Users,
};

interface ConflictWarningsProps {
  conflicts: ConflictWarning[];
  checking: boolean;
  className?: string;
}

export function ConflictWarnings({ conflicts, checking, className }: ConflictWarningsProps) {
  if (checking) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground py-2", className)}>
        <Loader2 size={14} className="animate-spin" />
        Checking for scheduling conflicts…
      </div>
    );
  }

  if (conflicts.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conflict Warnings</p>
      {conflicts.map((c, i) => {
        const Icon = iconMap[c.type];
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2.5 rounded-md border p-3 text-sm",
              c.severity === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {c.severity === "error" ? <AlertTriangle size={14} /> : <Icon size={14} />}
            </div>
            <div className="min-w-0">
              <p className="font-medium">{c.message}</p>
              {c.details && <p className="text-xs opacity-80 mt-0.5">{c.details}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
