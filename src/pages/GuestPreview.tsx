import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { disableGuestMode, isGuestMode } from "@/lib/guestMode";

/**
 * Auto sign-in as the shared guest user, then jump straight into Community
 * chat. The guest account has the `basic_tier` role so it can only see
 * Learn + Community.
 */
export default function GuestPreview() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGuestMode()) {
      navigate("/auth", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("guest-signin");
        if (fnError) throw fnError;
        const creds = data as { email: string; password: string };
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        });
        if (signInError) throw signInError;
        if (cancelled) return;
        // Guest is signed in as basic_tier — BasicTierRedirect will allow community.
        disableGuestMode();
        window.dispatchEvent(new Event("guest-mode-changed"));
        navigate("/academy/community", { replace: true });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not enter guest mode.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 70%),
          linear-gradient(180deg, hsl(212,25%,6%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      <div className="text-center space-y-4 max-w-sm">
        {error ? (
          <>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Guest entry failed</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={() => {
                disableGuestMode();
                navigate("/auth", { replace: true });
              }}
              className="mt-2"
            >
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Entering guest mode…</p>
          </>
        )}
      </div>
    </div>
  );
}
