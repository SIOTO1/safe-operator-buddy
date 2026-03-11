import { useState, useEffect, useRef } from "react";
import { Settings, Upload, Save, Building2, Phone, Mail, Globe, MapPin, DollarSign, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { toast } from "sonner";

interface OrgSettings {
  id?: string;
  company_name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  default_delivery_fee: number | null;
  review_link: string | null;
}

const emptySettings: OrgSettings = {
  company_name: "",
  logo_url: null,
  phone: null,
  email: null,
  address: null,
  website: null,
  default_delivery_fee: null,
  review_link: null,
};

const SettingsPage = () => {
  const { role } = useAuth();
  const { updateOrg } = useOrgSettings();
  const isOwner = role === "owner";
  const [settings, setSettings] = useState<OrgSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        const { error } = await supabase
          .from("organization_settings")
          .update({
            company_name: settings.company_name,
            phone: settings.phone,
            email: settings.email,
            address: settings.address,
            website: settings.website,
            logo_url: settings.logo_url,
            default_delivery_fee: settings.default_delivery_fee,
            review_link: settings.review_link,
          } as any)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("organization_settings")
          .insert({
            company_name: settings.company_name,
            phone: settings.phone,
            email: settings.email,
            address: settings.address,
            website: settings.website,
            logo_url: settings.logo_url,
            default_delivery_fee: settings.default_delivery_fee,
          } as any)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data);
      }
      updateOrg(settings.company_name || null, settings.logo_url);
      toast.success("Settings saved successfully");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      setSettings((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
      updateOrg(settings.company_name || null, urlData.publicUrl);
      toast.success("Logo uploaded");
    } catch (err: any) {
      console.error("Error uploading logo:", err);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const update = (field: keyof OrgSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Settings size={24} />
          Organization Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isOwner ? "Manage your company details and branding" : "View organization details"}
        </p>
      </div>

      {/* Logo */}
      <div className="rounded-xl border border-border bg-card p-6">
        <Label className="text-sm font-medium mb-3 block">Company Logo</Label>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Company logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 size={32} className="text-muted-foreground" />
            )}
          </div>
          {isOwner && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={14} />
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <Label htmlFor="company_name" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <Building2 size={14} /> Company Name
          </Label>
          <Input
            id="company_name"
            value={settings.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            placeholder="Your Company Name"
            disabled={!isOwner}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
              <Mail size={14} /> Email
            </Label>
            <Input
              id="email"
              type="email"
              value={settings.email || ""}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contact@company.com"
              disabled={!isOwner}
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
              <Phone size={14} /> Phone
            </Label>
            <Input
              id="phone"
              value={settings.phone || ""}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 123-4567"
              disabled={!isOwner}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="website" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <Globe size={14} /> Website
          </Label>
          <Input
            id="website"
            value={settings.website || ""}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://yourcompany.com"
            disabled={!isOwner}
          />
        </div>

        <div>
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <MapPin size={14} /> Address
          </Label>
          <Textarea
            id="address"
            value={settings.address || ""}
            onChange={(e) => update("address", e.target.value)}
            placeholder="123 Main St, City, State 12345"
            rows={2}
            disabled={!isOwner}
          />
        </div>

        <div className="max-w-xs">
          <Label htmlFor="default_delivery_fee" className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <DollarSign size={14} /> Default Delivery Fee
          </Label>
          <Input
            id="default_delivery_fee"
            type="number"
            min="0"
            step="0.01"
            value={settings.default_delivery_fee != null ? settings.default_delivery_fee.toString() : ""}
            onChange={(e) => setSettings(prev => ({ ...prev, default_delivery_fee: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="0.00"
            disabled={!isOwner}
          />
          <p className="text-xs text-muted-foreground mt-1">Shown on the public booking form's cost estimate</p>
        </div>
      </div>

      {isOwner && (
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save size={16} />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      )}
    </div>
  );
};

export default SettingsPage;
