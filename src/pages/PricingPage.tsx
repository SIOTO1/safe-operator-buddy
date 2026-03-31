import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/subscriptionTiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import ShieldLogo from "@/components/ShieldLogo";

const PricingPage = () => {
  const { session, subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!session) {
      navigate("/signup");
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
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
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

      <div className="max-w-5xl mx-auto px-4 py-16">
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
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][]).map(([key, tier]) => {
            const isCurrent = isCurrentTier(key);
            const isPopular = key === "pro";

            return (
              <Card key={key} className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg shadow-primary/10" : ""}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {key === "starter" ? <Shield size={20} className="text-primary" /> : <Zap size={20} className="text-primary" />}
                    <CardTitle className="font-display">{tier.name}</CardTitle>
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-auto">
                        {subscription.isTrialing ? "Trial" : "Current"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
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
