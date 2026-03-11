import { useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7; // 7 AM to 9 PM
  const min = i % 2 === 0 ? "00" : "30";
  const h12 = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return { value: `${String(hour).padStart(2, "0")}:${min}`, label: `${h12}:${min} ${ampm}` };
});

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  customer_email: z.string().trim().email("Invalid email address").max(255, "Email is too long"),
  customer_phone: z.string().trim().max(20, "Phone is too long").optional().or(z.literal("")),
  event_address: z.string().trim().min(3, "Address is required").max(200, "Address is too long"),
  event_city: z.string().trim().min(2, "City is required").max(100, "City is too long"),
  event_state: z.string().min(2, "State is required"),
  event_zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  event_date: z.string().min(1, "Event date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  notes: z.string().trim().max(1000, "Notes are too long").optional().or(z.literal("")),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface CartItem {
  product: { id: string; name: string; price: number | null; };
  quantity: number;
}

interface BookingFormProps {
  cart: CartItem[];
  selectedDate?: Date;
  cartTotal: number;
  companySlug?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function BookingForm({ cart, selectedDate, cartTotal, companySlug, onBack, onSuccess }: BookingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [form, setForm] = useState<BookingFormData>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    event_address: "",
    event_city: "",
    event_state: "",
    event_zip: "",
    event_date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  const updateField = (field: keyof BookingFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const result = bookingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof BookingFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof BookingFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Validate end time > start time
    if (result.data.end_time <= result.data.start_time) {
      setErrors({ end_time: "End time must be after start time" });
      return;
    }

    setSubmitting(true);
    const eventLocation = `${result.data.event_address}, ${result.data.event_city}, ${result.data.event_state} ${result.data.event_zip}`;

    const depositAmount = Math.round(cartTotal * 0.25 * 100) / 100;

    try {
      const { data, error } = await supabase.functions.invoke("create-booking-checkout", {
        body: {
          customer_name: result.data.customer_name,
          customer_email: result.data.customer_email,
          customer_phone: result.data.customer_phone || null,
          event_date: result.data.event_date,
          start_time: result.data.start_time,
          end_time: result.data.end_time,
          event_location: eventLocation,
          notes: result.data.notes || null,
          company_slug: companySlug || "",
          cart_items: cart.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            quantity: i.quantity,
            unit_price: i.product.price || 0,
          })),
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Failed to create checkout. Please try again.");
      } else if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
        return; // Don't set submitting false, we're navigating away
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h3 className="font-display font-bold text-xl">Booking Submitted!</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          We've received your request and will get back to you within 24 hours via email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2 text-muted-foreground">
        <ArrowLeft size={14} /> Back to cart
      </Button>

      <div>
        <h3 className="font-display font-bold text-lg">Complete Your Booking</h3>
        <p className="text-muted-foreground text-xs mt-0.5">
          {cart.length} item{cart.length !== 1 ? "s" : ""} · ${cartTotal.toFixed(2)} total
        </p>
      </div>

      <Separator />

      {/* Contact info */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Contact Information</p>
        <div>
          <Label htmlFor="bf-name" className="text-xs">Customer Name *</Label>
          <Input id="bf-name" value={form.customer_name} onChange={(e) => updateField("customer_name", e.target.value)} placeholder="John Doe" className="mt-1" />
          {errors.customer_name && <p className="text-destructive text-xs mt-0.5">{errors.customer_name}</p>}
        </div>
        <div>
          <Label htmlFor="bf-email" className="text-xs">Email *</Label>
          <Input id="bf-email" type="email" value={form.customer_email} onChange={(e) => updateField("customer_email", e.target.value)} placeholder="john@example.com" className="mt-1" />
          {errors.customer_email && <p className="text-destructive text-xs mt-0.5">{errors.customer_email}</p>}
        </div>
        <div>
          <Label htmlFor="bf-phone" className="text-xs">Phone</Label>
          <Input id="bf-phone" type="tel" value={form.customer_phone} onChange={(e) => updateField("customer_phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
          {errors.customer_phone && <p className="text-destructive text-xs mt-0.5">{errors.customer_phone}</p>}
        </div>
      </div>

      <Separator />

      {/* Event location */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Event Location</p>
        <div>
          <Label htmlFor="bf-address" className="text-xs">Event Address *</Label>
          <Input id="bf-address" value={form.event_address} onChange={(e) => updateField("event_address", e.target.value)} placeholder="123 Main St" className="mt-1" />
          {errors.event_address && <p className="text-destructive text-xs mt-0.5">{errors.event_address}</p>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="bf-city" className="text-xs">City *</Label>
            <Input id="bf-city" value={form.event_city} onChange={(e) => updateField("event_city", e.target.value)} placeholder="Austin" className="mt-1" />
            {errors.event_city && <p className="text-destructive text-xs mt-0.5">{errors.event_city}</p>}
          </div>
          <div>
            <Label htmlFor="bf-state" className="text-xs">State *</Label>
            <Select value={form.event_state} onValueChange={(v) => updateField("event_state", v)}>
              <SelectTrigger id="bf-state" className="mt-1">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.event_state && <p className="text-destructive text-xs mt-0.5">{errors.event_state}</p>}
          </div>
          <div>
            <Label htmlFor="bf-zip" className="text-xs">ZIP *</Label>
            <Input id="bf-zip" value={form.event_zip} onChange={(e) => updateField("event_zip", e.target.value)} placeholder="78701" className="mt-1" />
            {errors.event_zip && <p className="text-destructive text-xs mt-0.5">{errors.event_zip}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Event timing */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Event Timing</p>
        <div>
          <Label htmlFor="bf-date" className="text-xs">Event Date *</Label>
          <Input id="bf-date" type="date" value={form.event_date} onChange={(e) => updateField("event_date", e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")} className="mt-1" />
          {errors.event_date && <p className="text-destructive text-xs mt-0.5">{errors.event_date}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="bf-start" className="text-xs">Start Time *</Label>
            <Select value={form.start_time} onValueChange={(v) => updateField("start_time", v)}>
              <SelectTrigger id="bf-start" className="mt-1">
                <SelectValue placeholder="Start" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.start_time && <p className="text-destructive text-xs mt-0.5">{errors.start_time}</p>}
          </div>
          <div>
            <Label htmlFor="bf-end" className="text-xs">End Time *</Label>
            <Select value={form.end_time} onValueChange={(v) => updateField("end_time", v)}>
              <SelectTrigger id="bf-end" className="mt-1">
                <SelectValue placeholder="End" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.end_time && <p className="text-destructive text-xs mt-0.5">{errors.end_time}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <div>
        <Label htmlFor="bf-notes" className="text-xs">Notes / Special Requests</Label>
        <Textarea id="bf-notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Any special instructions for setup, access, power requirements..." rows={3} className="mt-1 resize-none" />
        {errors.notes && <p className="text-destructive text-xs mt-0.5">{errors.notes}</p>}
      </div>

      <Button className="w-full" size="lg" disabled={submitting} onClick={handleSubmit}>
        {submitting ? <><Loader2 size={16} className="animate-spin mr-2" /> Submitting...</> : "Request Booking"}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        By submitting, you agree to be contacted regarding this booking request.
      </p>
    </div>
  );
}