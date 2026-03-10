import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeads, updateLeadStage } from "@/lib/crm/leadService";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import PipelineBoard from "@/components/crm/PipelineBoard";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const PipelinePage = () => {
  const queryClient = useQueryClient();
  const { can } = useCrmPermissions();
  const { data: leads = [], isLoading } = useQuery({ queryKey: ["crm-leads"], queryFn: getLeads });

  const stageMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateLeadStage(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-leads"] }),
    onError: () => toast.error("Failed to update stage"),
  });

  // Sales Reps cannot access the pipeline view
  if (!can("view_pipeline")) {
    return <Navigate to="/dashboard/crm/leads" replace />;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pipeline</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <PipelineBoard
          leads={leads}
          onStageDrop={can("edit_lead")
            ? (leadId, newStage) => stageMutation.mutate({ id: leadId, status: newStage })
            : undefined
          }
        />
      )}
    </div>
  );
};

export default PipelinePage;
