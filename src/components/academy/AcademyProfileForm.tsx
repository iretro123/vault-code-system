import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEZONES, formatTimezone } from "@/lib/timezones";
import { Loader2, Check, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROLE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "professional", label: "Professional" },
];

const AVATAR_COLORS = [
  "hsl(220, 70%, 50%)", "hsl(260, 60%, 55%)", "hsl(340, 65%, 50%)", "hsl(10, 70%, 50%)",
  "hsl(30, 80%, 50%)", "hsl(50, 75%, 45%)", "hsl(150, 55%, 40%)", "hsl(180, 55%, 42%)",
];

import { AVATAR_ICONS } from "@/lib/avatarIcons";

type AvatarMode = "initials" | "icon" | "image";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      const target = Math.min(size, 640); // max 640x640
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

interface Props {
  isOnboarding?: boolean;
}

export function AcademyProfileForm({ isOnboarding = false }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [roleLevel, setRoleLevel] = useState("beginner");
  const [timezone, setTimezone] = useState("America/New_York");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("initials");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarIcon, setAvatarIcon] = useState(AVATAR_ICONS[0].id);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setRoleLevel((profile as any).role_level || "beginner");
      const av = (profile as any).avatar_url || "";
      if (av.startsWith("icon:")) {
        const parts = av.replace("icon:", "").split("|");
        setAvatarMode("icon");
        setAvatarIcon(parts[0] || AVATAR_ICONS[0].id);
        setAvatarColor(parts[1] || AVATAR_COLORS[0]);
      } else if (av.startsWith("initials:")) {
        setAvatarMode("initials");
        setAvatarColor(av.replace("initials:", "") || AVATAR_COLORS[0]);
      } else if (av.startsWith("http")) {
        setAvatarMode("image");
        setImageUrl(av);
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

  const avatarUrl =
    avatarMode === "image" && imageUrl
      ? imageUrl
      : avatarMode === "initials"
        ? `initials:${avatarColor}`
        : `icon:${avatarIcon}|${avatarColor}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Upload failed. Please try again (JPG/PNG/WebP under 5MB).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Upload failed. Please try again (JPG/PNG/WebP under 5MB).");
      return;
    }
    if (!user) return;

    setUploading(true);
    try {
      // Refresh session to ensure we have a valid JWT for storage
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      console.debug("[AvatarUpload] session present:", !!accessToken, "uid:", sessionData?.session?.user?.id);

      if (!accessToken) {
        console.error("[AvatarUpload] No active session — user must re-login");
        toast.error("Session expired. Please sign out and sign back in.", {
          action: { label: "Retry", onClick: () => fileInputRef.current?.click() },
        });
        setUploading(false);
        return;
      }

      const cropped = await cropToSquare(file);
      const path = `${user.id}/profile-${Date.now()}.webp`;
      
      console.debug("[AvatarUpload] bucket=avatars path=", path, "blob size=", cropped.size);

      // Upload using fetch with explicit auth header to guarantee JWT is sent
      const formData = new FormData();
      formData.append("", cropped);
      formData.append("cacheControl", "3600");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/avatars/${path}`,
        {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "authorization": `Bearer ${accessToken}`,
            "x-upsert": "true",
          },
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({}));
        console.error("[AvatarUpload] upload failed:", errBody.message || uploadRes.statusText, "status:", uploadRes.status, "body:", errBody);
        throw new Error(errBody.message || "Upload failed");
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      console.debug("[AvatarUpload] success, publicUrl=", publicUrl);
      setImageUrl(publicUrl);
      setAvatarMode("image");
    } catch (err) {
      console.error("[AvatarUpload] caught:", err);
      toast.error("Upload failed. Please try again (JPG/PNG/WebP under 5MB).", {
        action: { label: "Retry", onClick: () => fileInputRef.current?.click() },
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updateData: any = {
      display_name: displayName.trim() || null,
      role_level: roleLevel,
      timezone,
      phone_number: phoneNumber.trim() || null,
      avatar_url: avatarUrl,
    };
    if (isOnboarding) {
      updateData.profile_completed = true;
    }
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    if (isOnboarding) {
      navigate("/academy/home");
    }
  };

  const renderAvatar = (size: string) => {
    if (avatarMode === "image" && imageUrl) {
      return (
        <img
          src={imageUrl}
          alt="Avatar"
          className={`${size} rounded-2xl object-cover`}
        />
      );
    }
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
    <div className="space-y-5">
      {/* Avatar */}
      <Card className="p-5 space-y-4">
        <Label className="text-xs text-muted-foreground">Avatar</Label>
        <div className="flex items-center gap-5">
          {renderAvatar("h-20 w-20")}
          <div className="space-y-3 flex-1">
            {/* Mode tabs */}
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setAvatarMode("initials")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${avatarMode === "initials" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>Initials</button>
              <button type="button" onClick={() => setAvatarMode("icon")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${avatarMode === "icon" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>Icon</button>
              <button type="button" onClick={() => setAvatarMode("image")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${avatarMode === "image" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>Photo</button>
            </div>

            {/* Image upload UI */}
            {avatarMode === "image" && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : imageUrl ? "Change Photo" : "Upload Photo"}
                </Button>
                <p className="text-[10px] text-muted-foreground/60">JPG, PNG, or WebP · Max 5 MB · Auto-cropped to square</p>
              </div>
            )}

            {/* Color picker for initials/icon */}
            {avatarMode !== "image" && (
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => setAvatarColor(c)} className={`h-6 w-6 rounded-full border-2 transition-transform ${avatarColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            )}

            {/* Icon picker */}
            {avatarMode === "icon" && (
              <div className="flex gap-1.5 flex-wrap">
                {GEOMETRIC_ICONS.map((icon) => (
                  <button type="button" key={icon.id} onClick={() => setAvatarIcon(icon.id)} className={`h-8 w-8 rounded-lg border transition-colors ${avatarIcon === icon.id ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/50"}`} style={{ color: avatarColor }}>
                    <span className="pointer-events-none">{icon.svg}</span>
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
            <SelectContent className="max-h-60 bg-popover border-border z-50">
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{formatTimezone(tz)}</SelectItem>)}
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
    </div>
  );
}
