import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUserPreferences, type AlertChannel } from "@/hooks/useUserPreferences";
import { cn } from "@/lib/utils";
import { Bell, Mail, Smartphone } from "lucide-react";

const TOGGLES = [
  { key: "notifications_enabled", label: "Enable Notifications", desc: "Master toggle for all alerts." },
  { key: "sounds_enabled", label: "Message Sounds", desc: "Play a chime for new community messages." },
  { key: "notify_announcements", label: "Announcements", desc: "Important updates from the team." },
  { key: "notify_new_modules", label: "New Module Drops", desc: "When new courses or lessons are added." },
  { key: "notify_coach_reply", label: "Coach Replies", desc: "When a coach responds to your question." },
  { key: "notify_live_events", label: "Live Events", desc: "Upcoming live sessions and webinars." },
] as const;

type ToggleKey = (typeof TOGGLES)[number]["key"];

const CHANNEL_OPTIONS: { value: AlertChannel; label: string; icon: typeof Bell; desc: string }[] = [
  { value: "in_app", label: "In-App Only", icon: Bell, desc: "Notifications inside the platform" },
  { value: "email", label: "Email Only", icon: Mail, desc: "Receive alerts via email" },
  { value: "both", label: "Both", icon: Smartphone, desc: "In-app + email notifications" },
];

export function SettingsNotifications() {
  const { prefs, loading, updatePrefs } = useUserPreferences();
  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    notifications_enabled: true,
    sounds_enabled: true,
    notify_announcements: true,
    notify_new_modules: true,
    notify_coach_reply: true,
    notify_live_events: true,
  });
  const [channel, setChannel] = useState<AlertChannel>("in_app");

  useEffect(() => {
    if (prefs) {
      setValues({
        notifications_enabled: prefs.notifications_enabled,
        sounds_enabled: prefs.sounds_enabled,
        notify_announcements: prefs.notify_announcements,
        notify_new_modules: prefs.notify_new_modules,
        notify_coach_reply: prefs.notify_coach_reply,
        notify_live_events: prefs.notify_live_events,
      });
      setChannel(prefs.preferred_alert_channel);
    }
  }, [prefs]);

  const handleToggle = async (key: ToggleKey, checked: boolean) => {
    setValues((v) => ({ ...v, [key]: checked }));
    await updatePrefs({ [key]: checked });
  };

  const handleChannelChange = async (val: AlertChannel) => {
    setChannel(val);
    await updatePrefs({ preferred_alert_channel: val });
  };

  if (loading) {
    return <Card className="vault-card p-5 animate-pulse h-48" />;
  }

  const masterOff = !values.notifications_enabled;

  return (
    <div className="space-y-4">
      <Card className="vault-card p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          <p className="text-xs text-muted-foreground">Get only the alerts that matter.</p>
        </div>

        <div className="space-y-4">
          {TOGGLES.map(({ key, label, desc }) => {
            const isMaster = key === "notifications_enabled";
            const disabled = !isMaster && masterOff;
            return (
              <div key={key} className={`flex items-center justify-between gap-4 ${disabled ? "opacity-40" : ""}`}>
                <div>
                  <Label className="text-sm font-medium text-foreground">{label}</Label>
                  <p className="text-[10px] text-muted-foreground/70">{desc}</p>
                </div>
                <Switch
                  checked={values[key]}
                  onCheckedChange={(v) => handleToggle(key, v)}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className={cn("vault-card p-5 space-y-4", masterOff && "opacity-40 pointer-events-none")}>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Alert Channel</h3>
          <p className="text-xs text-muted-foreground">Choose how you receive notifications outside the app.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CHANNEL_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => handleChannelChange(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-100",
                channel === value
                  ? "border-primary/40 bg-primary/[0.08] text-primary"
                  : "border-border/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[11px] font-semibold leading-tight">{label}</span>
              <span className="text-[9px] text-muted-foreground/60 leading-tight">{desc}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
