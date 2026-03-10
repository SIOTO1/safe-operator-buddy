import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeads, updateLeadStage } from "@/lib/crm/leadService";
import PipelineBoard from "@/components/crm/PipelineBoard";
import { PipelineStage } from "@/types/crm";
import { toast } from "sonner";

const PipelinePage = () => {
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({ queryKey: ["crm-leads"], queryFn: getLeads });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: PipelineStage }) => updateLeadStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-leads"] }),
    onError: () => toast.error("Failed to update stage"),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pipeline</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <PipelineBoard
          leads={leads}
          onStageDrop={(leadId, newStage) => stageMutation.mutate({ id: leadId, stage: newStage })}
        />
      )}
    </div>
  );
};

export default PipelinePage;
