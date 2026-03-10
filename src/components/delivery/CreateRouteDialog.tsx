import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Driver { id: string; name: string; }
interface Vehicle { id: string; name: string; license_plate: string | null; }

interface CreateRouteDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

const CreateRouteDialog = ({ open, onOpenChange, onCreated }: CreateRouteDialogProps) => {
  const { companyId, workspaceId, user } = useAuth();
  const [name, setName] = useState("");
  const [routeDate, setRouteDate] = useState<Date | undefined>(new Date());
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("drivers").select("id, name").eq("is_active", true).order("name")
      .then(({ data }) => setDrivers((data as unknown as Driver[]) || []));
    supabase.from("vehicles").select("id, name, license_plate").eq("is_active", true).order("name")
      .then(({ data }) => setVehicles((data as unknown as Vehicle[]) || []));
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim() || !routeDate || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("delivery_routes").insert({
        name: name.trim(),
        route_date: format(routeDate, "yyyy-MM-dd"),
        driver_id: driverId || null,
        vehicle_id: vehicleId || null,
        notes: notes.trim() || null,
        company_id: companyId,
        workspace_id: workspaceId,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("Route created");
      onOpenChange(false);
      onCreated();
      setName(""); setNotes(""); setDriverId(""); setVehicleId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create route");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Delivery Route</DialogTitle>
          <DialogDescription>Add a new route and assign a driver and vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Route Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. North Side AM" />
          </div>
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start gap-2", !routeDate && "text-muted-foreground")}>
                  <CalendarDays size={14} />
                  {routeDate ? format(routeDate, "MMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={routeDate} onSelect={setRouteDate} className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No driver</SelectItem>
                {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vehicle</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}{v.license_plate ? ` (${v.license_plate})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim() || !routeDate}>
            {saving ? "Creating…" : "Create Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRouteDialog;
