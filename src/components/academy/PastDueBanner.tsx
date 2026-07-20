import { useEffect, useState } from "react";
import { CreditCard, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isNativeIOSApp } from "@/lib/platform";

const DISMISS_KEY = "va_past_due_banner_dismissed_until";

export function PastDueBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const isIOS = isNativeIOSApp();

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until && Date.now() < until) setDismissed(true);
    } catch { void 0; }
  }, []);

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
    // snooze for 12 hours
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 12 * 60 * 60 * 1000));
    } catch { void 0; }
    setDismissed(true);
  };

  return (
    <div className="relative z-[2] mx-3 mt-2 mb-1 overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(251,191,36,0.35)] backdrop-blur">
      <div className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/25">
          <CreditCard className="h-4 w-4 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-amber-100">
            Payment overdue
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-amber-200/70">
            {isIOS
              ? "Your last payment didn't go through. Update billing on the web soon to avoid losing access."
              : "Your last payment didn't go through. Update billing to keep your access active."}
          </p>
        </div>
        {!isIOS && (
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1.5 text-[11.5px] font-semibold text-amber-950 shadow-sm transition hover:bg-amber-300 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Update billing
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-200/70 transition hover:bg-white/5 hover:text-amber-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {!isIOS && (
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="sm:hidden mx-3.5 mb-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1.5 text-[11.5px] font-semibold text-amber-950 shadow-sm transition hover:bg-amber-300 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          Update billing
        </button>
      )}
    </div>
  );
}
