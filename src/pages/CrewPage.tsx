import { useState, useEffect } from "react";
import { Users, UserPlus, MoreVertical, Shield, Crown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CrewMember {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: "owner" | "manager" | "crew";
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown size={14} />,
  manager: <Shield size={14} />,
  crew: <User size={14} />,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  crew: "Crew",
};

const CrewPage = () => {
  const { role: currentUserRole, user } = useAuth();
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "crew">("crew");
  const [inviting, setInviting] = useState(false);

  const isOwner = currentUserRole === "owner";

  const fetchMembers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, email");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const merged: CrewMember[] = (profiles || []).map((p) => {
        const userRole = roles?.find((r) => r.user_id === p.user_id);
        return {
          user_id: p.user_id,
          display_name: p.display_name,
          email: p.email,
          role: (userRole?.role as "owner" | "manager" | "crew") || "crew",
        };
      });

      // Sort: owner first, then manager, then crew
      const order = { owner: 0, manager: 1, crew: 2 };
      merged.sort((a, b) => order[a.role] - order[b.role]);

      setMembers(merged);
    } catch (err: any) {
      console.error("Error fetching crew:", err);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: "manager" | "crew") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success(`Role updated to ${roleLabels[newRole]}`);
      fetchMembers();
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return;
    try {
      // Remove their role (they'll lose access)
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      toast.success(`${name} has been removed`);
      fetchMembers();
    } catch (err: any) {
      console.error("Error removing member:", err);
      toast.error("Failed to remove member");
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "?";
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Crew Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOwner ? "Manage team members and access levels" : "View your team"}
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} />
            Invite Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: members.length, icon: Users },
          { label: "Owners", value: members.filter((m) => m.role === "owner").length, icon: Crown },
          { label: "Managers", value: members.filter((m) => m.role === "manager").length, icon: Shield },
          { label: "Crew", value: members.filter((m) => m.role === "crew").length, icon: User },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <s.icon size={14} />
              {s.label}
            </div>
            <p className="text-2xl font-bold font-display">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No team members found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium p-4">Member</th>
                  <th className="text-left font-medium p-4">Role</th>
                  <th className="text-left font-medium p-4 hidden sm:table-cell">Email</th>
                  {isOwner && <th className="p-4 w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.user_id === user?.id;
                  const isTargetOwner = m.role === "owner";

                  return (
                    <tr key={m.user_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                            {getInitials(m.display_name, m.email)}
                          </div>
                          <div>
                            <span className="font-medium block">{m.display_name || "Unnamed"}</span>
                            {isSelf && <span className="text-xs text-muted-foreground">(You)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {isOwner && !isTargetOwner && !isSelf ? (
                          <Select
                            value={m.role}
                            onValueChange={(val) => handleRoleChange(m.user_id, val as "manager" | "crew")}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="crew">Crew</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={m.role === "owner" ? "default" : "secondary"} className="gap-1">
                            {roleIcons[m.role]}
                            {roleLabels[m.role]}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{m.email}</td>
                      {isOwner && (
                        <td className="p-4">
                          {!isTargetOwner && !isSelf && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <MoreVertical size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemoveMember(m.user_id, m.display_name || m.email || "User")}
                                >
                                  Remove from team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              New members automatically join as <strong>Crew</strong>. You can change their role after they sign up.
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

export default CrewPage;
