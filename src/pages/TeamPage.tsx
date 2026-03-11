import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, MoreVertical, ShieldCheck, Briefcase, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type TeamRole = "admin" | "manager" | "staff";
type TeamStatus = "active" | "inactive" | "invited";

interface TeamMember {
  id: string;
  user_id: string;
  role: TeamRole;
  status: TeamStatus;
  created_at: string;
  display_name: string | null;
  email: string | null;
}

const roleConfig: Record<TeamRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: "Admin", icon: <Crown size={14} />, color: "default" },
  manager: { label: "Manager", icon: <Briefcase size={14} />, color: "secondary" },
  staff: { label: "Staff", icon: <User size={14} />, color: "outline" },
};

const statusConfig: Record<TeamStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "destructive" },
  invited: { label: "Invited", variant: "outline" },
};

const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  admin: [
    "Full access to all features",
    "Company settings & billing",
    "Stripe configuration",
    "User management (invite, roles, deactivate)",
  ],
  manager: [
    "CRM, events, routes, inventory",
    "Compliance dashboard & reporting",
    "Cannot modify company settings",
    "Cannot manage users or billing",
  ],
  staff: [
    "CRM (create & manage leads)",
    "Events (create & manage bookings)",
    "Routes, scheduling, inventory",
    "Payments (view, process, refunds)",
  ],
};

const TeamPage = () => {
  const { user, companyId } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);

  const isAdmin = currentUserRole === "admin";

  const fetchMembers = useCallback(async () => {
    if (!companyId) return;
    try {
      // Fetch company_users joined with profiles
      const { data: companyUsers, error: cuError } = await supabase
        .from("company_users")
        .select("id, user_id, role, status, created_at")
        .eq("company_id", companyId);

      if (cuError) throw cuError;

      if (!companyUsers || companyUsers.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIds = companyUsers.map((cu) => cu.user_id);
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      if (pError) throw pError;

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const merged: TeamMember[] = companyUsers.map((cu) => {
        const prof = profileMap.get(cu.user_id);
        return {
          ...cu,
          role: cu.role as TeamRole,
          status: cu.status as TeamStatus,
          display_name: prof?.display_name ?? null,
          email: prof?.email ?? null,
        };
      });

      // Sort: admin first, then manager, then staff
      const order: Record<TeamRole, number> = { admin: 0, manager: 1, staff: 2 };
      merged.sort((a, b) => order[a.role] - order[b.role]);

      setMembers(merged);

      // Find current user's role
      const me = merged.find((m) => m.user_id === user?.id);
      setCurrentUserRole(me?.role ?? null);
    } catch (err: any) {
      console.error("Error fetching team:", err);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [companyId, user?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    try {
      const { error } = await supabase
        .from("company_users")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
      toast.success(`Role updated to ${roleConfig[newRole].label}`);
      fetchMembers();
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast.error("Failed to update role");
    }
  };

  const handleStatusChange = async (memberId: string, userId: string, newStatus: TeamStatus) => {
    if (userId === user?.id) {
      toast.error("You cannot deactivate yourself");
      return;
    }
    try {
      const { error } = await supabase
        .from("company_users")
        .update({ status: newStatus })
        .eq("id", memberId);

      if (error) throw error;
      toast.success(`User ${newStatus === "active" ? "activated" : "deactivated"}`);
      fetchMembers();
    } catch (err: any) {
      console.error("Error updating status:", err);
      toast.error("Failed to update user status");
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "?";
  };

  const stats = [
    { label: "Total Members", value: members.length, icon: Users },
    { label: "Admins", value: members.filter((m) => m.role === "admin").length, icon: Crown },
    { label: "Managers", value: members.filter((m) => m.role === "manager").length, icon: Briefcase },
    { label: "Staff", value: members.filter((m) => m.role === "staff").length, icon: User },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Team Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "Manage team members, roles, and access levels" : "View your team"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} className="mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <s.icon size={14} />
              {s.label}
            </div>
            <p className="text-2xl font-bold font-display">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Permissions Overview */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          Role Permissions
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(["admin", "manager", "staff"] as TeamRole[]).map((role) => (
            <div key={role} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={roleConfig[role].color as any} className="gap-1">
                  {roleConfig[role].icon}
                  {roleConfig[role].label}
                </Badge>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {ROLE_PERMISSIONS[role].map((p) => (
                  <li key={p} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No team members found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.user_id === user?.id;

                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                          {getInitials(m.display_name, m.email)}
                        </div>
                        <div>
                          <span className="font-medium block">{m.display_name || "Unnamed"}</span>
                          {isSelf && <span className="text-xs text-muted-foreground">(You)</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin && !isSelf ? (
                        <Select
                          value={m.role}
                          onValueChange={(val) => handleRoleChange(m.id, val as TeamRole)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleConfig[m.role].color as any} className="gap-1">
                          {roleConfig[m.role].icon}
                          {roleConfig[m.role].label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {m.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[m.status].variant}>
                        {statusConfig[m.status].label}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground">
                                <MoreVertical size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {m.status === "active" ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleStatusChange(m.id, m.user_id, "inactive")}
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(m.id, m.user_id, "active")}
                                >
                                  Activate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Share the signup link with your team. New members will appear here once they create an account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <Label className="text-xs text-muted-foreground mb-1 block">Signup Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/auth`}
                  className="text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/auth`);
                    toast.success("Link copied!");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              New members automatically join as <strong>Staff</strong>. You can change their role after they sign up.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
