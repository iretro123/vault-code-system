import { useState, useCallback, useLayoutEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OnboardingProgressBar, OnboardingStep } from "./OnboardingStep";
import { VaultTourCarousel } from "./VaultTourCarousel";
import { VaultProductPreview } from "./VaultProductPreview";
import { VaultSocialInvite } from "./VaultSocialInvite";
import { VaultProfileReview } from "./VaultProfileReview";
import { VaultArrival } from "./VaultArrival";
import "./vault-alert-setup.css";
import { AVATAR_ICONS } from "@/lib/avatarIcons";
import { ChatAvatar } from "@/lib/chatAvatars";
import { VAULT_AVATARS } from "@/lib/vaultAvatars";
import { requestPushPermission, isNativePushPlatform } from "@/lib/pushPermission";
import "./app-onboarding.css";
import {
  Loader2,
  ChevronRight,
  Check,
  Target,
  ShieldCheck,
  Crosshair,
  Users,
  Bell,
  Sparkles,
  Camera,
  Upload,
  ArrowLeft,
  LockKeyhole,
  MessageCircle,
  Radio,
} from "lucide-react";

const AVATAR_COLORS = [
  "hsl(220, 70%, 55%)",
  "hsl(325, 90%, 65%)",
  "hsl(205, 95%, 70%)",
  "hsl(340, 85%, 78%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(190, 70%, 50%)",
  "hsl(0, 70%, 55%)",
  "hsl(280, 60%, 60%)",
];

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type TradingGoal =
  | "build_consistency"
  | "manage_risk"
  | "find_edge"
  | "stay_accountable";

const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  desc: string;
}[] = [
  {
    value: "beginner",
    label: "I'm starting fresh",
    desc: "Help me understand the basics, one step at a time.",
  },
  {
    value: "intermediate",
    label: "I've started trading",
    desc: "I know the basics. I want a more consistent process.",
  },
  {
    value: "advanced",
    label: "I have a routine",
    desc: "I'm here to refine my decisions and review my execution.",
  },
];

const GOAL_OPTIONS: { value: TradingGoal; label: string; icon: typeof Target }[] = [
  { value: "build_consistency", label: "Build consistency", icon: Target },
  { value: "manage_risk", label: "Manage risk better", icon: ShieldCheck },
  { value: "find_edge", label: "Find my edge", icon: Crosshair },
  { value: "stay_accountable", label: "Stay accountable", icon: Users },
];

export function AppOnboarding({ isPreview = false }: { isPreview?: boolean }) {
  const navigate = useNavigate();
  const { user, profile, refetchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    stageRef.current?.scrollTo({ top: 0, behavior: "instant" });
    const heading = stageRef.current?.querySelector<HTMLElement>(".onboarding-step h1, .onboarding-step h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }, [step]);
  const profileData = profile as { first_name?: string; last_name?: string } | null | undefined;

  // Step 1 — Identity
  const [fullName, setFullName] = useState(
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name :
      [profileData?.first_name, profileData?.last_name].filter(Boolean).join(" ")
  );
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const detectedTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/New_York";
    }
  })();

  // Step 2 — Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedLegend, setSelectedLegend] = useState<string | null>(null);
  const [avatarTab, setAvatarTab] = useState<"characters" | "emblems">("characters");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Step 3 — Experience
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);

  // Step 5 — Goal
  const [goal, setGoal] = useState<TradingGoal | null>(null);

  // Final
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);

  const handleIconSelect = (iconId: string) => {
    setSelectedIcon(iconId);
    setSelectedLegend(null);
    setAvatarUrl(`icon:${iconId}|${selectedColor}`);
  };

  const handleLegendSelect = (id: string) => {
    setSelectedLegend(id);
    setSelectedIcon(null);
    setAvatarUrl(`character:${id}`);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (selectedIcon) {
      setAvatarUrl(`icon:${selectedIcon}|${color}`);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
      setSelectedIcon(null);
      setSelectedLegend(null);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const next = () => setStep((s) => Math.min(7, s + 1));
  const previous = () => setStep((s) => Math.max(0, s - 1));

  const handleNotifications = async () => {
    if (isPreview) { next(); return; }
    setNotificationBusy(true);
    try {
      if (isNativePushPlatform()) {
        await requestPushPermission();
      } else if ("Notification" in window) {
        await Notification.requestPermission();
      }
    } finally {
      setNotificationBusy(false);
      next();
    }
  };

  const handleDismiss = useCallback(async () => {
    if (isPreview) {
      navigate(import.meta.env.DEV && window.location.pathname.startsWith("/__preview/")
        ? "/__preview/onboarding/home" : "/academy/home", { replace: true });
      return;
    }
    await refetchProfile();
    navigate("/academy/home", { replace: true });
    // Safety net: if the auth context does not swap the layout, reload once.
    setTimeout(() => {
      if (window.location.pathname !== "/academy/home") {
        window.location.href = "/academy/home";
      }
    }, 2000);
  }, [isPreview, navigate, refetchProfile]);

  const handleActivate = useCallback(async () => {
    if (isPreview) {
      setActivated(true);
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      if (!fullName.trim() || !displayName.trim()) {
        toast.error("Please enter your full name and display name.");
        setStep(1);
        return;
      }
      const { error: nameError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (nameError) throw nameError;
      const roleLevel = experience || "beginner";

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          timezone: detectedTz,
          role_level: roleLevel,
          academy_experience: roleLevel,
          trading_goal: goal || null,
          profile_completed: true,
          onboarding_completed: true,
          avatar_url: avatarUrl || "initials:hsl(217, 91%, 60%)",
        })
        .eq("user_id", user.id);

      if (updateErr) throw updateErr;

      await supabase
        .from("onboarding_state")
        .upsert(
          { user_id: user.id, claimed_role: true, role_level: roleLevel },
          { onConflict: "user_id" }
        );

      setActivated(true);
    } catch (e) {
      console.error("Onboarding activation failed:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [user, fullName, displayName, experience, goal, avatarUrl, detectedTz, isPreview]);

  return (
    <main className="app-onboarding">
      <aside className="onboarding-rail" aria-label="Vault OS setup overview">
        <div className="onboarding-brand"><span className="onboarding-brand-mark"><Sparkles /></span><span>Vault OS</span></div>
        <div className="onboarding-rail-copy">
          <span>Personal setup</span>
          <h2>A calmer way to get started.</h2>
          <p>We will personalize your experience, show you where everything lives, and give you a clear first move.</p>
          <div className="onboarding-rail-list"><div><span>1</span>Build your profile</div><div><span>2</span>Learn the navigation</div><div><span>3</span>Enter with a game plan</div></div>
        </div>
        <div className="onboarding-secure"><LockKeyhole /> Saved securely to your account</div>
      </aside>
      <div className="onboarding-stage" ref={stageRef}>
        <div className="onboarding-stage-inner">
        <div className="ob-brand-header"><span>VAULT <b>OS</b></span></div>
        {step > 0 && step < 7 && <OnboardingProgressBar current={step} />}
        {step > 0 && !activated && <button type="button" className="onboarding-back" onClick={previous}><ArrowLeft className="h-4 w-4" /> Back</button>}

        {/* Step 0 — Welcome */}
        <OnboardingStep active={step === 0}>
          <div className="onboarding-welcome">
            <div>
              <h1 className="onboarding-title">A sharper start.<br /><span>A space that's yours.</span></h1>
              <p className="onboarding-lead">Your education, your community, your process. Together in Vault.</p>
            </div>
            <div className="ob-welcome-visual"><VaultProductPreview/></div>
            <Button
              onClick={next}
              className="onboarding-primary-action"
            >
              Personalize my Vault
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 1 — Identity */}
        <OnboardingStep active={step === 1}>
          <div className="onboarding-form-card flex flex-col gap-6 w-full py-4">
            <div className="onboarding-form-title">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                What should we call you?
              </h2>
              <p className="text-sm text-muted-foreground">
                Your display name is how members see you.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="onboarding-full-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Full name
                </label>
                <Input
                  id="onboarding-full-name"
                  autoComplete="name"
                  maxLength={100}
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] text-base"
                />
              </div>
              <div>
                <label htmlFor="onboarding-display-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Display name
                </label>
                <Input
                  id="onboarding-display-name"
                  autoComplete="nickname"
                  maxLength={40}
                  placeholder="What should members call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] text-base"
                />
              </div>
            </div>

            <Button
              onClick={next}
              disabled={!fullName.trim() || !displayName.trim()}
              className="onboarding-primary-action"
            >
              Continue
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 2 — Avatar */}
        <OnboardingStep active={step === 2}>
          <div className="onboarding-form-card vault-avatar-step flex flex-col gap-6 w-full py-4">
            <div className="onboarding-form-title">
              <span className="onboarding-eyebrow">Your presence</span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Choose Your Avatar
              </h2>
              <p className="text-sm text-muted-foreground">
                A character, a signature emblem, or your own photo.
              </p>
            </div>

            {/* Preview */}
            <div className="vault-player-preview" aria-live="polite">
              <div className="h-20 w-20">
                {avatarUrl ? (
                  <ChatAvatar avatarUrl={avatarUrl} userName={displayName || "T"} size="h-20 w-20 text-2xl" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-white/[0.06] border-2 border-dashed border-white/[0.15] flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <span className="onboarding-eyebrow">Your Vault profile</span>
                <strong>{displayName || "New player"}</strong>
                <small>{VAULT_AVATARS.find((avatar) => avatar.id === selectedLegend)?.name || "Choose your signature look"}</small>
              </div>
            </div>

            <div className="vault-avatar-filters" role="group" aria-label="Avatar style">
              <button type="button" aria-pressed={avatarTab === "characters"} onClick={() => setAvatarTab("characters")}>Characters</button>
              <button type="button" aria-pressed={avatarTab === "emblems"} onClick={() => setAvatarTab("emblems")}>Emblems</button>
            </div>
            {avatarTab === "characters" && <div>
              <div className="vault-legends-heading">
                <div><span>Avatar collection</span><small>A little personality goes a long way.</small></div>
                <strong>Vault Originals</strong>
              </div>
              <div className="vault-legends-grid">
                {VAULT_AVATARS.map((legend) => (
                  <button key={legend.id} type="button" onClick={() => handleLegendSelect(legend.id)} aria-pressed={selectedLegend === legend.id} className={cn("vault-legend-card", selectedLegend === legend.id && "is-selected")}>
                    <img src={legend.image} alt="" />
                    <div><strong>{legend.name}</strong><small>{legend.personality}</small></div>
                    {selectedLegend === legend.id && <Check className="vault-legend-check" />}
                  </button>
                ))}
              </div>
            </div>}

            {avatarTab === "emblems" && <div className="vault-emblem-panel">

            {/* Color picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    aria-label={`Emblem color ${AVATAR_COLORS.indexOf(color) + 1}`}
                    aria-pressed={selectedColor === color}
                    onClick={() => handleColorSelect(color)}
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Icon grid */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Icon
              </label>
              <div className="vault-emblem-grid">
                {["vault-mark", "crossed-swords", "ronin-mask", "winged-rank", "sword", "crown", "lightning", "controller", "fox-mask", "pixel-ghost", "battle-axe", "winged-blade"].map((id) => AVATAR_ICONS.find((icon) => icon.id === id)!).map((icon) => (
                  <button
                    key={icon.id}
                    aria-label={icon.id.replace(/-/g, " ")}
                    aria-pressed={selectedIcon === icon.id}
                    onClick={() => handleIconSelect(icon.id)}
                    className={cn(
                      "vault-emblem-tile rounded-xl flex items-center justify-center transition-all",
                      selectedIcon === icon.id
                        ? "bg-primary/20 border-2 border-primary/50 scale-105"
                        : "bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]"
                    )}
                    style={{ color: selectedColor }}
                  >
                    <span className="vault-emblem-art">{icon.svg}</span>
                    <small>{icon.id.replace(/-/g, " ")}</small>
                  </button>
                ))}
              </div>
            </div>
            </div>}

            {/* Upload option */}
            <label className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer">
              {uploadingPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">Upload a photo instead</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </label>

            <Button
              onClick={next}
              className="onboarding-primary-action"
            >
              {avatarUrl ? "Use this avatar" : "Continue with my initials"}
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 3 — Experience */}
        <OnboardingStep active={step === 3}>
          <div className="onboarding-form-card flex flex-col gap-6 w-full py-4">
            <div className="onboarding-form-title">
              <span className="onboarding-eyebrow">Set your starting point</span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Every trader starts somewhere.
              </h2>
              <p className="text-sm text-muted-foreground">
                No pressure. Pick what sounds like you today.
              </p>
            </div>

            <div className="space-y-3">
              {EXPERIENCE_OPTIONS.map((opt, index) => (
                <button
                  key={opt.value}
                  onClick={() => setExperience(opt.value)}
                  aria-pressed={experience === opt.value}
                  data-tone={index}
                  className={cn(
                    "vault-choice w-full text-left rounded-2xl border p-5 transition-all duration-200",
                    experience === opt.value
                      ? "border-primary/40 bg-primary/[0.08] shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <span className="vault-choice-level" aria-hidden="true">{[0,1,2].map(level=><i key={level} className={level<=index?"is-lit":""} style={{height:14+level*9}}/>)}</span>
                  <p className="text-base font-semibold text-foreground">
                    {opt.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            <Button
              onClick={next}
              disabled={!experience}
              className="onboarding-primary-action"
            >
              Continue
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 4 — Vault Tour */}
        <OnboardingStep active={step === 4}>
          <div className="w-full py-4">
            <VaultTourCarousel onComplete={next} />
          </div>
        </OnboardingStep>

        {/* Step 5 — Trading Goal */}
        <OnboardingStep active={step === 5}>
          <div className="onboarding-form-card flex flex-col gap-6 w-full py-4">
            <div className="onboarding-form-title">
              <span className="onboarding-eyebrow">Personalize your path</span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                What would progress look like?
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose one focus. You can always change it later.
              </p>
            </div>

            <div className="space-y-3">
              {GOAL_OPTIONS.map((opt, index) => {
                const GoalIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setGoal(opt.value)}
                    aria-pressed={goal === opt.value}
                    data-tone={index}
                    className={cn(
                      "vault-goal-choice w-full flex items-center gap-4 rounded-2xl border p-5 transition-all duration-200",
                      goal === opt.value
                        ? "border-primary/40 bg-primary/[0.08] shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="h-11 w-11 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                      <GoalIcon className="h-5 w-5 text-foreground" />
                    </div>
                    <span className="text-base font-semibold text-foreground">{opt.label}<small>{["Create a routine I can stick to.", "Understand my downside before I enter.", "Learn which setups fit my process.", "Reflect, learn, and keep showing up."][index]}</small></span>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={next}
              disabled={!goal}
              className="onboarding-primary-action"
            >
              Continue
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 6 — Notifications */}
        <OnboardingStep active={step === 6}>
          <div className="vault-alert-setup">
            <div className="onboarding-form-title w-full">
              <h2>Be there.<br/><span>When it matters.</span></h2>
              <p>Less checking the app.<br/>More being part of the room.</p>
            </div>
            <div className="vault-alert-scene" aria-label="Example notification preview">
              <div className="vault-alert-clock" aria-hidden="true"><span>MONDAY MORNING</span><strong>9:14</strong><small>One minute before the room opens.</small></div>
              <div className="vault-alert-toast">
                <span className="vault-alert-app-icon"><Radio size={22}/></span>
                <div className="vault-alert-toast-copy"><div><span>VAULT OS</span><small>now</small></div><strong>Your trading room is opening.</strong><p>Bring your questions. Join RZ live.</p></div>
              </div>
              <span className="vault-alert-preview-label">NOTIFICATION PREVIEW</span>
            </div>
            <div className="vault-alert-benefits">
              <div><Radio/><strong>Live rooms</strong><span>Be there for the open.</span></div>
              <div><MessageCircle/><strong>Replies</strong><span>Keep the conversation going.</span></div>
              <div><Bell/><strong>Key updates</strong><span>Stay connected to Vault.</span></div>
            </div>
            <div className="vault-alert-actions">
              <Button
                onClick={handleNotifications}
                disabled={notificationBusy}
                className="onboarding-primary-action"
              >
                {notificationBusy ? <><Loader2 className="h-5 w-5 animate-spin"/>Enabling alerts...</> : <>Enable notifications<ChevronRight size={18}/></>}
              </Button>
              <button
                onClick={next}
                disabled={notificationBusy}
                className="onboarding-secondary-action"
              >
                Skip for now
              </button>
            </div>
          </div>
        </OnboardingStep>

        {/* Step 7 — Activation */}
        <OnboardingStep active={step === 7}>
          <div className="onboarding-form-card flex flex-col items-center gap-7 py-8 relative">
            {activated ? (
              <VaultArrival name={displayName.trim() || "Trader"} avatarUrl={avatarUrl} onComplete={handleDismiss}/>
            ) : (
              <>
                <VaultProfileReview avatarUrl={avatarUrl} displayName={displayName.trim()} fullName={fullName.trim()}
                  experience={experience ? experience.charAt(0).toUpperCase() + experience.slice(1) : "Not selected"}
                  goal={GOAL_OPTIONS.find((g) => g.value === goal)?.label || "Not selected"}
                  onEditAvatar={() => setStep(2)} />

                <VaultSocialInvite />

                <Button
                  onClick={handleActivate}
                  disabled={submitting}
                  className="onboarding-primary-action relative overflow-hidden"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Finish setup"
                  )}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </Button>
              </>
            )}
          </div>
        </OnboardingStep>
        </div>
      </div>
    </main>
  );
}
