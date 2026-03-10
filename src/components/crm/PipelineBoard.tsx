import { Lead, PIPELINE_STAGES, PipelineStage } from "@/types/crm";
import LeadCard from "./LeadCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PipelineBoardProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
  onStageDrop?: (leadId: string, newStage: PipelineStage) => void;
}

const PipelineBoard = ({ leads, onLeadClick, onStageDrop }: PipelineBoardProps) => {
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId && onStageDrop) {
      onStageDrop(leadId, stage);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage.value);
        return (
          <div
            key={stage.value}
            className="flex-shrink-0 w-72 flex flex-col rounded-lg border border-border bg-muted/30"
            onDrop={(e) => handleDrop(e, stage.value)}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <div className={cn("w-2.5 h-2.5 rounded-full", stage.color)} />
              <h3 className="text-sm font-semibold">{stage.label}</h3>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {stageLeads.length}
              </span>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <LeadCard lead={lead} onClick={onLeadClick} />
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No leads</p>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineBoard;
