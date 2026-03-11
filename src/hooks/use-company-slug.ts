import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

/**
 * Resolves the company slug for the current user.
 * Returns the base path prefix (e.g. "/app/super-slide-rentals") for building routes.
 *
 * Usage:
 *   const { basePath } = useCompanySlug();
 *   navigate(`${basePath}/scheduling`);
 *   <NavLink to={`${basePath}/chat`} />
 */
export function useCompanySlug() {
  const { companyId } = useAuth();
  const { slug: urlSlug } = useParams<{ slug?: string }>();

  const { data: companySlug } = useQuery({
    queryKey: ["company-slug", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("slug")
        .eq("id", companyId)
        .single();
      return (data as any)?.slug as string | null;
    },
    enabled: !!companyId,
    staleTime: Infinity, // slug rarely changes
  });

  const slug = urlSlug || companySlug || "dashboard";
  const basePath = `/app/${slug}`;

  return { slug, basePath, companyId };
}
