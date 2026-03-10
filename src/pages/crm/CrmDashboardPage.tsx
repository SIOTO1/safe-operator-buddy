import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ListTodo, DollarSign, CalendarClock, MessageSquare, FlaskConical } from "lucide-react";
import { format, isToday, addDays, isAfter, isBefore } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const FIRST_NAMES = ["James","Maria","Robert","Linda","John","Patricia","Michael","Jennifer","David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Christopher","Karen","Charles","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra","Donald","Ashley","Steven","Dorothy","Andrew","Kimberly","Paul","Emily","Joshua","Donna","Kenneth","Michelle","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter"];
const COMPANIES = ["Acme Corp","Globex Inc","Initech","Umbrella Co","Stark Industries","Wayne Enterprises","Oscorp","Cyberdyne Systems","Soylent Corp","Massive Dynamic","Aperture Science","Black Mesa","Tyrell Corp","Weyland-Yutani","Abstergo Industries","Vault-Tec","Momcorp","Planet Express","Prestige Worldwide","Dunder Mifflin"];
const SOURCES = ["Website","Training Inquiry","Certification Inquiry","Referral","Manual Entry"];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFakeLeads(count: number) {
  return Array.from({ length: count }, () => {
    const first = randomPick(FIRST_NAMES);
    const last = randomPick(LAST_NAMES);
    const company = randomPick(COMPANIES);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 999)}@example.com`,
      phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      company,
      source: randomPick(SOURCES),
      stage: "new",
    };
  });
}

async function getCrmStats() {
  const [leadsRes, tasksRes, dealsRes, notesRes] = await Promise.all([
    supabase.from("crm_leads" as any).select("*").order("created_at", { ascending: false }),
    supabase.from("crm_tasks" as any).select("*"),
    supabase.from("crm_deals" as any).select("*"),
    supabase.from("crm_notes" as any).select("*, crm_leads(name)" as any).order("created_at", { ascending: false }).limit(10),
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (dealsRes.error) throw dealsRes.error;
  if (notesRes.error) throw notesRes.error;

  const leads = leadsRes.data as any[];
  const tasks = tasksRes.data as any[];
  const deals = dealsRes.data as any[];
  const notes = notesRes.data as any[];

  const leadsToday = leads.filter((l) => isToday(new Date(l.created_at))).length;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tasksDueToday = tasks.filter(
    (t) => t.due_date === todayStr && t.status !== "done"
  ).length;

  const closedStages = ["won", "lost", "closed_won", "closed_lost"];
  const pipelineValue = deals
    .filter((d) => !closedStages.includes(d.stage?.toLowerCase()))
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const now = new Date();
  const weekFromNow = addDays(now, 7);
  const dealsClosingSoon = deals.filter((d) => {
    if (!d.expected_close_date) return false;
    const closeDate = new Date(d.expected_close_date);
    return isAfter(closeDate, now) && isBefore(closeDate, weekFromNow);
  });

  return { leadsToday, tasksDueToday, pipelineValue, dealsClosingSoon, recentNotes: notes };
}

const CrmDashboardPage = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: getCrmStats,
  });

  const handleGenerateLeads = async () => {
    setGenerating(true);
    try {
      const leads = generateFakeLeads(50);
      // Insert in batches of 25
      for (let i = 0; i < leads.length; i += 25) {
        const batch = leads.slice(i, i + 25);
        const { error } = await supabase.from("crm_leads" as any).insert(batch as any);
        if (error) throw error;
      }
      toast({ title: "Success", description: "50 test leads generated." });
      queryClient.invalidateQueries({ queryKey: ["crm-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const isAdmin = role === "owner";

  const stats = [
    { label: "Leads Today", value: data?.leadsToday ?? 0, icon: Users, color: "text-primary" },
    { label: "Tasks Due Today", value: data?.tasksDueToday ?? 0, icon: ListTodo, color: "text-destructive" },
    {
      label: "Pipeline Value",
      value: `$${(data?.pipelineValue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-accent-foreground",
    },
    { label: "Deals Closing Soon", value: data?.dealsClosingSoon?.length ?? 0, icon: CalendarClock, color: "text-primary" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM Dashboard</h1>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateLeads}
            disabled={generating}
          >
            <FlaskConical size={16} />
            {generating ? "Generating..." : "Generate Test Leads"}
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deals Closing Soon */}
        <Card>
          <CardHeader><CardTitle className="text-base">Deals Closing Soon</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !data?.dealsClosingSoon?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No deals closing within 7 days.</p>
            ) : (
              <div className="space-y-3">
                {data.dealsClosingSoon.map((deal: any) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Closes {format(new Date(deal.expected_close_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{deal.stage}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !data?.recentNotes?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {data.recentNotes.map((note: any) => (
                  <div key={note.id} className="flex gap-3">
                    <MessageSquare size={14} className="mt-1 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{note.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {(note as any).crm_leads?.name && (
                          <span className="font-medium text-foreground">{(note as any).crm_leads.name} · </span>
                        )}
                        {format(new Date(note.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CrmDashboardPage;
