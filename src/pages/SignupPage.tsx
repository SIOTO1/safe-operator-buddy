import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User, Building2, Phone, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";
import { toast } from "sonner";
import { z } from "zod";

const signupSchema = z.object({
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters").max(100),
  ownerName: z.string().trim().min(1, "Owner name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  phone: z.string().trim().max(50).optional(),
});

const BENEFITS = [
  "AI-powered safety & operations platform",
  "CRM with pipeline management & quotes",
  "Automated scheduling & crew management",
  "Customer portal with contracts & payments",
];

const SignupPage = () => {
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signupSchema.parse({ companyName, ownerName, email, password, phone: phone || undefined });

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            display_name: validated.ownerName,
            company_name: validated.companyName,
            phone: validated.phone || null,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.session) {
        // Fetch the company slug for redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", data.user!.id)
          .single();

        if (profile?.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("slug")
            .eq("id", profile.company_id)
            .single();

          toast.success("Welcome to SIOTO.AI! Let's set up your company.");
          navigate(company?.slug ? `/app/${company.slug}/setup` : "/dashboard");
        } else {
          toast.success("Account created! Welcome aboard!");
          navigate("/dashboard");
        }
      } else {
        toast.success("Check your email to confirm your account!");
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Signup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero flex">
      {/* Left side — benefits */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 xl:px-24">
        <div className="max-w-md">
          <div className="mb-8">
            <ShieldLogo size={40} />
          </div>
          <h1 className="font-display font-bold text-4xl text-foreground mb-4 leading-tight">
            Start running your business smarter
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Set up your company in 60 seconds. No credit card required.
          </p>
          <ul className="space-y-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-primary mt-0.5 shrink-0" />
                <span className="text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
            <Shield className="text-primary" size={32} strokeWidth={2.5} fill="hsl(24 95% 53%)" />
            <span className="font-display font-bold text-2xl text-secondary-foreground">
              SIOTO<span className="text-primary">.AI</span>
            </span>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 shadow-xl">
            <h2 className="font-display font-bold text-xl text-center mb-1">Create Your Company</h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Get started with your free account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Company Name <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Party Rentals"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Owner Name <span className="text-destructive">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Password <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Setting up your company..." : (
                  <span className="flex items-center gap-2">
                    Create Company <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/auth" className="text-sm text-primary hover:underline">
                Already have an account? Sign in
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
