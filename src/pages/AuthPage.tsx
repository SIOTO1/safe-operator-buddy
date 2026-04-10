import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, X } from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const emailSchema = z.string().trim().email("Invalid email address").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(128);


const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session && pendingRedirect) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, pendingRedirect, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPendingRedirect(false);

    try {
      const validatedEmail = emailSchema.parse(email);
      const validatedPassword = passwordSchema.parse(password);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedEmail,
        password: validatedPassword,
      });
      if (error) throw error;

      toast.success("Welcome back!");
      setPendingRedirect(true);
    } catch (err: any) {
      setLoading(false);
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        const message = err.message || "Authentication failed";
        if (message.toLowerCase().includes("email not confirmed")) {
          toast.error("This invite account has not finished activation yet. Open the latest invite email and complete the invite link first.");
        } else {
          toast.error(message);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldLogo size={56} />
          </div>
          <p className="text-secondary-foreground/50 text-sm">
            AI-Powered Safety & Operations
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-xl relative">
          <button
            onClick={() => navigate("/")}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <h2 className="font-display font-bold text-xl text-center mb-6">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/reset-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>
          <div className="mt-3 text-center">
            <Link to="/signup" className="text-sm text-primary hover:underline">
              Don't have an account? Create your company
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-secondary-foreground/30 mt-6">
          AI-Powered Safety & Operations
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
