import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const TOGGLES = [
  { key: "notifications_enabled", label: "Enable Notifications", desc: "Master toggle for all alerts." },
  { key: "sounds_enabled", label: "Message Sounds", desc: "Play a chime for new community messages." },
  { key: "notify_announcements", label: "Announcements", desc: "Important updates from the team." },
  { key: "notify_new_modules", label: "New Module Drops", desc: "When new courses or lessons are added." },
  { key: "notify_coach_reply", label: "Coach Replies", desc: "When a coach responds to your question." },
  { key: "notify_live_events", label: "Live Events", desc: "Upcoming live sessions and webinars." },
] as const;

type ToggleKey = (typeof TOGGLES)[number]["key"];

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
    }
  }, [prefs]);

  const handleToggle = async (key: ToggleKey, checked: boolean) => {
    setValues((v) => ({ ...v, [key]: checked }));
    await updatePrefs({ [key]: checked });
  };

  if (loading) {
    return <Card className="vault-card p-5 animate-pulse h-48" />;
  }

  const masterOff = !values.notifications_enabled;

  return (
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
  );
}
