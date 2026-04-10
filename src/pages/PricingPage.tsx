import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/subscriptionTiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Shield, Zap, Building2 } from "lucide-react";
import { toast } from "sonner";
import ShieldLogo from "@/components/ShieldLogo";

const tierIcons: Record<string, typeof Shield> = {
  starter: Shield,
  pro: Zap,
  enterprise: Building2,
};

const PricingPage = () => {
  const { session, subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!session) {
      navigate("/signup");
      return;
    }

    // Enterprise tier — open contact/email
    if (tier === "enterprise") {
      window.location.href = "mailto:info@sioto.ai?subject=Enterprise%20Plan%20Inquiry&body=Hi%20SIOTO%20team%2C%0A%0AI%27m%20interested%20in%20the%20Enterprise%20plan.%20Please%20send%20me%20more%20information.%0A%0ACompany%20name%3A%20%0ANumber%20of%20locations%3A%20%0A";
      return;
    }

    setLoadingTier(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: SUBSCRIPTION_TIERS[tier].price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Failed to start checkout: " + (err.message || "Unknown error"));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingTier("manage");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Failed to open subscription management: " + (err.message || "Unknown error"));
    } finally {
      setLoadingTier(null);
    }
  };

  const isCurrentTier = (tier: SubscriptionTier) => subscription.subscribed && subscription.tier === tier;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <ShieldLogo size={32} />
            <span className="font-display font-bold text-lg">SIOTO.AI</span>
          </button>
          {session && (
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12 space-y-4">
          <Badge variant="outline" className="mb-2">
            7-day free trial on all plans
          </Badge>
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to run your party rental business. Start free, upgrade anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][]).map(([key, tier]) => {
            const isCurrent = isCurrentTier(key);
            const isPopular = key === "pro";
            const isEnterprise = key === "enterprise";
            const TierIcon = tierIcons[key] || Shield;

            return (
              <Card key={key} className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg shadow-primary/10" : ""}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TierIcon size={20} className="text-primary" />
                    <CardTitle className="font-display">{tier.name}</CardTitle>
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-auto">
                        {subscription.isTrialing ? "Trial" : "Current"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    {isEnterprise ? (
                      <span className="text-4xl font-display font-bold">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-display font-bold">${tier.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {feature.startsWith("Everything") ? (
                          <span className="text-primary font-medium">{feature}</span>
                        ) : (
                          <>
                            <Check size={16} className="text-primary mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManageSubscription}
                      disabled={loadingTier === "manage"}
                    >
                      {loadingTier === "manage" ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      Manage Subscription
                    </Button>
                  ) : isEnterprise ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleSubscribe(key)}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleSubscribe(key)}
                      disabled={loadingTier === key || subscription.subscribed}
                    >
                      {loadingTier === key ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      {subscription.subscribed ? "Current plan active" : "Start 7-day free trial"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ / note */}
        <div className="text-center mt-12 text-sm text-muted-foreground max-w-lg mx-auto space-y-2">
          <p>All plans include a 7-day free trial. Cancel anytime during your trial and you won't be charged.</p>
          <p>Each company gets their own Stripe Connect account — you keep your revenue, we take a 5% platform fee per transaction.</p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
