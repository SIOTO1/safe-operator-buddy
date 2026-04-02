import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Check, X, Calendar, MapPin, Users, Mail, Phone, Clock, Package, MessageSquare, Send, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BookingRequest {
  id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_date: string;
  event_time: string | null;
  event_end_time: string | null;
  event_location: string;
  equipment: string[];
  special_requests: string | null;
  guest_count: number | null;
  created_at: string;
  event_id: string | null;
  delivery_fee: number | null;
}

interface BookingNote {
  id: string;
  note: string;
  created_by: string;
  created_at: string;
}

interface PastBooking {
  id: string;
  event_date: string;
  status: string;
  equipment: string[];
}

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-primary/10 text-primary border-primary/20" },
  approved: { label: "Approved", class: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  declined: { label: "Declined", class: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface Props {
  booking: BookingRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (booking: BookingRequest) => void;
  onDecline: (booking: BookingRequest) => void;
}

const BookingDetailDialog = ({ booking, open, onOpenChange, onApprove, onDecline }: Props) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<BookingNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  if (!booking) return null;

  useEffect(() => {
    if (!booking || !open) return;
    setDeliveryFee(booking.delivery_fee != null ? booking.delivery_fee.toString() : "");
    // Fetch notes
    supabase
      .from("booking_notes")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setNotes((data || []) as BookingNote[]));

    // Fetch customer history (other bookings by same email)
    supabase
      .from("booking_requests")
      .select("id, event_date, status, equipment")
      .eq("customer_email", booking.customer_email)
      .neq("id", booking.id)
      .order("event_date", { ascending: false })
      .limit(10)
      .then(({ data }) => setPastBookings((data || []) as PastBooking[]));
  }, [booking, open]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !booking || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from("booking_notes").insert({
      booking_id: booking.id,
      note: newNote.trim(),
      created_by: user.id,
    });
    if (error) {
      toast.error("Failed to save note");
    } else {
      setNewNote("");
      // Refetch notes
      const { data } = await supabase
        .from("booking_notes")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true });
      setNotes((data || []) as BookingNote[]);
    }
    setSavingNote(false);
  };

  const handleSaveDeliveryFee = async () => {
    if (!booking) return;
    const fee = deliveryFee.trim() ? parseFloat(deliveryFee) : null;
    if (fee !== null && (isNaN(fee) || fee < 0)) {
      toast.error("Please enter a valid delivery fee");
      return;
    }
    setSavingFee(true);
    const { error } = await supabase
      .from("booking_requests")
      .update({ delivery_fee: fee } as any)
      .eq("id", booking.id);
    if (error) toast.error("Failed to save delivery fee");
    else toast.success("Delivery fee saved");
    setSavingFee(false);
  };

  const status = statusConfig[booking.status] || statusConfig.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{booking.customer_name}</DialogTitle>
            <Badge variant="outline" className={status.class}>{status.label}</Badge>
          </div>
          <DialogDescription>
            Submitted {format(parseISO(booking.created_at), "MMMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contact */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Contact</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="flex items-center gap-2"><Mail size={14} className="text-muted-foreground" />{booking.customer_email}</span>
              {booking.customer_phone && (
                <span className="flex items-center gap-2"><Phone size={14} className="text-muted-foreground" />{booking.customer_phone}</span>
              )}
            </div>
          </div>

          {/* Event */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Event Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" />{format(parseISO(booking.event_date), "EEEE, MMMM d, yyyy")}</span>
              {booking.event_time && (
                <span className="flex items-center gap-2"><Clock size={14} className="text-muted-foreground" />{booking.event_time}{booking.event_end_time ? ` - ${booking.event_end_time}` : ""}</span>
              )}
              <span className="flex items-center gap-2 col-span-2"><MapPin size={14} className="text-muted-foreground" />{booking.event_location}</span>
              {booking.guest_count && (
                <span className="flex items-center gap-2"><Users size={14} className="text-muted-foreground" />{booking.guest_count} guests</span>
              )}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Equipment</h4>
            <div className="flex flex-wrap gap-1.5">
              {booking.equipment.map(item => (
                <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
              ))}
            </div>
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Special Requests</h4>
              <p className="text-sm bg-muted/50 rounded-lg p-3">{booking.special_requests}</p>
            </div>
          )}

          {/* Customer History */}
          {pastBookings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Customer History ({pastBookings.length} past)</h4>
              <div className="space-y-1">
                {pastBookings.map(pb => {
                  const pbStatus = statusConfig[pb.status] || statusConfig.pending;
                  return (
                    <div key={pb.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-3 py-2">
                      <span>{format(parseISO(pb.event_date), "MMM d, yyyy")}</span>
                      <span className="text-muted-foreground">{pb.equipment.slice(0, 2).join(", ")}</span>
                      <Badge variant="outline" className={cn("text-[10px]", pbStatus.class)}>{pbStatus.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery Fee */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <DollarSign size={12} /> Delivery Fee
            </h4>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={deliveryFee}
                onChange={e => setDeliveryFee(e.target.value)}
                placeholder="0.00"
                className="text-sm max-w-[140px]"
              />
              <Button size="sm" variant="outline" onClick={handleSaveDeliveryFee} disabled={savingFee}>
                {savingFee ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <MessageSquare size={12} /> Internal Notes
            </h4>
            {notes.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {notes.map(n => (
                  <div key={n.id} className="text-xs bg-muted/50 rounded p-2">
                    <p>{n.note}</p>
                    <span className="text-muted-foreground">{format(parseISO(n.created_at), "MMM d, h:mm a")}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="text-sm"
                onKeyDown={e => e.key === "Enter" && handleAddNote()}
              />
              <Button size="sm" variant="outline" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          {booking.status === "pending" ? (
            <>
              <Button variant="destructive" size="sm" onClick={() => onDecline(booking)}>
                <X size={14} className="mr-1" /> Decline
              </Button>
              <Button size="sm" onClick={() => onApprove(booking)}>
                <Check size={14} className="mr-1" /> Approve & Create Event
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailDialog;
