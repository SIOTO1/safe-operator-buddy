import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Building2 } from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AcceptInvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"loading" | "form" | "success" | "error" | "already_accepted">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  useEffect(() => {
    if (!token) {
      setStep("error");
      setErrorMessage("No invite token provided");
      return;
    }

    const verifyToken = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/accept-invite`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": anonKey,
            },
            body: JSON.stringify({ token, verify_only: true }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setStep("error");
          setErrorMessage(data.error || "Invalid invitation");
          return;
        }

        // Handle already-accepted invites
        if (data.already_accepted) {
          setInviteEmail(data.email || "");
          setCompanyName(data.company_name || "");
          setCompanySlug(data.company_slug || "");
          setStep("already_accepted");
          return;
        }

        setInviteEmail(data.email || "");
        setCompanyName(data.company_name || "");
        setInviteRole(data.role || "");
        setStep("form");
      } catch {
        setStep("error");
        setErrorMessage("Failed to verify invitation");
      }
    };

    verifyToken();
  }, [token]);

  const roleLabelMap: Record<string, string> = {
    admin: "Administrator",
    manager: "Manager",
    staff: "Team Member",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/accept-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
          },
          body: JSON.stringify({
            token,
            password,
            display_name: displayName || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }

      setCompanyName(data.company_name || companyName);
      setCompanySlug(data.company_slug || "");
      setStep("success");
      toast.success("Account created successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to accept invitation");
      if (err.message?.includes("expired") || err.message?.includes("Invalid")) {
        setStep("error");
        setErrorMessage(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    if (!inviteEmail || !password) {
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: inviteEmail,
        password,
      });

      if (error) throw error;
      navigate(companySlug ? `/app/${companySlug}` : "/dashboard");
    } catch {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <ShieldLogo size={32} />
        </div>

        {step === "loading" && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={32} />
            <p className="text-muted-foreground">Verifying invitation...</p>
          </div>
        )}

        {step === "error" && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <XCircle className="mx-auto mb-4 text-destructive" size={48} />
            <h2 className="text-xl font-display font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={() => navigate("/auth")} variant="outline">
              Go to Sign In
            </Button>
          </div>
        )}

        {step === "form" && (
          <div className="rounded-xl border border-border bg-card p-8">
            <h2 className="text-xl font-display font-bold mb-1">Accept Invitation</h2>

            {companyName && (
              <div className="flex items-center gap-2 mt-2 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Building2 size={18} className="text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    You've been invited to join <span className="font-bold">{companyName}</span>
                  </p>
                  {inviteRole && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Role: <Badge variant="secondary" className="text-xs ml-1">{roleLabelMap[inviteRole] || inviteRole}</Badge>
                    </p>
                  )}
                </div>
              </div>
            )}

            {!companyName && (
              <p className="text-muted-foreground text-sm mb-6">
                Create your account to join the team.
              </p>
            )}

            {inviteEmail && (
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium text-foreground">{inviteEmail}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                  id="displayName"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  companyName ? `Join ${companyName}` : "Create Account & Join"
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/auth")}
                className="text-primary hover:underline"
              >
                Sign in instead
              </button>
            </p>
          </div>
        )}

        {step === "already_accepted" && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle className="mx-auto mb-4 text-primary" size={48} />
            <h2 className="text-xl font-display font-bold mb-2">Already Accepted</h2>
            <p className="text-muted-foreground mb-6">
              This invitation has already been accepted. Sign in to access <span className="font-semibold">{companyName || "your team"}</span>.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Sign In
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle className="mx-auto mb-4 text-primary" size={48} />
            <h2 className="text-xl font-display font-bold mb-2">Welcome to {companyName || "the team"}!</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been created and you've been added to <span className="font-semibold">{companyName || "the team"}</span>.
            </p>
            <Button onClick={handleSignIn} className="w-full">
              Sign In Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
