import { supportsWebPush, hasWebPushSubscription } from "@/lib/webPush";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { getPushPermissionState, requestPushPermission } from "@/lib/pushPermission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { cn } from "@/lib/utils";
import { CheckCircle2, Smartphone, TriangleAlert } from "lucide-react";
import { useOSNotifications } from "@/hooks/useOSNotifications";
import {isLocalDesignPreview} from '@/integrations/supabase/localPreviewFetch';

const TOGGLES = [
  { key: "notifications_enabled", label: "Enable Notifications", desc: "Master toggle for all alerts." },
  { key: "notify_chat", label: "Chat Messages", desc: "New messages in rooms you can access." },
  { key: "notify_pulse", label: "Pulse Zone Alerts", desc: "Choose your symbols below." },
  { key: "sounds_enabled", label: "Message Sounds", desc: "Play a chime for new community messages." },
  { key: "notify_announcements", label: "Announcements", desc: "Important updates from the team." },
  { key: "notify_new_modules", label: "New Module Drops", desc: "When new courses or lessons are added." },
  { key: "notify_coach_reply", label: "Coach Replies", desc: "When a coach responds to your question." },
  { key: "notify_live_events", label: "Live Events", desc: "Upcoming live sessions and webinars." },
] as const;

type ToggleKey = (typeof TOGGLES)[number]["key"];

export function SettingsNotifications() {
  const { prefs, loading, updatePrefs } = useUserPreferences();
  const { requestIfNeeded: requestOSPermission } = useOSNotifications();
  const [nativePermission, setNativePermission] = useState<string | null>(null);
  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    notifications_enabled: true,
    sounds_enabled: true,
    notify_announcements: true,
    notify_new_modules: true,
    notify_coach_reply: true,
    notify_chat: true,
    notify_pulse: true,
    notify_live_events: true,
  });
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);

  const savePreference = async (updates: Parameters<typeof updatePrefs>[0]) => {
    if (saveLock.current) return false;
    saveLock.current = true; setSaving(true);
    try {
      if (!await updatePrefs(updates)) throw new Error('save failed');
      return true;
    } catch {
      toast.error('Your notification settings were not saved. Please try again.');
      return false;
    } finally { saveLock.current = false; setSaving(false); }
  };

  useEffect(() => {
    if (prefs) {
      setValues({
        notifications_enabled: prefs.notifications_enabled,
        sounds_enabled: prefs.sounds_enabled,
        notify_announcements: prefs.notify_announcements,
        notify_new_modules: prefs.notify_new_modules,
        notify_coach_reply: prefs.notify_coach_reply,
        notify_chat: prefs.notify_chat ?? true,
        notify_pulse: prefs.notify_pulse ?? true,
        notify_live_events: prefs.notify_live_events,
      });
    }
  }, [prefs]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      if (supportsWebPush()) void hasWebPushSubscription().then(active => setNativePermission(active ? 'granted' : Notification.permission));
      return;
    }
    let cancelled = false;
    getPushPermissionState()
      .then((status) => {
        if (!cancelled) setNativePermission(status);
      })
      .catch(() => {
        if (!cancelled) setNativePermission("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestNativePush = async () => {
    if (!Capacitor.isNativePlatform()) {
      try {
        const granted = await requestOSPermission();
        setNativePermission(granted ? 'granted' : 'prompt');
        if (!granted) toast.error('Alerts are not enabled. Check browser permissions. On iPhone, add Vault to your Home Screen first.');
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to connect browser alerts.'); }
      return;
    }
    const permission = await requestPushPermission();
    setNativePermission(permission);
    if (permission === 'unsupported') toast.error('Push is unavailable in this app build. Please install the latest version.');
  };

  const handleToggle = async (key: ToggleKey, checked: boolean) => {
    if (!await savePreference({ [key]: checked })) return;
    setValues((v) => ({ ...v, [key]: checked }));
    if (key === "notifications_enabled" && checked && !isLocalDesignPreview()) {
      await requestNativePush();
    }
  };

  if (loading) {
    return <Card className="vault-card p-5 animate-pulse h-48" />;
  }

  const masterOff = !values.notifications_enabled;

  return (
    <div className="space-y-4">
      {(Capacitor.isNativePlatform() || supportsWebPush()) && (
        <Card className="vault-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              nativePermission === "granted" ? "bg-emerald-500/10 text-emerald-300" : "bg-primary/10 text-primary"
            )}>
              {nativePermission === "granted" ? <CheckCircle2 className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">Device Push Alerts</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {nativePermission === "granted"
                  ? "This device is allowed to receive Vault OS alerts."
                  : nativePermission === "denied"
                    ? "Notifications are blocked in device Settings. Turn them on for Vault OS to receive alerts."
                    : "Allow device notifications so chat, Pulse, and live-session alerts can reach you outside the app."}
              </p>
            </div>
          </div>

          {nativePermission !== "granted" && nativePermission !== "denied" && (
            <Button onClick={requestNativePush} className="w-full">
              Enable Device Alerts
            </Button>
          )}

          {nativePermission === "denied" && (
            <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Open device Settings → Vault OS → Notifications, then enable Allow Notifications.</span>
            </div>
          )}
        </Card>
      )}

      <Card className="vault-card p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <p className="text-xs text-muted-foreground">Get only the alerts that matter.</p>
        </div>

        <div className="space-y-4">
          {TOGGLES.map(({ key, label, desc }) => {
            const isMaster = key === "notifications_enabled";
            const disabled = saving || (!isMaster && masterOff);
            return (
              <div key={key} className={`flex items-center justify-between gap-4 ${disabled ? "opacity-40" : ""}`}>
                <div>
                  <Label className="text-sm font-medium text-foreground">{label}</Label>
                  <p className="text-[10px] text-muted-foreground/70">{desc}</p>
                </div>
                <Switch
                  aria-label={label}
                  checked={values[key]}
                  onCheckedChange={(v) => handleToggle(key, v)}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="vault-card p-5 space-y-4">
        <div><h3 className="text-sm font-semibold">Pulse symbols</h3><p className="text-xs text-muted-foreground">5m & 15m · New zones, entries and confirmed breaks.</p></div>
        {([['notify_pulse_spy', 'SPY'], ['notify_pulse_qqq', 'QQQ']] as const).map(([key, symbol]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div><Label className="text-sm font-semibold">${symbol}</Label></div>
            <Switch aria-label={`${symbol} Pulse alerts`} checked={prefs?.[key] ?? (symbol === 'SPY')} disabled={saving || masterOff || !values.notify_pulse || !prefs}
              onCheckedChange={checked => void savePreference({[key]: checked})}/>
          </div>
        ))}
      </Card>
      <p className="px-1 text-xs text-muted-foreground">Alerts appear in your notification inbox. Enable device notifications for chat, Pulse and live-session alerts outside the app.</p>
    </div>
  );
}
