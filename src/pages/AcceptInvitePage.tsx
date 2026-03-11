import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AcceptInvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"loading" | "form" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  useEffect(() => {
    if (!token) {
      setStep("error");
      setErrorMessage("No invite token provided");
      return;
    }

    // Verify the token is valid by checking user_invites
    const verifyToken = async () => {
      try {
        // We can't directly query user_invites without auth, so we'll just show the form
        // The accept-invite function will validate the token server-side
        setStep("form");
      } catch {
        setStep("error");
        setErrorMessage("Failed to verify invitation");
      }
    };

    verifyToken();
  }, [token]);

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
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/accept-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

      setInviteEmail(data.email || "");
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
      navigate("/dashboard");
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
            <p className="text-muted-foreground text-sm mb-6">
              Create your account to join the team.
            </p>

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
                  "Create Account & Join"
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

        {step === "success" && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle className="mx-auto mb-4 text-primary" size={48} />
            <h2 className="text-xl font-display font-bold mb-2">Welcome aboard!</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been created and you've been added to the team.
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
