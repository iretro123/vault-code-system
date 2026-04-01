import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { ChatAvatar } from "@/lib/chatAvatars";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";
import { ExperienceLevelBadge } from "@/components/academy/ExperienceLevelBadge";
import { usePublicProfile, clearProfileCache } from "@/hooks/usePublicProfile";
import { useUserPresence } from "@/hooks/useUserPresence";
import { useAuth } from "@/hooks/useAuth";
import { generateBannerGradient } from "@/lib/bannerGradient";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Calendar, Pencil, X, Camera, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

/* ── Social icons (inline SVG for brand accuracy) ── */

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { key: "social_twitter" as const, icon: XIcon, label: "X / Twitter", baseUrl: "https://x.com/" },
  { key: "social_instagram" as const, icon: InstagramIcon, label: "Instagram", baseUrl: "https://instagram.com/" },
  { key: "social_tiktok" as const, icon: TikTokIcon, label: "TikTok", baseUrl: "https://tiktok.com/@" },
  { key: "social_youtube" as const, icon: YouTubeIcon, label: "YouTube", baseUrl: "https://youtube.com/@" },
];

interface UserProfileCardProps {
  userId: string;
  onClose: () => void;
}

export function UserProfileCard({ userId, onClose }: UserProfileCardProps) {
  const { profile, loading, refetch } = usePublicProfile(userId);
  const { online } = useUserPresence(userId);
  const { user } = useAuth();
  const isOwnProfile = user?.id === userId;

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [socials, setSocials] = useState({ social_twitter: "", social_instagram: "", social_tiktok: "", social_youtube: "" });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [clearBanner, setClearBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const enterEditMode = () => {
    if (!profile) return;
    setBio(profile.bio || "");
    setSocials({
      social_twitter: profile.social_twitter || "",
      social_instagram: profile.social_instagram || "",
      social_tiktok: profile.social_tiktok || "",
      social_youtube: profile.social_youtube || "",
    });
    setBannerFile(null);
    setBannerPreview(null);
    setClearBanner(false);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setBannerFile(null);
    setBannerPreview(null);
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Banner must be under 5 MB");
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setClearBanner(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let newBannerUrl: string | null | undefined = undefined;

      if (clearBanner) {
        newBannerUrl = null;
      } else if (bannerFile) {
        const ext = bannerFile.name.split(".").pop() || "webp";
        const path = `${user.id}/banner-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, bannerFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        newBannerUrl = urlData.publicUrl;
      }

      const updates: Record<string, any> = {
        bio: bio.trim(),
        social_twitter: socials.social_twitter.trim() || null,
        social_instagram: socials.social_instagram.trim() || null,
        social_tiktok: socials.social_tiktok.trim() || null,
        social_youtube: socials.social_youtube.trim() || null,
      };
      if (newBannerUrl !== undefined) {
        updates.banner_url = newBannerUrl;
      }

      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
      if (error) throw error;

      clearProfileCache(user.id);
      refetch();
      toast.success("Profile updated");
      setEditMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="vault-profile-card w-[300px] p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSocials = SOCIAL_LINKS.some((s) => profile[s.key]);
  const memberSince = profile.created_at ? format(new Date(profile.created_at), "MMM yyyy") : null;

  const currentBannerStyle = (() => {
    if (editMode) {
      if (clearBanner) return { background: generateBannerGradient(profile.user_id) };
      if (bannerPreview) return { backgroundImage: `url(${bannerPreview})`, backgroundSize: "cover", backgroundPosition: "center" };
    }
    return profile.banner_url
      ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: generateBannerGradient(profile.user_id) };
  })();

  /* ── EDIT MODE ── */
  if (editMode) {
    return (
      <div className="vault-profile-card w-[300px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Banner with edit overlay */}
        <div className="h-20 relative group" style={currentBannerStyle}>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Upload Banner"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
            {(profile.banner_url || bannerPreview) && !clearBanner && (
              <button
                onClick={() => { setClearBanner(true); setBannerFile(null); setBannerPreview(null); }}
                className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                title="Remove Banner"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
          {/* Close edit */}
          <button
            onClick={cancelEdit}
            className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors z-10"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
          {/* Avatar */}
          <div className="absolute -bottom-9 left-4">
            <div className="vault-profile-avatar-ring rounded-full p-[2.5px]">
              <div className="rounded-full overflow-hidden bg-[hsl(220,15%,10%)] border-[3px] border-[hsl(220,15%,10%)]">
                <ChatAvatar avatarUrl={profile.avatar_url} userName={profile.display_name || "?"} size="h-[4.5rem] w-[4.5rem]" />
              </div>
            </div>
          </div>
        </div>

        {/* Edit form body */}
        <div className="pt-12 px-4 pb-4 space-y-3">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Edit Profile</h3>

          {/* Bio */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              rows={3}
              placeholder="Write a short bio…"
              className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
            <span className="text-[10px] text-muted-foreground/50 float-right">{bio.length}/160</span>
          </div>

          {/* Social links */}
          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground block">Social Links</label>
            {SOCIAL_LINKS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={socials[s.key]}
                    onChange={(e) => setSocials((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    placeholder={s.label}
                    className="flex-1 h-8 rounded-lg border border-border/50 bg-background/50 px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  /* ── VIEW MODE ── */
  return (
    <div className="vault-profile-card w-[300px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Banner */}
      <div className="h-20 relative" style={currentBannerStyle}>
        {isOwnProfile && (
          <button
            onClick={enterEditMode}
            className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
            title="Edit Profile"
          >
            <Pencil className="h-3.5 w-3.5 text-white" />
          </button>
        )}
        {/* Avatar overlapping banner */}
        <div className="absolute -bottom-9 left-4">
          <div className="relative">
            <div className="vault-profile-avatar-ring rounded-full p-[2.5px]">
              <div className="rounded-full overflow-hidden bg-[hsl(220,15%,10%)] border-[3px] border-[hsl(220,15%,10%)]">
                <ChatAvatar avatarUrl={profile.avatar_url} userName={profile.display_name || "?"} size="h-[4.5rem] w-[4.5rem]" />
              </div>
            </div>
            {/* Online indicator */}
            <div
              className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-[hsl(220,15%,10%)] ${
                online ? "bg-emerald-500" : "bg-zinc-600"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-12 px-4 pb-4 space-y-3">
        {/* Name + username */}
        <div>
          <h3 className="text-[15px] font-bold text-foreground leading-tight">
            {profile.display_name || "Trader"}
          </h3>
          {profile.username && (
            <p className="text-[12px] text-muted-foreground leading-tight">
              @{profile.username}
            </p>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <AcademyRoleBadge roleName={profile.academy_role_name} />
          <ExperienceLevelBadge level={profile.role_level} size="sm" />
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-[12px] text-muted-foreground/80 leading-relaxed line-clamp-3">
            {profile.bio}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Stats strip */}
        <div className="flex items-center gap-4">
          {memberSince && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{memberSince}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BookOpen className="h-3 w-3 shrink-0" />
            <span>{profile.lessons_completed} lessons</span>
          </div>
        </div>

        {/* Social links */}
        {hasSocials && (
          <>
            <div className="h-px bg-border/50" />
            <div className="flex items-center gap-1.5">
              {SOCIAL_LINKS.map((s) => {
                const handle = profile[s.key];
                if (!handle) return null;
                const url = handle.startsWith("http") ? handle : `${s.baseUrl}${handle.replace(/^@/, "")}`;
                const Icon = s.icon;
                return (
                  <a
                    key={s.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                    title={s.label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
