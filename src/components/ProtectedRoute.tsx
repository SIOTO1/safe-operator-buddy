import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "manager" | "crew";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { session, role, loading, subscription } = useAuth();
  const hasShownToast = useRef(false);
  const hasShownSubToast = useRef(false);

  const shouldRedirectRole =
    requiredRole && role
      ? (() => {
          const roleHierarchy = { owner: 3, manager: 2, crew: 1 };
          return (roleHierarchy[role] || 0) < (roleHierarchy[requiredRole] || 0);
        })()
      : false;

  useEffect(() => {
    if (shouldRedirectRole && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error("You don't have permission to access that page.");
    }
  }, [shouldRedirectRole]);

  const needsSubscription = session && !subscription.loading && !subscription.subscribed && role === "owner";

  useEffect(() => {
    if (needsSubscription && !hasShownSubToast.current) {
      hasShownSubToast.current = true;
      toast.info("Please subscribe to access the dashboard.");
    }
  }, [needsSubscription]);

  if (loading || subscription.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Owners without subscription get redirected to pricing
  if (needsSubscription) {
    return <Navigate to="/pricing" replace />;
  }

  if (shouldRedirectRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
