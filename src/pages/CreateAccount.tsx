import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CreateAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast({ title: "Please accept the terms to continue.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/basic`,
          data: { display_name: displayName.trim() || null },
        },
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (userId) {
        // Self-assign basic_tier role (allowed by RLS)
        await supabase.from("user_roles").insert({ user_id: userId, role: "basic_tier" });
      }
      // If session exists (auto-confirm), go straight in; otherwise prompt verify.
      if (data.session) {
        navigate("/basic", { replace: true });
      } else {
        toast({
          title: "Check your email",
          description: "Confirm your email to finish creating your account.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Could not create account",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 py-10"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.10) 0%, transparent 50%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      <div className="flex-1 w-full flex flex-col items-center justify-center max-w-md">
        <h1 className="text-5xl font-black tracking-tight text-center animate-fade-in">
          <span className="text-foreground">VAULT</span>
          <span className="text-primary">OS</span>
        </h1>
        <p className="mt-4 text-center text-base text-muted-foreground">
          Create your video library account.
        </p>

        <form onSubmit={handleSubmit} className="w-full mt-8 space-y-3">
          <Input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-12 rounded-xl"
            autoComplete="name"
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl"
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-12 rounded-xl"
            autoComplete="new-password"
          />

          <label className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span>
              I agree to the Community Terms &amp; Safety guidelines and understand that this
              membership provides access to on-demand video content only.
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-base font-semibold rounded-2xl gap-2 mt-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link to="/auth" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>

      <p className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 pt-8">
        Powered by Vault Trading Academy
      </p>
    </div>
  );
};

export default CreateAccount;
