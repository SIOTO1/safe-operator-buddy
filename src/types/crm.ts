export type PipelineStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  stage: PipelineStage;
  value: number | null;
  source: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface CrmTask {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type DealStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Deal {
  id: string;
  lead_id: string | null;
  title: string;
  value: number | null;
  stage: DealStage;
  expected_close_date: string | null;
  assigned_to: string | null;
  created_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-sky-500" },
  { value: "qualified", label: "Qualified", color: "bg-amber-500" },
  { value: "proposal", label: "Proposal", color: "bg-purple-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { value: "won", label: "Won", color: "bg-emerald-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
];
