import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Handles legacy /dashboard/* routes by resolving the company slug
 * and redirecting to /app/:slug/*
 */
const DashboardRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId, loading } = useAuth();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (loading || resolved) return;

    const resolve = async () => {
      let slug = "dashboard";

      if (companyId) {
        const { data } = await supabase
          .from("companies")
          .select("slug")
          .eq("id", companyId)
          .single();
        if ((data as any)?.slug) {
          slug = (data as any).slug;
        }
      }

      // Preserve the sub-path: /dashboard/crm/leads → /app/slug/crm/leads
      const subPath = location.pathname.replace(/^\/dashboard\/?/, "");
      const newPath = `/app/${slug}${subPath ? `/${subPath}` : ""}`;

      setResolved(true);
      navigate(newPath + location.search + location.hash, { replace: true });
    };

    resolve();
  }, [companyId, loading, location, navigate, resolved]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default DashboardRedirect;
