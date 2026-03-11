import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, ListTodo, DollarSign, CalendarClock, MessageSquare,
  FlaskConical, TrendingUp, Clock, CheckCircle2, BarChart3,
} from "lucide-react";
import {
  format, isToday, addDays, isAfter, isBefore,
  startOfMonth, endOfMonth, differenceInHours, subDays,
} from "date-fns";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useCrmPermissions } from "@/hooks/use-crm-permissions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";

// ── Test data generator ──────────────────────────────────────
const FIRST_NAMES = ["James","Maria","Robert","Linda","John","Patricia","Michael","Jennifer","David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Christopher","Karen","Charles","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra","Donald","Ashley","Steven","Dorothy","Andrew","Kimberly","Paul","Emily","Joshua","Donna","Kenneth","Michelle","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter"];
const COMPANIES_LIST = ["Acme Corp","Globex Inc","Initech","Umbrella Co","Stark Industries","Wayne Enterprises","Oscorp","Cyberdyne Systems","Soylent Corp","Massive Dynamic","Aperture Science","Black Mesa","Tyrell Corp","Weyland-Yutani","Abstergo Industries","Vault-Tec","Momcorp","Planet Express","Prestige Worldwide","Dunder Mifflin"];
const SOURCES_LIST = ["Website","Training Inquiry","Certification Inquiry","Referral","Manual Entry"];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFakeLeads(count: number) {
  return Array.from({ length: count }, () => {
    const first = randomPick(FIRST_NAMES);
    const last = randomPick(LAST_NAMES);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 999)}@example.com`,
      phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      company: randomPick(COMPANIES_LIST),
      source: randomPick(SOURCES_LIST),
      stage: "new",
    };
  });
}

// ── Data fetching ────────────────────────────────────────────
async function getCrmAnalytics(workspaceId?: string | null) {
  const addWsFilter = (query: any) => workspaceId ? query.eq("workspace_id", workspaceId) : query;

  const [leadsRes, tasksRes, dealsRes, notesRes, activityRes] = await Promise.all([
    addWsFilter(supabase.from("crm_leads").select("*").order("created_at", { ascending: false })),
    addWsFilter(supabase.from("crm_tasks").select("*")),
    addWsFilter(supabase.from("crm_deals").select("*")),
    addWsFilter(supabase.from("crm_notes").select("*, crm_leads(name)").order("created_at", { ascending: false }).limit(10)),
    addWsFilter(supabase.from("crm_activity_log").select("*").order("created_at", { ascending: false })),
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (dealsRes.error) throw dealsRes.error;
  if (notesRes.error) throw notesRes.error;
  if (activityRes.error) throw activityRes.error;

  const leads = (leadsRes.data || []) as any[];
  const tasks = (tasksRes.data || []) as any[];
  const deals = (dealsRes.data || []) as any[];
  const notes = (notesRes.data || []) as any[];
  const activities = (activityRes.data || []) as any[];

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekFromNow = addDays(now, 7);

  // Core metrics
  const totalLeads = leads.length;
  const leadsToday = leads.filter((l) => isToday(new Date(l.created_at))).length;
  const tasksDueToday = tasks.filter((t) => t.due_date === todayStr && t.status !== "done").length;

  const closedStages = ["won", "lost", "closed_won", "closed_lost"];
  const wonStages = ["won", "closed_won"];

  const pipelineValue = deals
    .filter((d) => !closedStages.includes(d.stage?.toLowerCase()))
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const dealsClosedThisMonth = deals.filter((d) => {
    if (!wonStages.includes(d.stage?.toLowerCase())) return false;
    const updatedAt = new Date(d.updated_at);
    return isAfter(updatedAt, monthStart) && isBefore(updatedAt, monthEnd);
  });
  const dealsClosedThisMonthValue = dealsClosedThisMonth.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const dealsClosingSoon = deals.filter((d) => {
    if (!d.expected_close_date) return false;
    const closeDate = new Date(d.expected_close_date);
    return isAfter(closeDate, now) && isBefore(closeDate, weekFromNow);
  });

  // Avg lead response time: time between lead_created and first note/task/status change
  const leadCreatedDates = new Map(leads.map((l) => [l.id, new Date(l.created_at)]));
  const firstResponseByLead = new Map<string, Date>();
  activities.forEach((a) => {
    if (a.event_type === "lead_created") return;
    const existing = firstResponseByLead.get(a.lead_id);
    const ts = new Date(a.created_at);
    if (!existing || ts < existing) firstResponseByLead.set(a.lead_id, ts);
  });
  const responseTimes: number[] = [];
  firstResponseByLead.forEach((responseDate, leadId) => {
    const created = leadCreatedDates.get(leadId);
    if (created) responseTimes.push(differenceInHours(responseDate, created));
  });
  const avgResponseTimeHrs = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  // Leads by source for pie chart
  const sourceMap: Record<string, number> = {};
  leads.forEach((l) => {
    const src = l.source || "Unknown";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const leadsBySource = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

  // Leads per day (last 14 days) for area chart
  const leadsPerDay: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = subDays(now, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const label = format(day, "MMM d");
    const count = leads.filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === dayStr).length;
    leadsPerDay.push({ date: label, count });
  }

  // Pipeline stages for bar chart
  const stageMap: Record<string, number> = {};
  leads.forEach((l) => {
    const stage = l.stage || "new";
    stageMap[stage] = (stageMap[stage] || 0) + 1;
  });
  const pipelineStages = Object.entries(stageMap).map(([name, count]) => ({ name, count }));

  return {
    totalLeads,
    leadsToday,
    tasksDueToday,
    pipelineValue,
    dealsClosedThisMonth: dealsClosedThisMonth.length,
    dealsClosedThisMonthValue,
    avgResponseTimeHrs,
    dealsClosingSoon,
    recentNotes: notes,
    leadsBySource,
    leadsPerDay,
    pipelineStages,
  };
}

// ── Chart colors ─────────────────────────────────────────────
const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 55%)",
  "hsl(45, 85%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(280, 60%, 55%)",
  "hsl(20, 80%, 55%)",
];

const CrmDashboardPage = () => {
  const { can, crmRoleLabel, companyId, workspaceId } = useCrmPermissions();
  
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-dashboard", workspaceId],
    queryFn: () => getCrmAnalytics(workspaceId),
  });

  const handleGenerateLeads = async () => {
    setGenerating(true);
    try {
      const leads = generateFakeLeads(50).map((l) => ({ ...l, company_id: companyId }));
      for (let i = 0; i < leads.length; i += 25) {
        const batch = leads.slice(i, i + 25);
        const { error } = await supabase.from("crm_leads").insert(batch);
        if (error) throw error;
      }
      toast.success("50 test leads generated.");
      queryClient.invalidateQueries({ queryKey: ["crm-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const stats = [
    { label: "Total Leads", value: data?.totalLeads ?? 0, icon: Users, color: "text-primary" },
    { label: "Leads Today", value: data?.leadsToday ?? 0, icon: TrendingUp, color: "text-primary" },
    { label: "Tasks Due Today", value: data?.tasksDueToday ?? 0, icon: ListTodo, color: "text-destructive" },
    {
      label: "Pipeline Value",
      value: `$${(data?.pipelineValue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-accent-foreground",
    },
    {
      label: "Closed This Month",
      value: `${data?.dealsClosedThisMonth ?? 0} ($${(data?.dealsClosedThisMonthValue ?? 0).toLocaleString()})`,
      icon: CheckCircle2,
      color: "text-primary",
    },
    {
      label: "Avg Response Time",
      value: data?.avgResponseTimeHrs !== undefined
        ? data.avgResponseTimeHrs < 1 ? "< 1h" : `${data.avgResponseTimeHrs}h`
        : "—",
      icon: Clock,
      color: "text-accent-foreground",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">CRM Dashboard</h1>
          <Badge variant="outline" className="text-xs">{crmRoleLabel}</Badge>
        </div>
        {can("generate_test_data") && (
          <Button variant="outline" size="sm" onClick={handleGenerateLeads} disabled={generating}>
            <FlaskConical size={16} />
            {generating ? "Generating..." : "Generate Test Leads"}
          </Button>
        )}
      </div>

      {/* Stat Cards — 6 metrics in a responsive grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <p className="text-lg font-bold truncate">
                  {isLoading ? "—" : s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      {can("view_reports") && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Leads Trend (Area Chart) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={16} className="text-muted-foreground" />
                Leads (Last 14 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data?.leadsPerDay ?? []}>
                    <defs>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#leadGrad)"
                      name="Leads"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Leads by Source (Pie Chart) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 size={16} className="text-muted-foreground" />
                Leads by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
              ) : !data?.leadsBySource?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.leadsBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.leadsBySource.map((_: any, idx: number) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {/* Legend */}
              {data?.leadsBySource && data.leadsBySource.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {data.leadsBySource.map((s: any, idx: number) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pipeline Stages Bar Chart */}
      {can("view_reports") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} className="text-muted-foreground" />
              Pipeline Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
            ) : !data?.pipelineStages?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pipeline data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.pipelineStages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Grid: Deals Closing Soon + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
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
