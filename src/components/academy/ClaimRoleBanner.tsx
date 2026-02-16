import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ClaimRoleBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("onboarding_state")
      .select("claimed_role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        // Show banner if no onboarding row or role not claimed
        if (!data || !data.claimed_role) setShow(true);
      });
  }, [user]);

  if (!show) return null;

  return (
    <div className="max-w-2xl rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3.5 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Rocket className="h-4.5 w-4.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Step 1: Claim your role to unlock your starting path.
        </p>
      </div>
      <button
        onClick={() => navigate("/academy/start")}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Claim Role
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
