import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Search, Filter, Package, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category: string;
  quantity_available: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const CATEGORIES_MAP: Record<string, string> = {
  inflatables: "Inflatables",
  slides: "Slides",
  foam_machines: "Foam Machines",
  tents: "Tents",
  tables: "Tables",
  chairs: "Chairs",
  generators: "Generators",
  concessions: "Concessions",
  other: "Other",
};

const StorefrontPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetch = async () => {
      setLoading(true);
      // Fetch company by slug
      const { data: comp, error: compErr } = await supabase
        .from("companies")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      if (compErr || !comp) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCompany(comp);

      // Fetch logo from org settings
      const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("logo_url")
        .limit(1)
        .maybeSingle();
      if (orgSettings?.logo_url) setLogoUrl(orgSettings.logo_url);

      // Fetch active products for this company
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, category, quantity_available")
        .eq("company_id", comp.id)
        .eq("is_active", true)
        .order("category")
        .order("name");

      setProducts((prods || []) as Product[]);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty < 1) { removeFromCart(productId); return; }
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.product.price || 0) * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-16 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package size={48} className="mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold">Storefront Not Found</h1>
          <p className="text-muted-foreground">The company you're looking for doesn't exist.</p>
          <Button asChild variant="outline">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={company?.name} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {company?.name?.charAt(0) || "R"}
                </span>
              </div>
            )}
            <h1 className="font-display font-bold text-lg">{company?.name}</h1>
          </div>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <ShoppingCart size={18} />
                <span className="hidden sm:inline ml-1.5">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Your Cart ({cartCount} items)</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Your cart is empty</p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex gap-3 py-3 border-b border-border last:border-0">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package size={20} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.product.price != null ? `$${item.product.price.toFixed(2)}/ea` : "Price TBD"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQty(item.product.id, item.quantity - 1)}>-</Button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQty(item.product.id, item.quantity + 1)}>+</Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => removeFromCart(item.product.id)}>
                              <X size={14} className="text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between font-display font-bold text-lg">
                      <span>Total</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <Button className="w-full" size="lg" onClick={() => toast.info("Checkout coming soon!")}>
                      Request Booking
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Rent Equipment from {company?.name}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Browse our selection of rental equipment. Add items to your cart and request a booking.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <Filter size={14} className="mr-1.5" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORIES_MAP[c] || c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-9 px-3">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </Badge>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-display font-bold mb-1">No products found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <Card key={product.id} className="overflow-hidden group hover:shadow-lg transition-shadow duration-300 border-border">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={40} className="text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-2">
                      {CATEGORIES_MAP[product.category] || product.category}
                    </Badge>
                    <h3 className="font-display font-bold text-base leading-tight">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {product.price != null ? (
                        <span className="text-lg font-display font-bold">${product.price.toFixed(2)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Price on request</span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => addToCart(product)}>
                      <ShoppingCart size={14} className="mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {company?.name}. Powered by SIOTO.AI</p>
        </div>
      </footer>
    </div>
  );
};

export default StorefrontPage;
