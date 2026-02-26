import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrgSettings {
  company_name: string | null;
  logo_url: string | null;
}

interface OrgSettingsContextType {
  orgName: string | null;
  orgLogo: string | null;
  updateOrg: (name: string | null, logo: string | null) => void;
}

const OrgSettingsContext = createContext<OrgSettingsContextType>({
  orgName: null,
  orgLogo: null,
  updateOrg: () => {},
});

export const useOrgSettings = () => useContext(OrgSettingsContext);

export const OrgSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("organization_settings")
      .select("company_name, logo_url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOrgName(data.company_name || null);
          setOrgLogo(data.logo_url || null);
        }
      });
  }, []);

  const updateOrg = (name: string | null, logo: string | null) => {
    setOrgName(name);
    setOrgLogo(logo);
  };

  return (
    <OrgSettingsContext.Provider value={{ orgName, orgLogo, updateOrg }}>
      {children}
    </OrgSettingsContext.Provider>
  );
};
