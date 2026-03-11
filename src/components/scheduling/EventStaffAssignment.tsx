import { useState, useEffect, useCallback } from "react";
import { Plus, X, Trash2, AlertTriangle, ShieldCheck, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EventStaffRole = "driver" | "setup_crew" | "supervisor";

interface Employee {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface Certification {
  id: string;
  employee_id: string;
  certification_name: string;
  certification_status: string;
  expiration_date: string | null;
}

interface StaffAssignment {
  id: string;
  event_id: string;
  employee_id: string;
  role: EventStaffRole;
  assigned_at: string;
  employee_name?: string;
  employee_role?: string;
}

const STAFF_ROLES: { value: EventStaffRole; label: string }[] = [
  { value: "driver", label: "Driver" },
  { value: "setup_crew", label: "Setup Crew" },
  { value: "supervisor", label: "Supervisor" },
];

const INFLATABLE_CATEGORIES = new Set(["inflatables", "slides"]);
const INFLATABLE_CERT_NAME = "SIOTO Inflatable Operator";

interface Props {
  eventId: string;
  canManage: boolean;
  hasInflatables: boolean;
}

export const EventStaffAssignment = ({ eventId, canManage, hasInflatables }: Props) => {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedRole, setSelectedRole] = useState<EventStaffRole>("setup_crew");
  const [adding, setAdding] = useState(false);
  const [certWarning, setCertWarning] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from("event_staff")
      .select("*")
      .eq("event_id", eventId)
      .order("assigned_at") as any;
    if (error) { console.error(error); return; }

    // Enrich with employee names
    const empIds = (data || []).map((a: any) => a.employee_id);
    if (empIds.length > 0) {
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name, role")
        .in("id", empIds) as any;
      const empMap = new Map((emps || []).map((e: any) => [e.id, { name: e.name, role: e.role }]));
      setAssignments((data || []).map((a: any) => ({
        ...a,
        employee_name: (empMap.get(a.employee_id) as any)?.name || "Unknown",
        employee_role: (empMap.get(a.employee_id) as any)?.role || "",
      })));
    } else {
      setAssignments([]);
    }
  }, [eventId]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, role, status")
      .eq("status", "active")
      .order("name") as any;
    setEmployees((data || []) as Employee[]);
  }, []);

  const fetchCertifications = useCallback(async () => {
    const { data } = await supabase
      .from("employee_certifications")
      .select("id, employee_id, certification_name, certification_status, expiration_date") as any;
    setCertifications((data || []) as Certification[]);
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchEmployees();
    fetchCertifications();
  }, [fetchAssignments, fetchEmployees, fetchCertifications]);

  const hasValidInflatableCert = (employeeId: string): boolean => {
    return certifications.some(
      (c) =>
        c.employee_id === employeeId &&
        c.certification_name === INFLATABLE_CERT_NAME &&
        c.certification_status === "active" &&
        (!c.expiration_date || new Date(c.expiration_date) >= new Date())
    );
  };

  // Check certification when employee selection changes
  useEffect(() => {
    if (!selectedEmployeeId || !hasInflatables) {
      setCertWarning(null);
      return;
    }
    if (!hasValidInflatableCert(selectedEmployeeId)) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      setCertWarning(
        `${emp?.name || "This employee"} is not certified to operate inflatable equipment.`
      );
    } else {
      setCertWarning(null);
    }
  }, [selectedEmployeeId, hasInflatables, certifications, employees]);

  const handleAdd = async () => {
    if (!selectedEmployeeId) return;

    // Block assignment if inflatable event and no valid cert
    if (hasInflatables && !hasValidInflatableCert(selectedEmployeeId)) {
      toast.error("Cannot assign: employee lacks a valid SIOTO Inflatable Operator certification.");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase.from("event_staff").insert({
        event_id: eventId,
        employee_id: selectedEmployeeId,
        role: selectedRole,
      } as any);
      if (error) {
        if (error.code === "23505") {
          toast.error("This employee is already assigned to this event");
        } else {
          throw error;
        }
      } else {
        toast.success("Staff assigned");
        setSelectedEmployeeId("");
        setSelectedRole("setup_crew");
        setShowAdd(false);
        setCertWarning(null);
        fetchAssignments();
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to assign staff");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("event_staff").delete().eq("id", id);
    if (error) { toast.error("Failed to remove"); return; }
    toast.success("Staff removed");
    fetchAssignments();
  };

  // Assigned employee IDs to exclude from dropdown
  const assignedIds = new Set(assignments.map((a) => a.employee_id));
  const availableEmployees = employees.filter((e) => !assignedIds.has(e.id));

  // Check existing assignments for cert warnings
  const assignmentWarnings = hasInflatables
    ? assignments.filter((a) => !hasValidInflatableCert(a.employee_id))
    : [];

  const getRoleLabel = (role: string) => STAFF_ROLES.find((r) => r.value === role)?.label || role;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <HardHat size={16} /> Staff Assignments
        </CardTitle>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} className="mr-1" /> Assign Staff
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing assignment cert warnings */}
        {assignmentWarnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle size={16} />
            <AlertDescription className="text-xs">
              {assignmentWarnings.length === 1
                ? `${assignmentWarnings[0].employee_name} is not certified to operate inflatable equipment.`
                : `${assignmentWarnings.length} assigned staff lack valid inflatable certifications.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Add staff form */}
        {showAdd && canManage && (
          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.length === 0 ? (
                    <SelectItem value="_none" disabled>No available employees</SelectItem>
                  ) : (
                    availableEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as EventStaffRole)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!selectedEmployeeId || adding}>
                {adding ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setCertWarning(null); setSelectedEmployeeId(""); }}>
                <X size={14} />
              </Button>
            </div>

            {/* Certification warning */}
            {certWarning && (
              <Alert variant="destructive">
                <AlertTriangle size={16} />
                <AlertDescription className="text-xs">{certWarning}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Assigned staff list */}
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No staff assigned to this event yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const hasCertIssue = hasInflatables && !hasValidInflatableCert(a.employee_id);
              return (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                      {a.employee_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{a.employee_name}</span>
                        {hasCertIssue && (
                          <AlertTriangle size={13} className="text-destructive" />
                        )}
                        {hasInflatables && !hasCertIssue && (
                          <ShieldCheck size={13} className="text-emerald-500" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5">{getRoleLabel(a.role)}</Badge>
                    </div>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(a.id)}>
                      <Trash2 size={13} className="text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
