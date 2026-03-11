import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Users, FileText, Trash2, BookOpen, Plus, Package, X, Share2, Copy, Loader2 } from "lucide-react";
import { IncidentReportSection } from "@/components/scheduling/IncidentReportSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { WeatherSafetyBadge } from "@/components/scheduling/WeatherSafetyBadge";
import { PaymentSummary } from "@/components/scheduling/PaymentSummary";
import type { WeatherData } from "@/components/scheduling/WeatherSafetyBadge";
import { getInflatableSafetyLevel } from "@/components/scheduling/WeatherSafetyBadge";
import { EventStaffAssignment } from "@/components/scheduling/EventStaffAssignment";

interface EventDetail {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  crew_needed: number;
  created_by: string;
  created_at: string;
  quote_id: string | null;
  status: string;
  review_request_sent: boolean;
}

interface EventEquipment {
  id: string;
  equipment_name: string;
  quantity: number;
  notes: string | null;
}

interface EventProduct {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_category: string;
  product_price: number | null;
  product_image_url: string | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number | null;
  image_url: string | null;
  quantity_available: number;
}

const CATEGORIES_MAP: Record<string, string> = {
  inflatables: "Inflatables", slides: "Slides", foam_machines: "Foam Machines",
  tents: "Tents", tables: "Tables", chairs: "Chairs", generators: "Generators",
  concessions: "Concessions", other: "Other",
};

const SAFETY_TRAINING_LINKS = [
  { label: "Bounce House Setup SOP", sopId: "st-001", description: "Anchoring, inflation, and wind safety" },
  { label: "Tent Anchoring & Wind Safety", sopId: "safety-002", description: "Stakes vs. weights, wind thresholds" },
  { label: "Water Slide Safety", sopId: "st-002", description: "Dual-attendant protocol, water supply" },
  { label: "General Takedown Procedures", sopId: "st-006", description: "Safe deflation and teardown" },
];

const EventDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { basePath } = useCompanySlug();
  const { user, role } = useAuth();
  const isOwner = role === "owner";
  const canManage = isOwner || role === "manager";

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [equipment, setEquipment] = useState<EventEquipment[]>([]);
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // Add product form state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQty, setProductQty] = useState("1");
  const [addingProduct, setAddingProduct] = useState(false);
  const [dateAllocations, setDateAllocations] = useState<Record<string, number>>({});
  const [generatingPortalLink, setGeneratingPortalLink] = useState(false);

  const fetchEventProducts = useCallback(async () => {
    if (!eventId) return;
    const { data, error } = await supabase
      .from("event_products")
      .select("id, product_id, quantity, products(name, category, price, image_url)")
      .eq("event_id", eventId)
      .order("created_at") as any;
    if (!error && data) {
      setEventProducts(data.map((ep: any) => ({
        id: ep.id,
        product_id: ep.product_id,
        quantity: ep.quantity,
        product_name: ep.products?.name || "Unknown",
        product_category: ep.products?.category || "other",
        product_price: ep.products?.price,
        product_image_url: ep.products?.image_url,
      })));
    }
  }, [eventId]);

  // Fetch how many units of each product are already assigned to events on the same date
  const fetchDateAllocations = useCallback(async (eventDate: string) => {
    if (!eventId) return;
    // Get all events on the same date (excluding current event)
    const { data: sameDay } = await supabase
      .from("events")
      .select("id")
      .eq("event_date", eventDate)
      .neq("id", eventId);
    if (!sameDay || sameDay.length === 0) { setDateAllocations({}); return; }
    const eventIds = sameDay.map(e => e.id);
    const { data: allocations } = await supabase
      .from("event_products")
      .select("product_id, quantity")
      .in("event_id", eventIds);
    const map: Record<string, number> = {};
    (allocations || []).forEach((a: any) => {
      map[a.product_id] = (map[a.product_id] || 0) + a.quantity;
    });
    setDateAllocations(map);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [eventRes, equipRes, productsRes] = await Promise.all([
          supabase.from("events").select("*").eq("id", eventId).single(),
          supabase.from("event_equipment").select("*").eq("event_id", eventId).order("created_at"),
          supabase.from("products").select("id, name, category, price, image_url, quantity_available").eq("is_active", true).order("name"),
        ]);
        if (eventRes.error) throw eventRes.error;
        setEvent(eventRes.data as EventDetail);
        setEquipment((equipRes.data || []) as EventEquipment[]);
        setCatalogProducts((productsRes.data || []) as CatalogProduct[]);
        // Fetch allocations for event date
        if (eventRes.data?.event_date) {
          fetchDateAllocations(eventRes.data.event_date);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load event");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    fetchEventProducts();
  }, [eventId, fetchEventProducts, fetchDateAllocations]);

  const handleDelete = async () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId!);
      if (error) throw error;
      toast.success("Event deleted");
      navigate(`${basePath}/scheduling`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete event");
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProductId || !eventId) return;
    const qty = parseInt(productQty) || 1;
    if (qty < 1) { toast.error("Quantity must be at least 1"); return; }

    // Check availability
    const product = catalogProducts.find(p => p.id === selectedProductId);
    if (product) {
      const alreadyAllocated = dateAllocations[selectedProductId] || 0;
      const available = product.quantity_available - alreadyAllocated;
      if (qty > available) {
        toast.error(`Not enough inventory available for this product on the selected date. Only ${available} of ${product.name} available (${alreadyAllocated} assigned to other events).`);
        return;
      }
    }

    setAddingProduct(true);
    try {
      const { error } = await supabase.from("event_products").insert({
        event_id: eventId,
        product_id: selectedProductId,
        quantity: qty,
      } as any);
      if (error) throw error;
      toast.success("Product assigned");
      setSelectedProductId("");
      setProductQty("1");
      setShowAddProduct(false);
      fetchEventProducts();
      if (event?.event_date) fetchDateAllocations(event.event_date);
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error("This product is already assigned to this event");
      } else {
        console.error(err);
        toast.error("Failed to assign product");
      }
    } finally {
      setAddingProduct(false);
    }
  };

  const handleRemoveProduct = async (epId: string) => {
    const { error } = await supabase.from("event_products").delete().eq("id", epId);
    if (error) { toast.error("Failed to remove"); return; }
    toast.success("Product removed");
    fetchEventProducts();
    if (event?.event_date) fetchDateAllocations(event.event_date);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`${basePath}/scheduling`)}>Back to Schedule</Button>
      </div>
    );
  }

  const safetyLevel = weatherData?.available
    ? getInflatableSafetyLevel(weatherData.wind_speed || 0, weatherData.wind_gust || null)
    : null;

  // Products already assigned — exclude from dropdown; compute available qty
  const assignedProductIds = new Set(eventProducts.map(ep => ep.product_id));
  const availableProducts = catalogProducts
    .filter(p => !assignedProductIds.has(p.id))
    .map(p => {
      const allocated = dateAllocations[p.id] || 0;
      const availableQty = p.quantity_available - allocated;
      return { ...p, availableQty };
    })
    .filter(p => p.availableQty > 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/scheduling`)}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">{event.title}</h1>
            <p className="text-muted-foreground text-sm">{format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={generatingPortalLink}
              onClick={async () => {
                setGeneratingPortalLink(true);
                try {
                  const { data: result, error: fnError } = await supabase.functions.invoke("generate-portal-token", {
                    body: { event_id: eventId },
                  });
                  if (fnError) throw fnError;
                  if (result?.error) throw new Error(result.error);
                  const portalUrl = `${window.location.origin}/portal/event/${result.token}`;
                  await navigator.clipboard.writeText(portalUrl);
                  toast.success("Portal link copied to clipboard!");
                } catch (err: any) {
                  toast.error(err.message || "Failed to generate portal link");
                } finally {
                  setGeneratingPortalLink(false);
                }
              }}
            >
              {generatingPortalLink ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Share2 size={14} className="mr-1.5" />}
              {generatingPortalLink ? "Generating..." : "Copy Portal Link"}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 size={14} className="mr-1.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Event Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {(event.start_time || event.end_time) && (
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-muted-foreground">
                        {event.start_time?.slice(0, 5) || "TBD"} – {event.end_time?.slice(0, 5) || "TBD"}
                      </p>
                    </div>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Users size={16} className="mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Crew Needed</p>
                    <p className="text-muted-foreground">{event.crew_needed}</p>
                  </div>
                </div>
              </div>

              {event.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1.5"><FileText size={14} /> Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{event.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Legacy Equipment */}
          {equipment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {equipment.map((eq) => (
                    <div key={eq.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <span>{eq.equipment_name}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">×{eq.quantity}</Badge>
                        {eq.notes && <span className="text-xs text-muted-foreground">{eq.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Package size={16} /> Event Equipment
              </CardTitle>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => setShowAddProduct(!showAddProduct)}>
                  <Plus size={14} className="mr-1" /> Assign Product
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add product form */}
              {showAddProduct && canManage && (
                <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border border-border bg-muted/30">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.length === 0 ? (
                        <SelectItem value="_none" disabled>No products available on this date</SelectItem>
                      ) : (
                        availableProducts.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {CATEGORIES_MAP[p.category] || p.category}
                            {p.price != null ? ` ($${p.price})` : ""}
                            {` • ${p.availableQty} avail.`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={productQty}
                    onChange={e => setProductQty(e.target.value)}
                    className="w-20"
                    placeholder="Qty"
                  />
                  <Button size="sm" onClick={handleAddProduct} disabled={!selectedProductId || addingProduct}>
                    {addingProduct ? "Adding..." : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddProduct(false)}>
                    <X size={14} />
                  </Button>
                </div>
              )}

              {/* Assigned products list */}
              {eventProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No products assigned to this event yet.</p>
              ) : (
                <div className="space-y-2">
                  {eventProducts.map(ep => (
                    <div key={ep.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        {ep.product_image_url ? (
                          <img src={ep.product_image_url} alt={ep.product_name} className="w-9 h-9 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{ep.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {CATEGORIES_MAP[ep.product_category] || ep.product_category}
                            {ep.product_price != null && ` • $${ep.product_price.toFixed(2)}/ea`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">×{ep.quantity}</Badge>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveProduct(ep.id)}>
                            <Trash2 size={13} className="text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Assignments */}
          <EventStaffAssignment
            eventId={event.id}
            canManage={canManage}
            hasInflatables={eventProducts.some(ep => ep.product_category === "inflatables" || ep.product_category === "slides")}
          />

          {/* Incident Reports */}
          <IncidentReportSection
            eventId={event.id}
            eventProducts={eventProducts.map(ep => ({ id: ep.product_id, name: ep.product_name }))}
          />
        </div>

        {/* Right: Payment & Safety */}
        <div className="space-y-6">
          <PaymentSummary
            eventId={event.id}
            eventDate={event.event_date}
            quoteId={event.quote_id}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Safety Status
                {safetyLevel && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      safetyLevel === "safe" && "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700",
                      safetyLevel === "caution" && "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
                      safetyLevel === "unsafe" && "bg-destructive/10 text-destructive border-destructive/30",
                    )}
                  >
                    {safetyLevel === "safe" && "● Safe"}
                    {safetyLevel === "caution" && "● Caution"}
                    {safetyLevel === "unsafe" && "● Unsafe"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.location ? (
                <WeatherSafetyBadge
                  eventLocation={event.location}
                  eventDate={event.event_date}
                  compact={false}
                  onWeatherLoaded={setWeatherData}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Add a location to check weather safety conditions.</p>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <BookOpen size={14} /> SIOTO Safety Training
                </p>
                <div className="space-y-1.5">
                  {SAFETY_TRAINING_LINKS.map((link) => (
                    <Link
                      key={link.sopId}
                      to={`${basePath}/sops?article=${link.sopId}`}
                      className="block rounded-md border border-border/60 p-2.5 hover:bg-accent/50 transition-colors group"
                    >
                      <p className="text-xs font-medium group-hover:text-primary transition-colors">{link.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{link.description}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border/60 p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">Wind Safety Thresholds</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">&lt;15 mph</span> — Safe for inflatable operation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">15–20 mph</span> — Caution, monitor closely</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">&gt;20 mph</span> — Unsafe, do not operate inflatables</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
