import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEZONES, formatTimezone } from "@/lib/timezones";
import { Loader2, Check, Upload, Sparkles, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "hsl(220, 70%, 50%)", "hsl(260, 60%, 55%)", "hsl(340, 65%, 50%)", "hsl(10, 70%, 50%)",
  "hsl(30, 80%, 50%)", "hsl(50, 75%, 45%)", "hsl(150, 55%, 40%)", "hsl(180, 55%, 42%)",
];

import { AVATAR_ICONS } from "@/lib/avatarIcons";

type AvatarMode = "initials" | "icon" | "image" | "ai";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const AI_STYLES = [
  { id: "warrior", label: "Warrior" },
  { id: "mage", label: "Mage" },
  { id: "samurai", label: "Samurai" },
  { id: "dragon", label: "Dragon" },
  { id: "knight", label: "Knight" },
  { id: "ninja", label: "Ninja" },
  { id: "bull", label: "Bull" },
  { id: "bear", label: "Bear" },
  { id: "phoenix", label: "Phoenix" },
  { id: "skull", label: "Skull" },
] as const;

function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      const target = Math.min(size, 640);
      canvas.width = target;
      canvas.height = target;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Crop failed")),
        "image/webp",
        0.8
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

function parseAvatarUrl(av: string | null | undefined) {
  if (!av) return { mode: "initials" as AvatarMode, color: AVATAR_COLORS[0], icon: AVATAR_ICONS[0].id, imageUrl: null as string | null };
  if (av.startsWith("icon:")) {
    const parts = av.replace("icon:", "").split("|");
    return { mode: "icon" as AvatarMode, color: parts[1] || AVATAR_COLORS[0], icon: parts[0] || AVATAR_ICONS[0].id, imageUrl: null };
  }
  if (av.startsWith("initials:")) {
    return { mode: "initials" as AvatarMode, color: av.replace("initials:", "") || AVATAR_COLORS[0], icon: AVATAR_ICONS[0].id, imageUrl: null };
  }
  if (av.startsWith("http")) {
    return { mode: "image" as AvatarMode, color: AVATAR_COLORS[0], icon: AVATAR_ICONS[0].id, imageUrl: av };
  }
  return { mode: "initials" as AvatarMode, color: AVATAR_COLORS[0], icon: AVATAR_ICONS[0].id, imageUrl: null };
}

export function SettingsProfile() {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialAv = parseAvatarUrl((profile as any)?.avatar_url);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState((profile as any)?.username || "");
  const [timezone, setTimezone] = useState((profile as any)?.timezone || "America/New_York");
  const [phoneNumber, setPhoneNumber] = useState((profile as any)?.phone_number || "");
  const [avatarMode, setAvatarMode] = useState<AvatarMode>(initialAv.mode);
  const [avatarColor, setAvatarColor] = useState(initialAv.color);
  const [avatarIcon, setAvatarIcon] = useState(initialAv.icon);
  const [imageUrl, setImageUrl] = useState<string | null>(initialAv.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(!!profile);
  const [aiStyle, setAiStyle] = useState("warrior");
  const [generating, setGenerating] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);

  // Sync from profile only once when it arrives (if component mounted before profile loaded)
  useEffect(() => {
    if (!profile || hydrated) return;
    setHydrated(true);
    setDisplayName(profile.display_name || "");
    setTimezone((profile as any).timezone || "America/New_York");
    setPhoneNumber((profile as any).phone_number || "");
    setUsername((profile as any).username || "");
    const parsed = parseAvatarUrl((profile as any).avatar_url);
    setAvatarMode(parsed.mode);
    setAvatarColor(parsed.color);
    setAvatarIcon(parsed.icon);
    setImageUrl(parsed.imageUrl);
  }, [profile, hydrated]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.slice(0, 2) || "??").toUpperCase();
  };

  const avatarUrl =
    avatarMode === "image" && imageUrl
      ? imageUrl
      : avatarMode === "initials"
        ? `initials:${avatarColor}`
        : `icon:${avatarIcon}|${avatarColor}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      toast.error("JPG/PNG/WebP under 5 MB only.");
      return;
    }
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { toast.error("Session expired. Please sign in again."); setUploading(false); return; }
      const cropped = await cropToSquare(file);
      const path = `${user.id}/profile-${Date.now()}.webp`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const formData = new FormData();
      formData.append("", cropped);
      formData.append("cacheControl", "3600");
      const res = await fetch(`${supabaseUrl}/storage/v1/object/avatars/${path}`, {
        method: "POST",
        headers: { apikey: supabaseKey, authorization: `Bearer ${accessToken}`, "x-upsert": "true" },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setImageUrl(publicUrl);
      setAvatarMode("image");
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async (styleOverride?: string) => {
    if (!user || generating) return;
    const chosenStyle = styleOverride || aiStyle;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { style: chosenStyle },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); setGenerating(false); return; }

      const url = data?.url;
      if (!url) throw new Error("No URL returned");

      setAiPreviewUrl(url);
      setImageUrl(url);
      setAvatarMode("ai");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        timezone,
        phone_number: phoneNumber.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const renderAvatar = () => {
    if (avatarMode === "ai") {
      return (
        <div className="relative h-20 w-20 rounded-2xl overflow-hidden">
          {aiPreviewUrl ? (
            <img src={aiPreviewUrl} alt="AI Avatar" className={`h-20 w-20 rounded-2xl object-cover ${generating ? "opacity-40" : ""}`} />
          ) : (
            <div className="h-20 w-20 rounded-2xl flex flex-col items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/20">
              <Sparkles className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      );
    }
    if (avatarMode === "image" && imageUrl) {
      return <img src={imageUrl} alt="Avatar" className="h-20 w-20 rounded-2xl object-cover" />;
    }
    if (avatarMode === "icon") {
      const icon = AVATAR_ICONS.find((i) => i.id === avatarIcon) || AVATAR_ICONS[0];
      return (
        <div className="h-20 w-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: avatarColor.replace("hsl(", "hsla(").replace(")", ", 0.13)"), color: avatarColor }}>
          <div className="h-12 w-12">{icon.svg}</div>
        </div>
      );
    }
    return (
      <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: avatarColor }}>
        {getInitials(displayName || "?")}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Avatar Card */}
      <Card className="vault-card p-5">
        <div className="mb-1">
          <h3 className="text-sm font-semibold text-foreground">Avatar</h3>
          <p className="text-xs text-muted-foreground">This is how you appear in chat and the Academy.</p>
        </div>
        <div className="flex items-start gap-5 mt-4">
          {renderAvatar()}
          <div className="space-y-3 flex-1">
            <div className="flex gap-2 flex-wrap">
              {(["initials", "icon", "image", "ai"] as const).map((m) => (
                <button key={m} onClick={() => setAvatarMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${avatarMode === m ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>
                  {m === "image" ? "Photo" : m === "ai" ? "AI Pixel Art" : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {avatarMode === "image" && (
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : imageUrl ? "Change Photo" : "Upload Photo"}
                </Button>
                <p className="text-[10px] text-muted-foreground/60">JPG, PNG, or WebP · Max 5 MB</p>
              </div>
            )}

            {avatarMode !== "image" && avatarMode !== "ai" && (
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button key={c} onClick={() => setAvatarColor(c)} className={`h-6 w-6 rounded-full border-2 transition-transform ${avatarColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            )}

            {avatarMode === "icon" && (
              <div className="grid grid-cols-7 gap-1.5">
                {AVATAR_ICONS.map((icon) => (
                  <button type="button" key={icon.id} onClick={() => setAvatarIcon(icon.id)} className={`h-8 w-8 rounded-lg border transition-colors ${avatarIcon === icon.id ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/50"}`} style={{ color: avatarColor }}>
                    {icon.svg}
                  </button>
                ))}
              </div>
            )}

            {avatarMode === "ai" && (
              <div className="space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  {AI_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setAiStyle(s.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        aiStyle === s.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={generating}
                    onClick={handleGenerate}
                    className="gap-1.5"
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : aiPreviewUrl ? (
                      <RefreshCw className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generating ? "Generating…" : aiPreviewUrl ? "Regenerate" : "Generate Avatar"}
                  </Button>
                </div>

                {aiPreviewUrl && !generating && (
                  <p className="text-[10px] text-muted-foreground/60">
                    Like it? Hit "Save Profile" below to keep it.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Identity Card */}
      <Card className="vault-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Identity</h3>
          <p className="text-xs text-muted-foreground">Your public profile information.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Display Name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" maxLength={50} className="vault-input" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Username</Label>
          <Input value={username} disabled className="vault-input opacity-60 cursor-not-allowed" />
          <p className="text-[10px] text-muted-foreground/60">Set during registration. Cannot be changed.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="vault-input"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60 bg-popover border-border z-50">
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{formatTimezone(tz)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Phone Number <span className="text-muted-foreground/50">(Required)</span></Label>
          <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555 000 0000" maxLength={20} className="vault-input" />
          <p className="text-[10px] text-muted-foreground/60">For important alerts only.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Profile
          </Button>
          {saved && <span className="text-xs text-emerald-500 font-medium">Saved</span>}
        </div>
      </Card>
    </div>
  );
}
