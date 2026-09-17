import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEZONES, formatTimezone } from "@/lib/timezones";
import { Loader2, Check, Upload, Sparkles, RefreshCw, Camera, LockKeyhole, Instagram, Youtube, ExternalLink } from "lucide-react";
import { socialProfileUrl } from '@/lib/memberSocialLinks';
import { clearProfileCache } from '@/hooks/usePublicProfile';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {localPreviewFetch,isLocalDesignPreview} from '@/integrations/supabase/localPreviewFetch';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import './profile-editor.css';
import './profile-refined.css';

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

  const profileData = profile as {
    avatar_url?: string | null;
    username?: string | null;
    timezone?: string | null;
    phone_number?: string | null;
  } | null;
  const initialAv = parseAvatarUrl(profileData?.avatar_url);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio,setBio]=useState(profile?.bio||'');
  const [instagram,setInstagram]=useState(profile?.social_instagram||'');
  const [youtube,setYoutube]=useState(profile?.social_youtube||'');
  const [socialError,setSocialError]=useState('');
  const [avatarOpen,setAvatarOpen]=useState(false);
  const [username, setUsername] = useState(profileData?.username || "");
  const [timezone, setTimezone] = useState(profileData?.timezone || "America/New_York");
  const [phoneNumber, setPhoneNumber] = useState(profileData?.phone_number || "");
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
  const [genProgress, setGenProgress] = useState(0);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);
  const [aiStorageUrl, setAiStorageUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restoredDraft=useRef<string|null>(null);
  useEffect(()=>{
    if(!isLocalDesignPreview()||!user?.id||!hydrated||restoredDraft.current===user.id)return;
    restoredDraft.current=user.id;
    try{
      const draft=JSON.parse(sessionStorage.getItem(`vault-profile-draft:${user.id}`)||'null');
      if(!draft)return;
      if(typeof draft.displayName==='string')setDisplayName(draft.displayName.slice(0,50));
      if(typeof draft.bio==='string')setBio(draft.bio.slice(0,240));
      if(typeof draft.instagram==='string')setInstagram(draft.instagram.slice(0,200));
      if(typeof draft.youtube==='string')setYoutube(draft.youtube.slice(0,200));
      if(typeof draft.timezone==='string')setTimezone(draft.timezone);
      if(typeof draft.phoneNumber==='string')setPhoneNumber(draft.phoneNumber.slice(0,20));
      if(['image','icon','initials'].includes(draft.avatarMode))setAvatarMode(draft.avatarMode);
      if(AVATAR_COLORS.includes(draft.avatarColor))setAvatarColor(draft.avatarColor);
      if(AVATAR_ICONS.some(i=>i.id===draft.avatarIcon))setAvatarIcon(draft.avatarIcon);
      if(typeof draft.imageUrl==='string'&&/^(https:\/\/|data:image\/webp;base64,)/.test(draft.imageUrl))setImageUrl(draft.imageUrl);
    }catch{/* Ignore invalid local drafts. */}
  },[user?.id,hydrated]);
  useEffect(()=>{setSaved(false);setSocialError('');},[displayName,bio,instagram,youtube,timezone,phoneNumber,avatarMode,avatarColor,avatarIcon,imageUrl]);

  // Sync from profile only once when it arrives (if component mounted before profile loaded)
  useEffect(() => {
    if (!profile || hydrated) return;
    setHydrated(true);
    setDisplayName(profile.display_name || "");
    setBio(profile.bio||'');
    setInstagram(profile.social_instagram||'');
    setYoutube(profile.social_youtube||'');
    setTimezone(profileData?.timezone || "America/New_York");
    setPhoneNumber(profileData?.phone_number || "");
    setUsername(profileData?.username || "");
    const parsed = parseAvatarUrl(profileData?.avatar_url);
    setAvatarMode(parsed.mode);
    setAvatarColor(parsed.color);
    setAvatarIcon(parsed.icon);
    setImageUrl(parsed.imageUrl);
  }, [profile, hydrated, profileData]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.slice(0, 2) || "??").toUpperCase();
  };

  const avatarUrl =
    (avatarMode === "ai" && aiStorageUrl)
      ? aiStorageUrl
      : avatarMode === "image" && imageUrl
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
      if(isLocalDesignPreview()){
        const reader=new FileReader();
        const preview=await new Promise<string>((resolve,reject)=>{reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(cropped);});
        setImageUrl(preview);setAvatarMode('image');return;
      }
      const path = `${user.id}/profile-${Date.now()}.webp`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const formData = new FormData();
      formData.append("", cropped);
      formData.append("cacheControl", "3600");
      const res = await localPreviewFetch(`${supabaseUrl}/storage/v1/object/avatars/${path}`, {
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
    if(isLocalDesignPreview()){toast.info('AI generation is unavailable locally. Choose a Vault icon, initials, or your own photo.');return;}
    if (!user) return;
    const chosenStyle = styleOverride || aiStyle;

    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    await new Promise<void>((resolve) => {
      debounceRef.current = setTimeout(resolve, 300);
    });

    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setGenProgress(0);

    // Simulate progress over ~12s
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Ease toward 90% over 12s, never reach 100 until done
      const pct = Math.min(90, (elapsed / 12) * 90);
      setGenProgress(Math.round(pct));
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { style: chosenStyle },
      });

      if (controller.signal.aborted) return;

      if (error) throw error;
      if (data?.error) { toast.error(data.error); setGenerating(false); return; }

      const url = data?.url;
      if (!url) throw new Error("No image returned");

      setGenProgress(100);
      setAiPreviewUrl(url);
      setAiStorageUrl(url);
      setImageUrl(url);
      setAvatarMode("ai");
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      toast.error(error instanceof Error ? error.message : "Generation failed. Try again.");
    } finally {
      if (!controller.signal.aborted) {
        setGenerating(false);
        setGenProgress(0);
      }
      if (progressRef.current) clearInterval(progressRef.current);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if ((instagram.trim()&&!socialProfileUrl(instagram,'instagram'))||(youtube.trim()&&!socialProfileUrl(youtube,'youtube'))) {
      setSocialError('Enter an @handle or a full https:// link to Instagram or YouTube.');return;
    }
    if(isLocalDesignPreview()){
      try{sessionStorage.setItem(`vault-profile-draft:${user.id}`,JSON.stringify({displayName,bio,instagram,youtube,timezone,phoneNumber,avatarMode,avatarColor,avatarIcon,imageUrl}));setSaved(true);toast.success('Preview saved in this tab. Your live profile is unchanged.');}catch{toast.error('This preview could not be saved. Try a smaller photo.');}
      return;
    }
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio:bio.trim(),
        social_instagram:instagram.trim()||null,
        social_youtube:youtube.trim()||null,
        timezone,
        phone_number: phoneNumber.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    clearProfileCache(user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const renderAvatar = () => {
    if (avatarMode === "ai") {
      return (
        <div className="space-y-2">
          <div className="relative h-20 w-20 rounded-2xl overflow-hidden">
            {aiPreviewUrl && !generating ? (
              <img src={aiPreviewUrl} alt="AI Avatar" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-2xl flex flex-col items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/20 animate-pulse">
                <Sparkles className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          {generating && (
            <div className="w-20 space-y-1">
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground text-center">~10s</p>
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
    <div className="profile-editor space-y-5">
      <div className="vs-identity-preview" aria-label="Profile preview">
        <div className="vs-identity-banner"><span>VAULT / COMMUNITY</span></div>
        <div className="vs-identity-body"><div>{renderAvatar()}</div><div className="profile-identity-text"><h2>{displayName||'Your name'}</h2><p>{username?`@${username}`:'Your community profile'}</p></div><Button variant="outline" className="profile-change-avatar" onClick={()=>setAvatarOpen(true)}><Camera size={16}/>Change avatar</Button></div>
      </div>
      {/* Avatar Card */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}><DialogContent className="profile-avatar-dialog"><DialogHeader><DialogTitle>Make it yours.</DialogTitle><DialogDescription>Choose a photo, your initials, or a Vault avatar.</DialogDescription></DialogHeader>
        <div className="flex items-start gap-5 mt-4">
          <div className="space-y-3 flex-1">
            <div className="profile-avatar-modes flex gap-2 flex-wrap">
              {(["image", "icon", "initials", "ai"] as const).map((m) => (
                <button key={m} aria-pressed={avatarMode===m} disabled={m==='ai'&&isLocalDesignPreview()} title={m==='ai'&&isLocalDesignPreview()?'AI avatars are unavailable in local preview':undefined} onClick={() => { setAvatarMode(m); if (m === "ai" && !aiPreviewUrl) handleGenerate(); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${avatarMode === m ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>
                  {m === "image" ? "My photo" : m === "ai" ? "AI avatar" : m==='icon'?'Vault avatars':'Initials'}
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
                  <button aria-label={`Avatar color ${AVATAR_COLORS.indexOf(c)+1}`} aria-pressed={avatarColor===c} key={c} onClick={() => setAvatarColor(c)} className={`h-6 w-6 rounded-full border-2 transition-transform ${avatarColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            )}

            {avatarMode === "icon" && (
              <div className="profile-avatar-grid">
                {AVATAR_ICONS.map((icon) => (
                  <button aria-label={`Avatar icon ${icon.id}`} aria-pressed={avatarIcon===icon.id} type="button" key={icon.id} onClick={() => setAvatarIcon(icon.id)} className={`h-8 w-8 rounded-lg border transition-colors ${avatarIcon === icon.id ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/50"}`} style={{ color: avatarColor }}>
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
                      onClick={() => { setAiStyle(s.id); handleGenerate(s.id); }}
                      disabled={generating}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        aiStyle === s.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground"
                      } ${generating ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {aiPreviewUrl && !generating && (
                  <p className="text-[10px] text-muted-foreground/60">
                    Tap another style to regenerate. Save Profile below to keep it.
                  </p>
                )}
                {generating && (
                  <p className="text-[10px] text-muted-foreground/60">Generating…</p>
                )}
              </div>
            )}
          </div>
        </div>
        <Button className="profile-avatar-done" onClick={()=>setAvatarOpen(false)}>Use this avatar</Button>
      </DialogContent></Dialog>

      {/* Identity Card */}
      <div className="profile-fields space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Your details</h3>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-name" className="text-xs text-muted-foreground">Display name</Label>
          <Input id="profile-name" value={displayName} onChange={(e) => {setDisplayName(e.target.value);setSaved(false);}} placeholder="Your name" maxLength={50} className="vault-input" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-username" className="text-xs text-muted-foreground">Username</Label>
          <div className="profile-username-readonly"><Input id="profile-username" value={username} disabled className="vault-input" /><LockKeyhole size={15}/></div>
          <p className="profile-field-hint">Your permanent Vault username.</p>
        </div>

        <div className="space-y-1.5"><Label htmlFor="profile-bio">Bio</Label><Textarea id="profile-bio" value={bio} onChange={e=>{setBio(e.target.value);setSaved(false);}} maxLength={240} rows={3} placeholder="What are you learning? What do you trade?"/><p className="profile-field-hint">Visible to other members when published. <span>{bio.length}/240</span></p></div>
        <section className="profile-socials" aria-labelledby="profile-social-title">
          <h3 id="profile-social-title">Social links</h3>
          <p className="profile-field-hint">Help members find you outside Vault. Optional public links—not verified account connections.</p>
          {([{key:'instagram',label:'Instagram',Icon:Instagram,value:instagram,setValue:setInstagram},{key:'youtube',label:'YouTube',Icon:Youtube,value:youtube,setValue:setYoutube}] as const).map(({key,label,Icon,value,setValue})=><div className="profile-social-field" key={key}>
            <Label htmlFor={`profile-${key}`}><Icon size={18}/>{label}</Label>
            <Input id={`profile-${key}`} value={value} onChange={e=>setValue(e.target.value)} placeholder={key==='instagram'?'@yourname or Instagram profile link':'@yourchannel or YouTube channel link'} maxLength={200} autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
            {socialProfileUrl(value,key)&&<a href={socialProfileUrl(value,key)!} target="_blank" rel="noopener noreferrer">Preview {label} link <ExternalLink size={13}/></a>}
          </div>)}
          <p className="profile-field-hint">Clear a field and save to remove its link.{isLocalDesignPreview()?' Preview saves stay in this browser tab.':''}</p>
          {socialError&&<p role="alert" className="text-sm text-red-300">{socialError}</p>}
        </section>
        <details className="profile-private"><summary>Timezone & contact details</summary><p className="profile-field-hint">These do not appear on your public profile card.</p><div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="vault-input"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60 bg-popover border-border z-50">
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{formatTimezone(tz)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-phone" className="text-xs text-muted-foreground">Phone Number <span className="text-muted-foreground/50">(optional)</span></Label>
          <Input id="profile-phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555 000 0000" maxLength={20} className="vault-input" />
          <p className="text-[10px] text-muted-foreground/60">Optional. Used only if you want SMS support/account alerts.</p>
        </div>

        </details><div className="profile-save flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isLocalDesignPreview()?'Save preview':'Save profile'}
          </Button>
          {saved && <span className="text-xs text-emerald-500 font-medium">Saved</span>}
        </div>
      </div>
    </div>
  );
}
