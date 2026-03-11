import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, MapPin, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BookingDetailDialog from "@/components/BookingDetailDialog";

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

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-primary/10 text-primary border-primary/20" },
  approved: { label: "Approved", class: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  declined: { label: "Declined", class: "bg-destructive/10 text-destructive border-destructive/20" },
};

const BookingManagementPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filter, setFilter] = useState("pending");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBookings((data || []) as BookingRequest[]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    const channel = supabase
      .channel("bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_requests" }, () => fetchBookings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  const handleApprove = async (booking: BookingRequest) => {
    try {
      const { data: eventData, error: eventError } = await supabase.from("events").insert({
        title: `${booking.customer_name} - ${booking.equipment[0] || "Rental"}`,
        event_date: booking.event_date,
        start_time: booking.event_time || null,
        end_time: booking.event_end_time || null,
        location: booking.event_location,
        created_by: user!.id,
        notes: `Customer: ${booking.customer_name}\nEmail: ${booking.customer_email}${booking.customer_phone ? `\nPhone: ${booking.customer_phone}` : ""}\nGuests: ${booking.guest_count || "N/A"}\nEquipment: ${booking.equipment.join(", ")}${booking.special_requests ? `\nNotes: ${booking.special_requests}` : ""}`,
      }).select("id").single();
      if (eventError) throw eventError;

      const { error: updateError } = await supabase.from("booking_requests").update({
        status: "approved",
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
        event_id: eventData.id,
      }).eq("id", booking.id);
      if (updateError) throw updateError;
      toast.success("Booking approved! Event created on schedule.");
      setDetailOpen(false);
      fetchBookings();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve booking");
    }
  };

  const handleDecline = async (booking: BookingRequest) => {
    if (!confirm("Decline this booking request?")) return;
    try {
      const { error } = await supabase.from("booking_requests").update({
        status: "declined",
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", booking.id);
      if (error) throw error;
      toast.success("Booking declined");
      setDetailOpen(false);
      fetchBookings();
    } catch (err) {
      console.error(err);
      toast.error("Failed to decline booking");
    }
  };

  const filtered = bookings.filter(b => filter === "all" ? true : b.status === filter);
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Booking Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and manage customer rental requests</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">{pendingCount} pending</Badge>
        )}
      </div>

      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Booking form: </span>
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{window.location.origin}/book</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book`); toast.success("Link copied!"); }}>
            Copy Link
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {[
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "declined", label: "Declined" },
          { key: "all", label: "All" },
        ].map(f => (
          <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm" onClick={() => setFilter(f.key)}>
            {f.label}
            {f.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-primary-foreground text-primary text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {filter === "pending" ? "No pending booking requests" : "No bookings found"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((booking, i) => {
            const status = statusConfig[booking.status] || statusConfig.pending;
            return (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setSelectedBooking(booking); setDetailOpen(true); }}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{booking.customer_name}</span>
                          <Badge variant="outline" className={cn("text-[10px]", status.class)}>{status.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar size={12} />{format(parseISO(booking.event_date), "EEE, MMM d, yyyy")}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} />{booking.event_location}</span>
                          <span className="flex items-center gap-1"><Package size={12} />{booking.equipment.slice(0, 2).join(", ")}{booking.equipment.length > 2 ? ` +${booking.equipment.length - 2}` : ""}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{format(parseISO(booking.created_at), "MMM d")}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={handleApprove}
        onDecline={handleDecline}
      />
    </div>
  );
};

export default BookingManagementPage;
