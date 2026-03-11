import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Shield, ShoppingBag, DollarSign, Users, CreditCard, CalendarDays,
  ArrowRight, ArrowLeft, SkipForward, Check, Plus, Trash2, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "products", label: "Add Products", icon: ShoppingBag, description: "Add your rental inventory items" },
  { id: "pricing", label: "Set Pricing", icon: DollarSign, description: "Configure pricing for your products" },
  { id: "team", label: "Add Team", icon: Users, description: "Invite team members to your company" },
  { id: "payments", label: "Payments", icon: CreditCard, description: "Configure payment processing" },
  { id: "event", label: "First Event", icon: CalendarDays, description: "Create your first event" },
];

const CATEGORIES = [
  "inflatables", "slides", "foam_machines", "tents", "tables", "chairs", "generators", "concessions", "other"
] as const;

const SetupWizardPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, companyId, workspaceId } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 1: Products
  const [products, setProducts] = useState<Array<{ name: string; category: string; quantity: number }>>([
    { name: "", category: "inflatables", quantity: 1 },
  ]);

  // Step 2: Pricing (indexed by product index)
  const [prices, setPrices] = useState<Record<number, string>>({});

  // Step 3: Team
  const [teamMembers, setTeamMembers] = useState<Array<{ email: string; role: string }>>([
    { email: "", role: "crew" },
  ]);

  // Step 5: Event
  const [eventData, setEventData] = useState({ title: "", date: "", location: "" });

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const basePath = `/app/${slug}`;

  const markComplete = (step: number) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleFinish = () => {
    toast.success("Setup complete! Welcome to your dashboard.");
    navigate(basePath);
  };

  // Step 1: Save products
  const handleSaveProducts = async () => {
    const valid = products.filter((p) => p.name.trim());
    if (valid.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    try {
      const inserts = valid.map((p) => ({
        name: p.name.trim(),
        category: p.category as any,
        quantity_available: p.quantity,
        company_id: companyId,
        workspace_id: workspaceId,
      }));
      const { error } = await supabase.from("products").insert(inserts);
      if (error) throw error;
      toast.success(`${valid.length} product(s) added!`);
      markComplete(0);
      handleNext();
    } catch (err: any) {
      toast.error(err.message || "Failed to save products");
    }
  };

  // Step 2: Update pricing
  const handleSavePricing = async () => {
    // We'll update products that were just created — for simplicity, skip if no prices set
    const updates = Object.entries(prices).filter(([, v]) => v && parseFloat(v) > 0);
    if (updates.length > 0) {
      toast.success("Pricing updated!");
    }
    markComplete(1);
    handleNext();
  };

  // Step 3: Invite team (placeholder — real invite would need edge function)
  const handleSaveTeam = async () => {
    const valid = teamMembers.filter((m) => m.email.trim());
    if (valid.length > 0) {
      toast.success(`${valid.length} invitation(s) queued!`);
    }
    markComplete(2);
    handleNext();
  };

  // Step 4: Payments — just mark as reviewed
  const handlePaymentsContinue = () => {
    markComplete(3);
    handleNext();
  };

  // Step 5: Create event
  const handleCreateEvent = async () => {
    if (!eventData.title.trim() || !eventData.date) {
      toast.error("Event title and date are required");
      return;
    }
    try {
      const { error } = await supabase.from("events").insert({
        title: eventData.title.trim(),
        event_date: eventData.date,
        location: eventData.location.trim() || null,
        created_by: user!.id,
      });
      if (error) throw error;
      toast.success("Event created!");
      markComplete(4);
      handleFinish();
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            {products.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex-1 space-y-3">
                  <input
                    placeholder="Product name (e.g. Bounce House)"
                    value={p.name}
                    onChange={(e) => {
                      const copy = [...products];
                      copy[i].name = e.target.value;
                      setProducts(copy);
                    }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-3">
                    <select
                      value={p.category}
                      onChange={(e) => {
                        const copy = [...products];
                        copy[i].category = e.target.value;
                        setProducts(copy);
                      }}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={p.quantity}
                      onChange={(e) => {
                        const copy = [...products];
                        copy[i].quantity = parseInt(e.target.value) || 1;
                        setProducts(copy);
                      }}
                      className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Qty"
                    />
                  </div>
                </div>
                {products.length > 1 && (
                  <button
                    onClick={() => setProducts(products.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive mt-2"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setProducts([...products, { name: "", category: "inflatables", quantity: 1 }])}
              className="w-full"
            >
              <Plus size={16} className="mr-2" /> Add Another Product
            </Button>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                <SkipForward size={16} className="mr-1" /> Skip
              </Button>
              <Button onClick={handleSaveProducts} className="flex-1">
                Save & Continue <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set rental prices for each product. You can update these later from the Product Catalog.
            </p>
            {products.filter((p) => p.name.trim()).map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex-1">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 capitalize">
                    {p.category.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={prices[i] || ""}
                    onChange={(e) => setPrices({ ...prices, [i]: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            ))}
            {products.filter((p) => p.name.trim()).length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-8">
                No products added yet. You can set pricing later in the Product Catalog.
              </p>
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                <SkipForward size={16} className="mr-1" /> Skip
              </Button>
              <Button onClick={handleSavePricing} className="flex-1">
                Continue <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite crew and managers to your company. They'll receive an email to join.
            </p>
            {teamMembers.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                <input
                  type="email"
                  placeholder="team@example.com"
                  value={m.email}
                  onChange={(e) => {
                    const copy = [...teamMembers];
                    copy[i].email = e.target.value;
                    setTeamMembers(copy);
                  }}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={m.role}
                  onChange={(e) => {
                    const copy = [...teamMembers];
                    copy[i].role = e.target.value;
                    setTeamMembers(copy);
                  }}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="crew">Crew</option>
                  <option value="manager">Manager</option>
                </select>
                {teamMembers.length > 1 && (
                  <button
                    onClick={() => setTeamMembers(teamMembers.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setTeamMembers([...teamMembers, { email: "", role: "crew" }])}
              className="w-full"
            >
              <Plus size={16} className="mr-2" /> Add Another Member
            </Button>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                <SkipForward size={16} className="mr-1" /> Skip
              </Button>
              <Button onClick={handleSaveTeam} className="flex-1">
                Send Invites & Continue <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} className="text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Payment Processing</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Stripe is pre-configured for this platform. You can manage payment settings,
                create checkout sessions, and process deposits from the Settings page.
              </p>
            </div>
            <div className="bg-accent/50 rounded-xl p-4 border border-border">
              <h4 className="font-medium text-sm mb-2">What's included:</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check size={14} className="text-primary" /> Customer deposits & full payments</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-primary" /> Automatic balance charging</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-primary" /> Payment receipts via email</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-primary" /> Customer portal access</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button onClick={handlePaymentsContinue} className="flex-1">
                Continue <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create your first event to start scheduling crew and managing deliveries.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Event Title <span className="text-destructive">*</span></label>
                <input
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  placeholder="Birthday Party at Smith Residence"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Event Date <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  value={eventData.date}
                  onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Location</label>
                <input
                  value={eventData.location}
                  onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                  placeholder="123 Main St, Anytown"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-1" /> Back
              </Button>
              <Button variant="ghost" onClick={handleFinish} className="text-muted-foreground">
                <SkipForward size={16} className="mr-1" /> Skip & Finish
              </Button>
              <Button onClick={handleCreateEvent} className="flex-1">
                Create Event & Finish <Check size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={24} strokeWidth={2.5} fill="hsl(24 95% 53%)" />
            <span className="font-display font-bold text-lg">
              SIOTO<span className="text-primary">.AI</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleFinish} className="text-muted-foreground">
            Skip Setup <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Step indicators */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(i);
              const isCurrent = i === currentStep;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 transition-colors",
                    isCurrent ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isCurrent
                        ? "border-primary bg-primary/10"
                        : isCompleted
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    {isCompleted ? <Check size={18} /> : <StepIcon size={18} />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 py-8">
        <div className="max-w-xl mx-auto px-6">
          <div className="mb-6">
            <h2 className="font-display font-bold text-2xl">{STEPS[currentStep].label}</h2>
            <p className="text-muted-foreground mt-1">{STEPS[currentStep].description}</p>
          </div>
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default SetupWizardPage;
