import { useState, useEffect } from "react";
import { UserPlus, MoreVertical, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type EmployeeRole = "driver" | "installer" | "crew_lead" | "warehouse" | "manager";
type EmployeeStatus = "active" | "inactive" | "on_leave";

interface Employee {
  id: string;
  company_id: string;
  workspace_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  created_at: string;
}

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: "driver", label: "Driver" },
  { value: "installer", label: "Installer" },
  { value: "crew_lead", label: "Crew Lead" },
  { value: "warehouse", label: "Warehouse" },
  { value: "manager", label: "Manager" },
];

const STATUSES: { value: EmployeeStatus; label: string; variant: "default" | "secondary" | "destructive" | "outline" }[] = [
  { value: "active", label: "Active", variant: "default" },
  { value: "inactive", label: "Inactive", variant: "destructive" },
  { value: "on_leave", label: "On Leave", variant: "secondary" },
];

const EmployeesPage = () => {
  const { role: userRole, companyId, workspaceId } = useAuth();
  const isManager = userRole === "owner" || userRole === "manager";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "installer" as EmployeeRole, status: "active" as EmployeeStatus });
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("name");

    if (error) {
      console.error(error);
      toast.error("Failed to load employees");
    } else {
      setEmployees((data || []) as Employee[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", role: "installer", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, email: emp.email || "", phone: emp.phone || "", role: emp.role, status: emp.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("employees").update({
          name: form.name, email: form.email || null, phone: form.phone || null, role: form.role, status: form.status,
        } as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Employee updated");
      } else {
        const { error } = await supabase.from("employees").insert({
          name: form.name, email: form.email || null, phone: form.phone || null, role: form.role, status: form.status,
          company_id: companyId, workspace_id: workspaceId,
        } as any);
        if (error) throw error;
        toast.success("Employee added");
      }
      setDialogOpen(false);
      fetchEmployees();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Remove ${emp.name}?`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", emp.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success(`${emp.name} removed`);
    fetchEmployees();
  };

  const filtered = employees.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && e.role !== roleFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: EmployeeStatus) => {
    const s = STATUSES.find((st) => st.value === status);
    return <Badge variant={s?.variant || "secondary"}>{s?.label || status}</Badge>;
  };

  const getRoleLabel = (role: EmployeeRole) => ROLES.find((r) => r.value === role)?.label || role;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your workforce</p>
        </div>
        {isManager && (
          <Button onClick={openCreate}>
            <UserPlus size={16} />
            Add Employee
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><Filter size={14} className="mr-1" /><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-xl border border-border bg-card p-4">
            <p className="text-muted-foreground text-sm">{r.label}s</p>
            <p className="text-2xl font-bold font-display">{employees.filter((e) => e.role === r.value).length}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No employees found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                {isManager && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getRoleLabel(emp.role)}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{emp.email || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{emp.phone || "—"}</TableCell>
                  <TableCell>{getStatusBadge(emp.status)}</TableCell>
                  {isManager && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground"><MoreVertical size={16} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(emp)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(emp)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>{editing ? "Update employee details." : "Add a new team member."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as EmployeeRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EmployeeStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;
