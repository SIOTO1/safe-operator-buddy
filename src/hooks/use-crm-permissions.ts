import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export type CrmPermission =
  | "view_all_leads"
  | "view_assigned_leads"
  | "create_lead"
  | "edit_lead"
  | "delete_lead"
  | "add_notes"
  | "create_tasks"
  | "update_lead_status"
  | "view_pipeline"
  | "manage_deals"
  | "view_reports"
  | "generate_test_data";

type CrmRole = "admin" | "sales_manager" | "sales_rep";

const ROLE_PERMISSIONS: Record<CrmRole, CrmPermission[]> = {
  admin: [
    "view_all_leads",
    "view_assigned_leads",
    "create_lead",
    "edit_lead",
    "delete_lead",
    "add_notes",
    "create_tasks",
    "update_lead_status",
    "view_pipeline",
    "manage_deals",
    "view_reports",
    "generate_test_data",
  ],
  sales_manager: [
    "view_all_leads",
    "view_assigned_leads",
    "edit_lead",
    "add_notes",
    "create_tasks",
    "update_lead_status",
    "view_pipeline",
    "manage_deals",
    "view_reports",
  ],
  sales_rep: [
    "view_assigned_leads",
    "add_notes",
    "create_tasks",
    "update_lead_status",
  ],
};

function appRoleToCrmRole(role: string | null): CrmRole {
  switch (role) {
    case "owner":
      return "admin";
    case "manager":
      return "sales_manager";
    default:
      return "sales_rep";
  }
}

export function useCrmPermissions() {
  const { role, user, companyId } = useAuth();
  const crmRole = appRoleToCrmRole(role);
  const permissions = ROLE_PERMISSIONS[crmRole];

  const can = useMemo(() => (permission: CrmPermission) => permissions.includes(permission), [permissions]);

  return {
    crmRole,
    crmRoleLabel: crmRole === "admin" ? "Admin" : crmRole === "sales_manager" ? "Sales Manager" : "Sales Rep",
    can,
    userId: user?.id ?? null,
    companyId,
  };
}
