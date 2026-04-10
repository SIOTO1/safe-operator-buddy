import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "manager" | "crew";
  requireSubscription?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, requireSubscription }: ProtectedRouteProps) => {
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

  const shouldRedirectSubscription =
    requireSubscription && !subscription.loading && !subscription.subscribed;

  useEffect(() => {
    if (shouldRedirectRole && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error("You don't have permission to access that page.");
    }
  }, [shouldRedirectRole]);

  useEffect(() => {
    if (shouldRedirectSubscription && !hasShownSubToast.current) {
      hasShownSubToast.current = true;
      toast.error("An active subscription is required to access this feature.");
    }
  }, [shouldRedirectSubscription]);

  if (loading || (requireSubscription && subscription.loading)) {
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

  if (shouldRedirectRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (shouldRedirectSubscription) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
