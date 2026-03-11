import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "manager" | "crew";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { session, role, loading } = useAuth();
  const { toast } = useToast();
  const hasShownToast = useRef(false);

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
      toast({
        title: "Access Restricted",
        description: "You don't have permission to access that page.",
        variant: "destructive",
      });
    }
  }, [shouldRedirectRole, toast]);

  if (loading) {
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

  return <>{children}</>;
};

export default ProtectedRoute;
