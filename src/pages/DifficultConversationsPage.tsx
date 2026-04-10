import { useState, useEffect, useMemo } from "react";
import { MessageSquareWarning, ChevronDown, ChevronRight, Copy, Check, AlertTriangle, Users, UserX, ShieldAlert, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Scenario = {
  id: string;
  title: string;
  category: "customer" | "performance" | "termination";
  severity: "moderate" | "serious" | "critical";
  context: string;
  doList: string[];
  dontList: string[];
  script: string[];
  followUp: string[];
};

const scenarios: Scenario[] = [
  // Customer Complaints
  {
    id: "c1",
    title: "Equipment Arrived Late",
    category: "customer",
    severity: "serious",
    context: "Customer is upset because the bounce house arrived 45+ minutes late to a birthday party. Guests are waiting.",
    doList: [
      "Acknowledge the inconvenience immediately",
      "Take full responsibility — no excuses about traffic",
      "Offer a concrete remedy (discount, extended time, free add-on)",
      "Document the incident for internal review",
    ],
    dontList: [
      "Blame the driver or traffic in front of the customer",
      "Minimize their frustration ('it's only 45 minutes')",
      "Promise something you can't deliver",
    ],
    script: [
      "\"I completely understand your frustration, and I sincerely apologize. A late arrival to a birthday party is unacceptable.\"",
      "\"Here's what I'd like to do: I'm going to extend your rental time by [X hours] at no charge, and I'd also like to offer you [15-20%] off today's rental.\"",
      "\"I want to make sure [child's name]'s party is still a great experience. Can I also add [small add-on item] complimentary?\"",
      "\"I'll personally follow up with you on Monday to make sure everything was resolved to your satisfaction.\"",
    ],
    followUp: [
      "Call the customer within 48 hours to check satisfaction",
      "Review the driver's route and schedule for that day",
      "Add buffer time for future bookings in that area",
    ],
  },
  {
    id: "c2",
    title: "Equipment Was Dirty or Damaged",
    category: "customer",
    severity: "serious",
    context: "A customer calls mid-event to report the inflatable smells bad, has visible stains, or a minor tear.",
    doList: [
      "Apologize sincerely and validate their concern",
      "Ask for photos if possible for documentation",
      "Offer to send a replacement unit if available",
      "Issue a partial refund or credit for future booking",
    ],
    dontList: [
      "Tell them 'that's normal wear and tear'",
      "Ask them to clean it themselves",
      "Dismiss safety concerns about tears or damage",
    ],
    script: [
      "\"I'm very sorry to hear that. The condition of our equipment is extremely important to us, and this shouldn't have happened.\"",
      "\"Can you send me a quick photo so I can assess the situation? I want to make sure it's safe for the kids.\"",
      "\"I have [replacement unit] available — I can have it to you within [timeframe]. In the meantime, I'm going to credit your account $[amount].\"",
      "\"Thank you for letting us know. This helps us improve our quality checks.\"",
    ],
    followUp: [
      "Pull the unit from rotation for deep cleaning/repair",
      "Review cleaning logs — who cleaned it last?",
      "Update inspection checklist if a gap is found",
    ],
  },
  {
    id: "c3",
    title: "Customer Demands Full Refund",
    category: "customer",
    severity: "critical",
    context: "A customer is demanding a full refund due to a weather cancellation, claiming they weren't told about the policy.",
    doList: [
      "Stay calm and empathetic — they're disappointed",
      "Reference the signed contract and cancellation policy",
      "Offer a reasonable alternative (reschedule, partial credit)",
      "Document everything in writing",
    ],
    dontList: [
      "Get defensive or argue about what they 'should have known'",
      "Refuse any accommodation — rigidity loses customers",
      "Make verbal promises without written confirmation",
    ],
    script: [
      "\"I completely understand your disappointment. Nobody wants their event rained out.\"",
      "\"Let me pull up your contract so we can review the weather policy together. I want to make sure we handle this fairly.\"",
      "\"While our policy does state [specific clause], I want to work with you. I can offer [full reschedule at no extra cost / 50% credit toward future booking].\"",
      "\"I'll send you an email confirming exactly what we agreed on today so there's no confusion.\"",
    ],
    followUp: [
      "Send written confirmation within 1 hour",
      "Flag the booking for the reschedule in your system",
      "Review if your weather policy wording needs to be clearer",
    ],
  },
  // Performance Issues
  {
    id: "p1",
    title: "Crew Member Consistently Late",
    category: "performance",
    severity: "moderate",
    context: "A crew member has been late to their shift 3+ times in the past month. Other team members are covering.",
    doList: [
      "Have a private, one-on-one conversation",
      "Use specific dates and times — no vague accusations",
      "Ask if there's an underlying issue (transportation, schedule conflict)",
      "Set clear expectations with a documented improvement plan",
    ],
    dontList: [
      "Call them out in front of the team",
      "Let it slide because 'they're a good worker otherwise'",
      "Threaten termination in the first conversation",
    ],
    script: [
      "\"Hey [Name], I wanted to check in with you privately. I've noticed you've arrived late on [date], [date], and [date]. I want to understand what's going on.\"",
      "\"Is there something happening that's making it hard to get here on time? I want to help if I can.\"",
      "\"Here's what I need going forward: you need to be on-site and ready by [time]. If something comes up, I need a text at least 30 minutes before your shift.\"",
      "\"I'm going to document this conversation. If the pattern continues, we'll need to move to a formal write-up. I'd rather avoid that — I value you on this team.\"",
    ],
    followUp: [
      "Document the conversation with date and agreed actions",
      "Check in after 1 week to acknowledge improvement or escalate",
      "Consider if schedule adjustments could help",
    ],
  },
  {
    id: "p2",
    title: "Poor Setup Quality / Cutting Corners",
    category: "performance",
    severity: "serious",
    context: "You've received complaints or noticed a crew member isn't following safety protocols during setup (skipping stakes, loose connections).",
    doList: [
      "Address it immediately — this is a safety issue",
      "Be specific about what was missed and why it matters",
      "Re-train on the spot if needed",
      "Frame it around safety, not punishment",
    ],
    dontList: [
      "Ignore it because 'nothing bad happened yet'",
      "Assume they know the correct procedure",
      "Only address it through text message",
    ],
    script: [
      "\"[Name], I need to talk to you about the setup at [location/date]. I noticed [specific issue: only 2 of 4 stakes were used / the GFCI wasn't connected / the blower wasn't secured].\"",
      "\"I know it might seem like a small thing, but this is a safety issue. If that unit lifts in the wind, we're looking at injuries and a lawsuit. I need you to understand how serious this is.\"",
      "\"Let's walk through the full setup procedure together right now. I want to make sure you're confident in every step.\"",
      "\"Going forward, I need every stake in, every connection checked, every time. No shortcuts. Can I count on you for that?\"",
    ],
    followUp: [
      "Do a surprise quality check on their next 2-3 setups",
      "Pair them with a senior crew member for mentoring",
      "If it continues, escalate to written warning",
    ],
  },
  {
    id: "p3",
    title: "Unprofessional Behavior at Customer Site",
    category: "performance",
    severity: "critical",
    context: "A customer reported that a crew member was rude, used inappropriate language, or was on their phone during the event.",
    doList: [
      "Get the full story from the customer first",
      "Have a private conversation with the employee",
      "Explain the impact on the business and reputation",
      "Issue a formal written warning",
    ],
    dontList: [
      "Confront them based only on the customer's account without hearing their side",
      "Let it go with just a verbal 'heads up'",
      "Discuss specific customer details with other crew",
    ],
    script: [
      "\"[Name], I received feedback from the customer at [event]. They reported [specific behavior]. I want to hear your side of things.\"",
      "\"[After listening] I understand situations can be frustrating, but here's what I need you to understand: every event is a representation of our company. One bad interaction can cost us thousands in future business.\"",
      "\"I'm issuing a written warning for this. I need to see a professional, courteous attitude at every event going forward.\"",
      "\"I believe you can do this — that's why you're on the team. But I need to see the change immediately.\"",
    ],
    followUp: [
      "Call the customer to apologize and offer a discount on next booking",
      "File the written warning in the employee's record",
      "Follow up with the employee after their next event",
    ],
  },
  // Termination
  {
    id: "t1",
    title: "Termination for Safety Violations",
    category: "termination",
    severity: "critical",
    context: "An employee has had repeated safety violations despite warnings and retraining. It's time to let them go.",
    doList: [
      "Have all documentation ready (warnings, incident reports, training records)",
      "Have a witness present (manager or HR)",
      "Be direct but respectful — don't drag it out",
      "Explain final pay, return of company property, and any benefits",
    ],
    dontList: [
      "Do it in front of other employees",
      "Get emotional or make it personal",
      "Negotiate or give 'one more chance' if you've decided",
      "Allow access to company vehicles or equipment after the conversation",
    ],
    script: [
      "\"[Name], thank you for coming in. I need to have a difficult conversation with you today. [Witness name] is here with us.\"",
      "\"As you know, we've discussed safety issues on [date], [date], and [date]. Despite retraining on [date], the pattern has continued with [most recent incident].\"",
      "\"I've made the decision to end your employment effective today. This wasn't an easy decision, but safety is non-negotiable in our business.\"",
      "\"Here's what happens next: your final paycheck will be [mailed/direct deposited] by [date]. I'll need your company [keys/shirt/badge] returned today.\"",
      "\"I wish you the best going forward. Do you have any questions about the process?\"",
    ],
    followUp: [
      "Process final paycheck per state labor laws",
      "Collect all company property (keys, uniforms, equipment)",
      "Update team schedule and redistribute responsibilities",
      "Brief the team without sharing private details",
    ],
  },
  {
    id: "t2",
    title: "Letting Go a Seasonal / Part-Time Worker",
    category: "termination",
    severity: "moderate",
    context: "Season is ending or workload has decreased. You need to let a part-time or seasonal crew member go.",
    doList: [
      "Give as much notice as possible",
      "Be honest about the reason — it's business, not performance",
      "Offer to be a reference if their work was good",
      "Leave the door open for next season if appropriate",
    ],
    dontList: [
      "Ghost them or just stop scheduling shifts",
      "Make vague promises about 'calling them back soon'",
      "Wait until they ask why they haven't been scheduled",
    ],
    script: [
      "\"[Name], I wanted to talk to you about the schedule going forward. As you know, our busy season is winding down.\"",
      "\"Unfortunately, I'm not going to be able to keep you on the regular schedule after [date]. This isn't a reflection of your work — you've been great.\"",
      "\"I'd love to bring you back when things pick up in [month/season]. I'll reach out to you first.\"",
      "\"In the meantime, I'm happy to be a reference for you. You've been a solid part of the team.\"",
    ],
    followUp: [
      "Put them on a 'rehire' list with notes on their strengths",
      "Send a thank-you text or card — small gestures build loyalty",
      "Reach out 2-3 weeks before next season starts",
    ],
  },
  {
    id: "t3",
    title: "Termination for No-Call No-Show",
    category: "termination",
    severity: "critical",
    context: "An employee didn't show up for a scheduled event and didn't call. This left your team scrambling and potentially impacted a customer.",
    doList: [
      "Attempt to contact them first — make sure they're safe",
      "Document every attempt to reach them",
      "If they respond, have the conversation in person",
      "Follow your company's no-call no-show policy exactly",
    ],
    dontList: [
      "Fire them over text message",
      "Assume the worst without trying to reach them",
      "Make exceptions that undermine your policy for the rest of the team",
    ],
    script: [
      "\"[Name], you were scheduled for [event] on [date] and didn't show up or call. I tried reaching you at [times]. I need to understand what happened.\"",
      "\"[If no valid emergency] I understand things come up, but a no-call no-show puts the entire team in a tough spot. We had to [scramble to cover / short-staff the event].\"",
      "\"Our policy is clear that [one/two] no-call no-shows result in termination. Based on this, I'm going to have to end your employment.\"",
      "\"Your final check will be processed by [date]. I need [company property] returned by [date].\"",
    ],
    followUp: [
      "Document everything for your records",
      "Debrief with the team on how the gap was covered",
      "Review if you have enough backup crew for emergencies",
    ],
  },
];

const categoryConfig = {
  customer: { label: "Customer Complaints", icon: ShieldAlert, color: "text-primary" },
  performance: { label: "Performance Issues", icon: Users, color: "text-chart-4" },
  termination: { label: "Terminations", icon: UserX, color: "text-destructive" },
};

const severityConfig = {
  moderate: { label: "Moderate", class: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
  serious: { label: "Serious", class: "bg-primary/10 text-primary border-primary/20" },
  critical: { label: "Critical", class: "bg-destructive/10 text-destructive border-destructive/20" },
};

const DifficultConversationsPage = () => {
  const { role, companyId } = useAuth();
  const isManager = role === "owner" || role === "manager";

  const [selectedCategory, setSelectedCategory] = useState<"customer" | "performance" | "termination" | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ── Custom guides from database ── */
  const [customGuides, setCustomGuides] = useState<Scenario[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGuide, setNewGuide] = useState({
    title: "",
    category: "customer" as "customer" | "performance" | "termination",
    severity: "moderate" as "moderate" | "serious" | "critical",
    context: "",
    doList: "",
    dontList: "",
    script: "",
    followUp: "",
  });

  const fetchCustomGuides = async () => {
    const { data, error } = await supabase
      .from("conversation_guides")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.error(error); return; }
    if (data) {
      setCustomGuides(data.map((g: any) => ({
        id: `db-${g.id}`,
        title: g.title,
        category: g.category || "customer",
        severity: g.severity || "moderate",
        context: g.context || "",
        doList: g.do_list || [],
        dontList: g.dont_list || [],
        script: g.script_lines || [],
        followUp: g.follow_up || [],
      })));
    }
  };

  useEffect(() => { fetchCustomGuides(); }, []);

  const handleSaveGuide = async () => {
    if (!newGuide.title.trim() || !newGuide.context.trim()) { toast.error("Title and context are required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("conversation_guides").insert({
        company_id: companyId!,
        title: newGuide.title,
        category: newGuide.category,
        severity: newGuide.severity,
        context: newGuide.context,
        do_list: newGuide.doList.split("\n").filter(Boolean),
        dont_list: newGuide.dontList.split("\n").filter(Boolean),
        script_lines: newGuide.script.split("\n").filter(Boolean),
        follow_up: newGuide.followUp.split("\n").filter(Boolean),
      });
      if (error) throw error;
      toast.success("Conversation guide added");
      setDialogOpen(false);
      setNewGuide({ title: "", category: "customer", severity: "moderate", context: "", doList: "", dontList: "", script: "", followUp: "" });
      fetchCustomGuides();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ── Merge static + custom ── */
  const allScenarios = useMemo(() => [...scenarios, ...customGuides], [customGuides]);
  const filtered = selectedCategory ? allScenarios.filter(s => s.category === selectedCategory) : allScenarios;

  const copyScript = (scenario: Scenario) => {
    const text = scenario.script.join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId(scenario.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Difficult Conversations</h1>
          <p className="text-muted-foreground text-sm mt-1">Scripts and talking points for tough situations</p>
        </div>
        {isManager && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> Add Guide
          </Button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 max-w-3xl">
        <AlertTriangle size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Use as a Guide</p>
          <p className="text-muted-foreground mt-1">
            These scripts are starting points — adapt them to your situation, tone, and relationship. Always consult legal counsel for terminations. Follow your state's labor laws.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
            !selectedCategory ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"
          )}
        >
          All ({allScenarios.length})
        </button>
        {(Object.entries(categoryConfig) as [keyof typeof categoryConfig, typeof categoryConfig[keyof typeof categoryConfig]][]).map(([key, cfg]) => {
          const count = allScenarios.filter(s => s.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                selectedCategory === key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"
              )}
            >
              <cfg.icon size={16} />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Scenarios */}
      <div className="space-y-3">
        {filtered.map((scenario, i) => {
          const isExpanded = expandedId === scenario.id;
          const sev = severityConfig[scenario.severity];
          const cat = categoryConfig[scenario.category];

          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : scenario.id)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <cat.icon size={20} className={cat.color} />
                        <div className="min-w-0">
                          <CardTitle className="text-base">{scenario.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{scenario.context}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={sev.class}>{sev.label}</Badge>
                        {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 space-y-5">
                        {/* Context */}
                        <div className="p-3 rounded-lg bg-muted/50 text-sm">
                          <span className="font-semibold">Situation:</span> {scenario.context}
                        </div>

                        {/* Do / Don't */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-chart-2 mb-2">Do</h4>
                            <ul className="space-y-1.5">
                              {scenario.doList.map((item, j) => (
                                <li key={j} className="text-sm text-muted-foreground flex gap-2">
                                  <span className="text-chart-2 shrink-0">•</span>{item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-destructive mb-2">Don't</h4>
                            <ul className="space-y-1.5">
                              {scenario.dontList.map((item, j) => (
                                <li key={j} className="text-sm text-muted-foreground flex gap-2">
                                  <span className="text-destructive shrink-0">•</span>{item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Script */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold">Sample Script</h4>
                            <button
                              onClick={() => copyScript(scenario)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedId === scenario.id ? <><Check size={14} className="text-chart-2" /> Copied</> : <><Copy size={14} /> Copy Script</>}
                            </button>
                          </div>
                          <div className="space-y-2">
                            {scenario.script.map((line, j) => (
                              <div key={j} className="p-3 rounded-lg bg-muted/30 border border-border text-sm italic text-foreground/90">
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Follow Up */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Follow-Up Actions</h4>
                          <ul className="space-y-1.5">
                            {scenario.followUp.map((item, j) => (
                              <li key={j} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-primary shrink-0">{j + 1}.</span>{item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add Guide Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Conversation Guide</DialogTitle>
            <DialogDescription>Create a custom script for a difficult conversation scenario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={newGuide.title} onChange={e => setNewGuide({ ...newGuide, title: e.target.value })} placeholder="e.g. Employee Caught Stealing" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={newGuide.category} onValueChange={v => setNewGuide({ ...newGuide, category: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer Complaints</SelectItem>
                    <SelectItem value="performance">Performance Issues</SelectItem>
                    <SelectItem value="termination">Terminations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={newGuide.severity} onValueChange={v => setNewGuide({ ...newGuide, severity: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Context / Situation *</Label>
              <textarea
                value={newGuide.context}
                onChange={e => setNewGuide({ ...newGuide, context: e.target.value })}
                placeholder="Describe the situation..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <Label>Do List (one per line)</Label>
              <textarea
                value={newGuide.doList}
                onChange={e => setNewGuide({ ...newGuide, doList: e.target.value })}
                placeholder="Stay calm&#10;Listen first&#10;Document everything"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <Label>Don't List (one per line)</Label>
              <textarea
                value={newGuide.dontList}
                onChange={e => setNewGuide({ ...newGuide, dontList: e.target.value })}
                placeholder="Don't raise your voice&#10;Don't make promises"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <Label>Script Lines (one per line)</Label>
              <textarea
                value={newGuide.script}
                onChange={e => setNewGuide({ ...newGuide, script: e.target.value })}
                placeholder="Opening line...&#10;Follow-up line..."
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <Label>Follow-Up Actions (one per line)</Label>
              <textarea
                value={newGuide.followUp}
                onChange={e => setNewGuide({ ...newGuide, followUp: e.target.value })}
                placeholder="Document the conversation&#10;Follow up in 1 week"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGuide} disabled={saving}>{saving ? "Saving..." : "Add Guide"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DifficultConversationsPage;
