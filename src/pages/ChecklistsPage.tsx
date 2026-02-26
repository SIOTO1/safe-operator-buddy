import { useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface Checklist {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

const defaultChecklists: Checklist[] = [
  {
    id: "pre-delivery",
    title: "Pre-Delivery Checklist",
    description: "Complete before leaving the warehouse",
    items: [
      { id: "1", label: "Unit clean and dry", checked: false },
      { id: "2", label: "All anchor straps present and intact", checked: false },
      { id: "3", label: "Blower tested and operational", checked: false },
      { id: "4", label: "Stakes/sandbags loaded in vehicle", checked: false },
      { id: "5", label: "Extension cords (correct gauge) packed", checked: false },
      { id: "6", label: "Ground tarp included", checked: false },
      { id: "7", label: "Safety signage packed", checked: false },
      { id: "8", label: "First aid kit in vehicle", checked: false },
    ],
  },
  {
    id: "setup",
    title: "Setup Checklist",
    description: "Complete during on-site installation",
    items: [
      { id: "1", label: "Area inspected — clear of debris, holes, overhead wires", checked: false },
      { id: "2", label: "Surface approved (grass, dirt, concrete w/ tarp)", checked: false },
      { id: "3", label: "Unit unrolled and positioned correctly", checked: false },
      { id: "4", label: "Blower connected and inflated", checked: false },
      { id: "5", label: "All anchor points staked/sandbagged", checked: false },
      { id: "6", label: "Safety perimeter established (6ft minimum)", checked: false },
      { id: "7", label: "Electrical connections GFCI protected", checked: false },
      { id: "8", label: "Wind speed checked (below 20 mph)", checked: false },
      { id: "9", label: "Customer safety briefing completed", checked: false },
    ],
  },
  {
    id: "wind-check",
    title: "Wind Check Log",
    description: "Record wind readings during event",
    items: [
      { id: "1", label: "Initial wind check recorded", checked: false },
      { id: "2", label: "1-hour check recorded", checked: false },
      { id: "3", label: "2-hour check recorded", checked: false },
      { id: "4", label: "Wind speed within safe limits (<20 mph)", checked: false },
      { id: "5", label: "Emergency deflation plan reviewed with crew", checked: false },
    ],
  },
  {
    id: "post-event",
    title: "Post-Event Inspection",
    description: "Complete after every rental",
    items: [
      { id: "1", label: "All riders exited unit", checked: false },
      { id: "2", label: "Unit inspected for damage or tears", checked: false },
      { id: "3", label: "Unit cleaned and sanitized", checked: false },
      { id: "4", label: "All stakes/sandbags retrieved", checked: false },
      { id: "5", label: "Cords and blower stored properly", checked: false },
      { id: "6", label: "Unit folded and strapped", checked: false },
      { id: "7", label: "Site restored to original condition", checked: false },
    ],
  },
  {
    id: "incident",
    title: "Incident Report Form",
    description: "Complete if any safety incident occurs",
    items: [
      { id: "1", label: "Date, time, and location documented", checked: false },
      { id: "2", label: "Description of incident written", checked: false },
      { id: "3", label: "Witnesses identified and contacted", checked: false },
      { id: "4", label: "Photos of scene taken", checked: false },
      { id: "5", label: "Unit removed from service if damaged", checked: false },
      { id: "6", label: "Owner/manager notified", checked: false },
    ],
  },
];

const ChecklistsPage = () => {
  const [checklists, setChecklists] = useState<Checklist[]>(defaultChecklists);
  const [expandedId, setExpandedId] = useState<string | null>("pre-delivery");

  const toggleItem = (checklistId: string, itemId: string) => {
    setChecklists(prev =>
      prev.map(cl =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it) }
          : cl
      )
    );
  };

  const getProgress = (cl: Checklist) => {
    const done = cl.items.filter(i => i.checked).length;
    return { done, total: cl.items.length, pct: Math.round((done / cl.items.length) * 100) };
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Safety Checklists</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete checklists for each event</p>
      </div>

      <div className="space-y-4 max-w-3xl">
        {checklists.map((cl) => {
          const { done, total, pct } = getProgress(cl);
          const expanded = expandedId === cl.id;

          return (
            <div key={cl.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : cl.id)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    pct === 100 ? "bg-success/10 text-success" : "bg-accent text-accent-foreground"
                  )}>
                    {pct === 100 ? <CheckCircle2 size={20} /> : <ClipboardCheck size={20} />}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{cl.title}</h3>
                    <p className="text-xs text-muted-foreground">{cl.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-sm font-medium">{done}/{total}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted mt-1">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-2 border-t border-border pt-4">
                      {cl.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(cl.id, item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-sm text-left transition-colors",
                            item.checked ? "bg-success/5" : "hover:bg-muted/50"
                          )}
                        >
                          {item.checked ? (
                            <CheckCircle2 size={18} className="text-success shrink-0" />
                          ) : (
                            <Circle size={18} className="text-muted-foreground shrink-0" />
                          )}
                          <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                      {pct === 100 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm font-medium">
                          <CheckCircle2 size={16} />
                          Checklist complete!
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChecklistsPage;
