import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
}

const WorkspaceSwitcher = () => {
  const { companyId, workspaceId, setWorkspaceId } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    const fetchWorkspaces = async () => {
      const { data } = await supabase
        .from("workspaces" as any)
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      setWorkspaces((data as unknown as Workspace[]) || []);
      setLoading(false);
    };
    fetchWorkspaces();
  }, [companyId]);

  if (loading || workspaces.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 size={16} className="text-muted-foreground shrink-0" />
      <Select
        value={workspaceId || "all"}
        onValueChange={(v) => setWorkspaceId(v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-[180px] text-sm border-border bg-background">
          <SelectValue placeholder="All Workspaces" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Workspaces</SelectItem>
          {workspaces.map((ws) => (
            <SelectItem key={ws.id} value={ws.id}>
              {ws.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default WorkspaceSwitcher;
