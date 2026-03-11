import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Redirects /app/:slug/dashboard to /dashboard.
 * The slug is cosmetic for the onboarding experience — 
 * actual data scoping uses company_id from the user's profile.
 */
const CompanyDashboardRedirect = () => {
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate, slug]);

  return null;
};

export default CompanyDashboardRedirect;
