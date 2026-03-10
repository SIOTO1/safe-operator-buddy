export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source?: string;
  stage: string;
  assigned_to?: string;
  company_id?: string;
  value?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

export type Note = {
  id: string;
  lead_id: string;
  created_by: string;
  content: string;
  company_id?: string;
  created_at: string;
};

export type Task = {
  id: string;
  lead_id: string;
  assigned_to: string;
  title: string;
  description?: string;
  due_date: string;
  status: string;
  priority?: string;
  created_by?: string;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type Deal = {
  id: string;
  lead_id: string;
  title: string;
  value: number;
  stage: string;
  expected_close_date?: string;
  assigned_to?: string;
  created_by?: string;
  notes?: string;
  company_id?: string;
  created_at: string;
  updated_at?: string;
};

export type PipelineStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-sky-500" },
  { value: "qualified", label: "Qualified", color: "bg-amber-500" },
  { value: "proposal", label: "Proposal", color: "bg-purple-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { value: "won", label: "Won", color: "bg-emerald-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
];
