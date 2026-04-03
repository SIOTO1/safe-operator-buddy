import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { getTierByProductId, SubscriptionTier } from "@/lib/subscriptionTiers";

type AppRole = "owner" | "manager" | "crew";

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier | null;
  isTrialing: boolean;
  trialEnd: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { display_name: string | null; email: string | null; company_id: string | null; selected_workspace_id: string | null } | null;
  companyId: string | null;
  workspaceId: string | null;
  loading: boolean;
  subscription: SubscriptionState;
  signOut: () => Promise<void>;
  setWorkspaceId: (id: string | null) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  companyId: null,
  workspaceId: null,
  loading: true,
  subscription: { subscribed: false, tier: null, isTrialing: false, trialEnd: null, subscriptionEnd: null, loading: true },
  signOut: async () => {},
  setWorkspaceId: async () => {},
  refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ display_name: string | null; email: string | null; company_id: string | null; selected_workspace_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false, tier: null, isTrialing: false, trialEnd: null, subscriptionEnd: null, loading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Subscription check error:", error);
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }
      setSubscription({
        subscribed: data.subscribed || false,
        tier: getTierByProductId(data.product_id),
        isTrialing: data.is_trialing || false,
        trialEnd: data.trial_end || null,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
      });
    } catch (err) {
      console.error("Subscription check failed:", err);
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [{ data: roles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("display_name, email, company_id, selected_workspace_id").eq("user_id", userId).single(),
      ]);

      if (roles && roles.length > 0) {
        const roleOrder: AppRole[] = ["owner", "manager", "crew"];
        const userRole = roleOrder.find(r => roles.some(ur => ur.role === r)) || "crew";
        setRole(userRole);
      } else {
        setRole(null);
      }

      if (prof) {
        setProfile(prof as any);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION on setup, so a separate getSession() call
    // is unnecessary and causes concurrent token refresh race conditions
    // that revoke tokens and log users out immediately.
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          setTimeout(() => {
            void fetchUserData(nextSession.user.id).finally(() => {
              if (mounted) setLoading(false);
            });
            void checkSubscription();
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setSubscription({ subscribed: false, tier: null, isTrialing: false, trialEnd: null, subscriptionEnd: null, loading: false });
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, [fetchUserData, checkSubscription]);

  // Periodic subscription check every 60 seconds
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
    setSubscription({ subscribed: false, tier: null, isTrialing: false, trialEnd: null, subscriptionEnd: null, loading: false });
  };

  const setWorkspaceId = async (workspaceId: string | null) => {
    if (!user) return;
    await supabase.from("profiles").update({ selected_workspace_id: workspaceId }).eq("user_id", user.id);
    setProfile((prev) => prev ? { ...prev, selected_workspace_id: workspaceId } : prev);
  };

  return (
    <AuthContext.Provider value={{
      session, user, role, profile,
      companyId: profile?.company_id ?? null,
      workspaceId: profile?.selected_workspace_id ?? null,
      loading, subscription, signOut, setWorkspaceId,
      refreshSubscription: checkSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
