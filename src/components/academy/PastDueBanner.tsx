import { useEffect, useMemo, useState } from "react";
import { CreditCard, X, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isNativeIOSApp } from "@/lib/platform";

const DISMISS_KEY = "va_past_due_banner_dismissed_until";
const GRACE_DAYS = 3;

export function PastDueBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pastDueSince, setPastDueSince] = useState<Date | null>(null);
  const isIOS = isNativeIOSApp();

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until && Date.now() < until) setDismissed(true);
    } catch { void 0; }
  }, []);

  // Fetch how long the user has been past_due to compute days remaining before auto-lock.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from("student_access")
          .select("updated_at, status")
          .eq("user_id", uid)
          .eq("product_key", "vault_academy")
          .maybeSingle();
        if (alive && data?.updated_at) setPastDueSince(new Date(data.updated_at));
      } catch { void 0; }
    })();
    return () => { alive = false; };
  }, []);

  const daysLeft = useMemo(() => {
    if (!pastDueSince) return null;
    const elapsedMs = Date.now() - pastDueSince.getTime();
    const remainingMs = GRACE_DAYS * 24 * 60 * 60 * 1000 - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  }, [pastDueSince]);

  const urgent = daysLeft !== null && daysLeft <= 1;

  if (dismissed) return null;

  const handleUpdate = async () => {
    if (isIOS) {
      toast.info("Billing changes aren't available in the iOS app. Please update on the web.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-billing-portal");
      if (error) throw error;
      const url = data?.url;
      if (!url) throw new Error("No portal URL");
      const opened = window.open(url, "_blank");
      if (!opened) window.location.href = url;
    } catch {
      toast.error("Couldn't open billing portal. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Urgent (≤1 day left) cannot be dismissed.
    if (urgent) return;
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 12 * 60 * 60 * 1000));
    } catch { void 0; }
    setDismissed(true);
  };

  const headline = urgent ? "Access ending soon" : "Payment overdue";
  const detail = (() => {
    if (isIOS) return "Your last payment didn't go through. Update billing on the web to keep your access.";
    if (daysLeft === null) return "Your last payment didn't go through. Update billing to keep your access active.";
    if (daysLeft === 0) return "Your access will be locked within the next 24 hours. Update billing now to stay in.";
    if (daysLeft === 1) return "1 day left before your access is locked. Update billing now to stay in.";
    return `${daysLeft} days left before your access is locked. Update billing to stay in.`;
  })();

  const tone = urgent
    ? {
        border: "border-red-400/35",
        gradient: "from-red-500/[0.12] via-red-500/[0.05] to-transparent",
        shadow: "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(248,113,113,0.45)]",
        iconWrap: "bg-red-500/15 ring-red-400/30",
        iconColor: "text-red-300",
        title: "text-red-100",
        body: "text-red-200/80",
        button: "bg-red-400/95 text-red-950 hover:bg-red-300",
      }
    : {
        border: "border-amber-400/25",
        gradient: "from-amber-500/[0.08] via-amber-500/[0.04] to-transparent",
        shadow: "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(251,191,36,0.35)]",
        iconWrap: "bg-amber-500/15 ring-amber-400/25",
        iconColor: "text-amber-300",
        title: "text-amber-100",
        body: "text-amber-200/70",
        button: "bg-amber-400/90 text-amber-950 hover:bg-amber-300",
      };

  return (
    <div className={`relative z-[2] mx-3 mt-2 mb-1 overflow-hidden rounded-2xl border ${tone.border} bg-gradient-to-r ${tone.gradient} ${tone.shadow} backdrop-blur`}>
      <div className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${tone.iconWrap}`}>
          {urgent
            ? <AlertTriangle className={`h-4 w-4 ${tone.iconColor}`} />
            : <CreditCard className={`h-4 w-4 ${tone.iconColor}`} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-semibold leading-tight ${tone.title}`}>{headline}</p>
          <p className={`mt-0.5 text-[11.5px] leading-snug ${tone.body}`}>{detail}</p>
        </div>
        {!isIOS && (
          <button
            onClick={handleUpdate}
            disabled={loading}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold shadow-sm transition disabled:opacity-60 ${tone.button}`}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Update billing
          </button>
        )}
        {!urgent && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-white/5 ${tone.body} hover:${tone.title}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {!isIOS && (
        <button
          onClick={handleUpdate}
          disabled={loading}
          className={`sm:hidden mx-3.5 mb-3 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold shadow-sm transition disabled:opacity-60 ${tone.button}`}
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          Update billing
        </button>
      )}
    </div>
  );
}
