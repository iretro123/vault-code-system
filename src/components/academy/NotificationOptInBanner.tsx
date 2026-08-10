import { useEffect, useState } from "react";
import { Bell, ChevronRight, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  getPushPermissionState,
  isNativePushPlatform,
  requestPushPermission,
  type PushPermissionState,
} from "@/lib/pushPermission";

const SNOOZE_KEY = "va_push_optin_snoozed_until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Slim, dismissible opt-in strip for iOS + Android.
 * - Hidden entirely on web and when notifications are already on.
 * - One tap opens the native permission prompt.
 * - Dismiss snoozes it for a week, so it never nags.
 */
export function NotificationOptInBanner() {
  const [state, setState] = useState<PushPermissionState>("unsupported");
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNativePushPlatform()) return;
    let alive = true;
    (async () => {
      const next = await getPushPermissionState();
      if (!alive) return;
      setState(next);
      if (next === "granted" || next === "unsupported") return;
      let snoozedUntil = 0;
      try {
        snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      } catch { void 0; }
      setHidden(Date.now() < snoozedUntil);
    })();
    return () => { alive = false; };
  }, []);

  if (hidden || state === "granted" || state === "unsupported") return null;

  const isDenied = state === "denied";
  const isIOS = Capacitor.getPlatform() === "ios";

  const handleEnable = async () => {
    if (isDenied) {
      toast.info(
        isIOS
          ? "Open Settings › Notifications › Vault and turn on Allow Notifications."
          : "Open Settings › Apps › Vault › Notifications and turn them on.",
        { duration: 6000 },
      );
      return;
    }
    setBusy(true);
    const result = await requestPushPermission();
    setBusy(false);
    setState(result);
    if (result === "granted") {
      setHidden(true);
      toast.success("Notifications on. You'll get alerts the moment we post.");
    }
  };

  const snooze = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch { void 0; }
    setHidden(true);
  };

  return (
    <div className="relative z-[2] mx-3 mt-2 mb-1 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.10] via-primary/[0.04] to-transparent shadow-[0_1px_0_0_hsl(var(--foreground)/0.04)_inset,0_20px_40px_-28px_hsl(var(--primary)/0.45)] backdrop-blur">
      <div className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-foreground">
            {isDenied ? "Notifications are off" : "Turn on notifications"}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            {isDenied
              ? "Enable them in your phone settings so you don't miss calls and alerts."
              : "Get alerted the moment a call, live session or announcement drops."}
          </p>
        </div>
        <button
          onClick={handleEnable}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {isDenied ? "How to fix" : "Turn on"}
          <ChevronRight className="h-3 w-3" />
        </button>
        <button
          onClick={snooze}
          aria-label="Dismiss notification reminder"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
