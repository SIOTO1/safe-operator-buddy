import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Send, CheckCircle, Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fallback equipment options when no catalog items exist
const defaultEquipmentOptions = [
  "Bounce House", "Water Slide", "Obstacle Course", "Combo Unit", "Dunk Tank",
  "Foam Machine", "Tables & Chairs", "Tent / Canopy", "Concession Machine", "Interactive Game",
];

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  customer_email: z.string().trim().email("Please enter a valid email"),
  customer_phone: z.string().trim().max(20, "Phone number too long").optional(),
  event_date: z.date({ required_error: "Event date is required" }),
  event_time: z.string().optional(),
  event_end_time: z.string().optional(),
  event_location: z.string().trim().min(5, "Please enter a full address").max(300, "Address too long"),
  equipment: z.array(z.string()).min(1, "Select at least one item"),
  special_requests: z.string().trim().max(1000, "Special requests too long").optional(),
  guest_count: z.number().int().min(1, "Must have at least 1 guest").max(5000, "Guest count too high").optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
}

const BookingPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState<number | null>(null);

  const [form, setForm] = useState<Partial<BookingForm>>({
    customer_name: "", customer_email: "", customer_phone: "",
    event_time: "10:00", event_end_time: "16:00", event_location: "",
    equipment: [], special_requests: "",
  });

  // Load equipment catalog (public, no auth needed)
  useEffect(() => {
    supabase
      .from("equipment_catalog")
      .select("id, name, description, image_url, price")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setCatalogItems((data || []) as CatalogItem[]);
        setCatalogLoaded(true);
      });
    // Fetch org default delivery fee
    supabase
      .from("organization_settings")
      .select("default_delivery_fee")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).default_delivery_fee != null) {
          setDefaultDeliveryFee((data as any).default_delivery_fee);
        }
      });
  }, []);

  const equipmentOptions = catalogItems.length > 0
    ? catalogItems.map(c => c.name)
    : defaultEquipmentOptions;

  const toggleEquipment = (item: string) => {
    const current = form.equipment || [];
    setForm({
      ...form,
      equipment: current.includes(item) ? current.filter(e => e !== item) : [...current, item],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = bookingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        const key = err.path[0]?.toString();
        if (key) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      const data = result.data;
      const { error } = await supabase.from("booking_requests").insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        event_date: format(data.event_date, "yyyy-MM-dd"),
        event_time: data.event_time || null,
        event_end_time: data.event_end_time || null,
        event_location: data.event_location,
        equipment: data.equipment,
        special_requests: data.special_requests || null,
        guest_count: data.guest_count || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center space-y-4">
          <CheckCircle size={48} className="text-chart-2 mx-auto" />
          <h1 className="text-2xl font-display font-bold">Booking Request Submitted!</h1>
          <p className="text-muted-foreground">
            Thank you! We'll review your request and get back to you at <strong>{form.customer_email}</strong> within 24 hours.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ customer_name: "", customer_email: "", customer_phone: "", event_time: "10:00", event_end_time: "16:00", event_location: "", equipment: [], special_requests: "" }); }}>
              Submit Another
            </Button>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={24} strokeWidth={2.5} fill="hsl(24 95% 53%)" />
            <span className="font-display font-bold text-lg">SIOTO<span className="text-primary">.AI</span></span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft size={16} className="mr-1" /> Home</Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Request a Rental</h1>
          <p className="text-muted-foreground text-sm mt-1">Fill out the form below and we'll get back to you within 24 hours to confirm availability and pricing.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="John Smith" maxLength={100} />
                {errors.customer_name && <p className="text-xs text-destructive mt-1">{errors.customer_name}</p>}
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} placeholder="john@example.com" maxLength={255} />
                {errors.customer_email && <p className="text-xs text-destructive mt-1">{errors.customer_email}</p>}
              </div>
            </div>
            <div className="max-w-xs">
              <Label>Phone (optional)</Label>
              <Input type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="(555) 123-4567" maxLength={20} />
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Event Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Event Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.event_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.event_date ? format(form.event_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.event_date} onSelect={d => setForm({ ...form, event_date: d })} disabled={d => d < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                {errors.event_date && <p className="text-xs text-destructive mt-1">{errors.event_date}</p>}
              </div>
              <div>
                <Label>Estimated Guest Count</Label>
                <Input type="number" value={form.guest_count || ""} onChange={e => setForm({ ...form, guest_count: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g., 25" min={1} max={5000} />
                {errors.guest_count && <p className="text-xs text-destructive mt-1">{errors.guest_count}</p>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.event_end_time} onChange={e => setForm({ ...form, event_end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Event Location / Address *</Label>
              <Input value={form.event_location} onChange={e => setForm({ ...form, event_location: e.target.value })} placeholder="123 Main St, City, State ZIP" maxLength={300} />
              {errors.event_location && <p className="text-xs text-destructive mt-1">{errors.event_location}</p>}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Equipment Needed *</h2>
            {errors.equipment && <p className="text-xs text-destructive">{errors.equipment}</p>}
            <div className="grid sm:grid-cols-2 gap-2">
              {equipmentOptions.map(item => {
                const catalogItem = catalogItems.find(c => c.name === item);
                return (
                  <label
                    key={item}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      form.equipment?.includes(item)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <Checkbox checked={form.equipment?.includes(item)} onCheckedChange={() => toggleEquipment(item)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item}</span>
                        {catalogItem?.price != null && (
                          <span className="text-xs font-semibold text-primary">${catalogItem.price.toFixed(2)}</span>
                        )}
                      </div>
                      {catalogItem?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{catalogItem.description}</p>
                      )}
                    </div>
                    {catalogItem?.image_url && (
                      <img src={catalogItem.image_url} alt={item} className="w-8 h-8 rounded object-cover shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Estimated Total */}
          {(() => {
            const selected = (form.equipment || [])
              .map(name => catalogItems.find(c => c.name === name))
              .filter((c): c is CatalogItem => c != null && c.price != null);
            if (selected.length === 0 && defaultDeliveryFee == null) return null;
            const equipmentTotal = selected.reduce((sum, c) => sum + (c.price || 0), 0);
            const deliveryFee = defaultDeliveryFee ?? 0;
            const total = equipmentTotal + deliveryFee;
            return (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estimated Cost</h2>
                {selected.map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-medium">${c.price!.toFixed(2)}</span>
                  </div>
                ))}
                {defaultDeliveryFee != null && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span className="font-medium">${defaultDeliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {(selected.length > 0 || defaultDeliveryFee != null) && (
                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span>Estimated Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Final pricing may vary based on delivery distance and event details.</p>
              </div>
            );
          })()}

          {/* Special Requests */}
          <div>
            <Label>Special Requests / Notes</Label>
            <Textarea value={form.special_requests} onChange={e => setForm({ ...form, special_requests: e.target.value })} placeholder="Any special requirements, theme details, setup instructions, etc." rows={4} maxLength={1000} />
            <p className="text-xs text-muted-foreground mt-1">{(form.special_requests || "").length}/1000</p>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : <><Send size={16} className="mr-2" />Submit Booking Request</>}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree to be contacted about your rental request. This is a request only — not a confirmed booking.
          </p>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;
