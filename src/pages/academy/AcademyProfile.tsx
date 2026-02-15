import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, MessageSquare, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ROLE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "professional", label: "Professional" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const AVATAR_COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(260, 60%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(10, 70%, 50%)",
  "hsl(30, 80%, 50%)",
  "hsl(50, 75%, 45%)",
  "hsl(150, 55%, 40%)",
  "hsl(180, 55%, 42%)",
];

// Simple geometric icon SVGs (non-copyright, abstract shapes)
const GEOMETRIC_ICONS = [
  { id: "diamond", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="8" y="8" width="24" height="24" rx="4" transform="rotate(45 20 20)" fill="currentColor" opacity="0.9" /><rect x="14" y="14" width="12" height="12" rx="2" transform="rotate(45 20 20)" fill="currentColor" opacity="0.4" /></svg> },
  { id: "circles", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><circle cx="20" cy="16" r="8" fill="currentColor" opacity="0.8" /><circle cx="14" cy="26" r="5" fill="currentColor" opacity="0.5" /><circle cx="26" cy="26" r="5" fill="currentColor" opacity="0.5" /></svg> },
  { id: "hexagon", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="currentColor" opacity="0.8" /><polygon points="20,12 27,16 27,24 20,28 13,24 13,16" fill="currentColor" opacity="0.3" /></svg> },
  { id: "triangle", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><polygon points="20,6 36,34 4,34" fill="currentColor" opacity="0.8" /><polygon points="20,16 28,30 12,30" fill="currentColor" opacity="0.3" /></svg> },
  { id: "bars", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="6" y="8" width="8" height="24" rx="3" fill="currentColor" opacity="0.9" /><rect x="16" y="14" width="8" height="18" rx="3" fill="currentColor" opacity="0.6" /><rect x="26" y="10" width="8" height="22" rx="3" fill="currentColor" opacity="0.75" /></svg> },
  { id: "cross", svg: <svg viewBox="0 0 40 40" className="h-full w-full"><rect x="15" y="6" width="10" height="28" rx="3" fill="currentColor" opacity="0.8" /><rect x="6" y="15" width="28" height="10" rx="3" fill="currentColor" opacity="0.8" /></svg> },
];

type AvatarMode = "initials" | "icon";

const AcademyProfile = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [roleLevel, setRoleLevel] = useState("beginner");
  const [timezone, setTimezone] = useState("America/New_York");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("initials");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarIcon, setAvatarIcon] = useState(GEOMETRIC_ICONS[0].id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setRoleLevel(profile.role_level || "beginner");
      // Parse avatar_url for mode/color/icon
      const av = (profile as any).avatar_url || "";
      if (av.startsWith("icon:")) {
        const parts = av.replace("icon:", "").split("|");
        setAvatarMode("icon");
        setAvatarIcon(parts[0] || GEOMETRIC_ICONS[0].id);
        setAvatarColor(parts[1] || AVATAR_COLORS[0]);
      } else if (av.startsWith("initials:")) {
        setAvatarMode("initials");
        setAvatarColor(av.replace("initials:", "") || AVATAR_COLORS[0]);
      }
      setTimezone((profile as any).timezone || "America/New_York");
      setPhoneNumber((profile as any).phone_number || "");
    }
  }, [profile]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.slice(0, 2) || "??").toUpperCase();
  };

  const avatarUrl = avatarMode === "initials"
    ? `initials:${avatarColor}`
    : `icon:${avatarIcon}|${avatarColor}`;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        role_level: roleLevel,
        timezone,
        phone_number: phoneNumber.trim() || null,
        avatar_url: avatarUrl,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const renderAvatar = (size: string) => {
    if (avatarMode === "icon") {
      const icon = GEOMETRIC_ICONS.find((i) => i.id === avatarIcon) || GEOMETRIC_ICONS[0];
      return (
        <div className={`${size} rounded-2xl flex items-center justify-center`} style={{ backgroundColor: avatarColor + "22", color: avatarColor }}>
          {icon.svg}
        </div>
      );
    }
    return (
      <div className={`${size} rounded-2xl flex items-center justify-center text-white font-bold`} style={{ backgroundColor: avatarColor }}>
        <span className={size === "h-20 w-20" ? "text-2xl" : "text-base"}>{getInitials(displayName || "?")}</span>
      </div>
    );
  };

  return (
    <AcademyLayout>
      <PageHeader title="Profile" subtitle="Personalize your Academy identity" />
      <div className="px-4 md:px-6 pb-6 space-y-5 max-w-lg">

        {/* Avatar */}
        <Card className="p-5 space-y-4">
          <Label className="text-xs text-muted-foreground">Avatar</Label>
          <div className="flex items-center gap-5">
            {renderAvatar("h-20 w-20")}
            <div className="space-y-3 flex-1">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAvatarMode("initials")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${avatarMode === "initials" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  Initials
                </button>
                <button
                  onClick={() => setAvatarMode("icon")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${avatarMode === "icon" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  Icon
                </button>
              </div>

              {/* Color picker */}
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${avatarColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Icon selector (only when mode is icon) */}
              {avatarMode === "icon" && (
                <div className="flex gap-1.5 flex-wrap">
                  {GEOMETRIC_ICONS.map((icon) => (
                    <button
                      key={icon.id}
                      onClick={() => setAvatarIcon(icon.id)}
                      className={`h-8 w-8 rounded-lg border transition-colors ${avatarIcon === icon.id ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/50"}`}
                      style={{ color: avatarColor }}
                    >
                      {icon.svg}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Details */}
        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" maxLength={50} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Experience Level</Label>
            <Select value={roleLevel} onValueChange={setRoleLevel}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_LEVELS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Phone Number</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555 000 0000" maxLength={20} />
            <p className="text-[10px] text-muted-foreground/60">For important account/support alerts only</p>
          </div>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Profile"}
        </Button>

        {/* My Questions link */}
        <Card
          className="p-4 cursor-pointer hover:border-primary/30 transition-colors group"
          onClick={() => navigate("/academy/my-questions")}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">My Questions</p>
              <p className="text-[11px] text-muted-foreground">View your coach support history</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
          </div>
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyProfile;
