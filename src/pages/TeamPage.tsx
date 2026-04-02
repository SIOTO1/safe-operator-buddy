import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, MoreVertical, ShieldCheck, Briefcase, User, Crown, Mail, Loader2, RefreshCw, Link2, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

interface PendingInvite {
  id: string;
  email: string;
  role: TeamRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  created_at: string;
  invite_token: string;
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("staff");
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingAll, setResendingAll] = useState(false);

  const isAdmin = currentUserRole === "admin";

  const fetchMembers = useCallback(async () => {
    if (!companyId) return;
    try {
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

      const order: Record<TeamRole, number> = { admin: 0, manager: 1, staff: 2 };
      merged.sort((a, b) => order[a.role] - order[b.role]);

      setMembers(merged);

      const me = merged.find((m) => m.user_id === user?.id);
      setCurrentUserRole(me?.role ?? null);
    } catch (err: any) {
      console.error("Error fetching team:", err);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [companyId, user?.id]);

  const fetchInvites = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from("user_invites")
        .select("id, email, role, status, created_at, invite_token")
        .eq("company_id", companyId)
        .in("status", ["pending", "accepted", "expired"])
        .order("created_at", { ascending: false });
      setPendingInvites((data as PendingInvite[]) || []);
    } catch (err) {
      console.error("Error fetching invites:", err);
    }
  }, [companyId]);

  const getInviteExpiry = (createdAt: string) => {
    const created = new Date(createdAt);
    const expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { expiresAt, daysLeft, isExpired: daysLeft <= 0 };
  };

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setInviting(true);
    try {
      const normalizedEmail = inviteEmail.trim().toLowerCase();
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: { email: normalizedEmail, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Invitation created for ${normalizedEmail}. You can copy the link below if email is delayed.`);
      setInviteEmail("");
      setInviteRole("staff");
      setInviteOpen(false);
      fetchInvites();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (inviteIds: string[]) => {
    const isSingle = inviteIds.length === 1;
    if (isSingle) setResendingId(inviteIds[0]);
    else setResendingAll(true);

    try {
      const { data, error } = await supabase.functions.invoke("resend-invite", {
        body: { invite_ids: inviteIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isSingle ? "Invitation resent" : `${data.sent} invitation(s) resent`);
      fetchInvites();
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invitation");
    } finally {
      setResendingId(null);
      setResendingAll(false);
    }
  };

  const handleCopyInviteLink = async (inviteToken: string, email: string) => {
    try {
      // Always use the published URL so team members can access without Lovable editor access
      const publishedUrl = "https://safe-operator-buddy.lovable.app";
      const baseUrl = window.location.origin.includes("lovable.app") && window.location.origin.includes("preview")
        ? publishedUrl
        : window.location.origin;
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(`Invite link copied for ${email}`);
    } catch (err) {
      console.error("Error copying invite link:", err);
      toast.error("Failed to copy invite link");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("user_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId);
      if (error) throw error;
      toast.success("Invitation revoked");
      fetchInvites();
    } catch (err: any) {
      toast.error("Failed to revoke invitation");
    }
  };

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

      {isAdmin && pendingInvites.length > 0 && (() => {
        const accepted = pendingInvites.filter((inv) => inv.status === "accepted");
        const pending = pendingInvites.filter((inv) => inv.status === "pending");
        const expired = pendingInvites.filter((inv) => inv.status === "expired");

        return (
          <div className="space-y-6">
            {/* Accepted Invitations */}
            {accepted.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600" />
                  Accepted Invitations ({accepted.length})
                </h2>
                <div className="space-y-2">
                  {accepted.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                        <span className="text-sm font-medium truncate">{inv.email}</span>
                        <Badge variant="outline" className="text-xs capitalize">{inv.role}</Badge>
                      </div>
                      <span className="text-xs text-green-700 dark:text-green-400 font-medium shrink-0">Accepted ✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Invitations */}
            {pending.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Mail size={16} className="text-primary" />
                    Pending Invitations ({pending.length})
                  </h2>
                  {pending.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      disabled={resendingAll}
                      onClick={() => handleResendInvite(pending.map((inv) => inv.id))}
                    >
                      {resendingAll ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Resend All
                    </Button>
                  )}
                </div>

                <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Invitations expire after <strong>7 days</strong>. If email delivery is delayed, copy an invite link and send it manually by text or email.
                </div>

                <div className="space-y-2">
                  {pending.map((inv) => {
                    const { daysLeft, isExpired } = getInviteExpiry(inv.created_at);
                    return (
                      <div key={inv.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <Clock size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{inv.email}</span>
                          <Badge variant="outline" className="text-xs capitalize">{inv.role}</Badge>
                          {isExpired ? (
                            <Badge variant="destructive" className="text-[10px] gap-1 shrink-0">
                              <AlertTriangle size={10} />
                              Expired
                            </Badge>
                          ) : daysLeft <= 2 ? (
                            <Badge variant="secondary" className="text-[10px] gap-1 text-orange-600 dark:text-orange-400 shrink-0">
                              <AlertTriangle size={10} />
                              {daysLeft}d left
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground shrink-0">{daysLeft}d left</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => handleCopyInviteLink(inv.invite_token, inv.email)}
                          >
                            <Link2 size={12} />
                            Copy Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1"
                            disabled={resendingId === inv.id}
                            onClick={() => handleResendInvite([inv.id])}
                          >
                            {resendingId === inv.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive text-xs"
                            onClick={() => handleRevokeInvite(inv.id)}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expired Invitations */}
            {expired.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <XCircle size={16} className="text-destructive" />
                  Expired Invitations ({expired.length})
                </h2>
                <div className="space-y-2">
                  {expired.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <XCircle size={14} className="text-destructive shrink-0" />
                        <span className="text-sm font-medium truncate text-muted-foreground">{inv.email}</span>
                        <Badge variant="outline" className="text-xs capitalize">{inv.role}</Badge>
                      </div>
                      <span className="text-xs text-destructive shrink-0">Expired — resend needed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Create an invite for a new team member. If email is delayed, you can copy the invite link from the pending list and send it manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as TeamRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access including settings & billing</SelectItem>
                  <SelectItem value="manager">Manager — CRM, events, compliance, reporting</SelectItem>
                  <SelectItem value="staff">Staff — Operational tools, CRM, events, payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleSendInvite} disabled={inviting}>
              {inviting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} className="mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
