import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sprout, Flame, Crown, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useChatProfiles } from "@/hooks/useChatProfiles";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ROLES = [
  {
    key: "beginner",
    label: "Beginner",
    icon: Sprout,
    color: "emerald",
    description: "Just getting started with trading",
    focus: "Learn the fundamentals, build your first habits",
    ring: "ring-emerald-400/50 shadow-[0_0_24px_rgba(52,211,153,0.25)]",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    selectedBg: "bg-emerald-500/[0.15] border-emerald-400/40",
  },
  {
    key: "intermediate",
    label: "Intermediate",
    icon: Flame,
    color: "blue",
    description: "Some experience, refining strategy",
    focus: "Sharpen your edge, track consistency",
    ring: "ring-blue-400/50 shadow-[0_0_24px_rgba(96,165,250,0.25)]",
    bg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    selectedBg: "bg-blue-500/[0.15] border-blue-400/40",
  },
  {
    key: "advanced",
    label: "Advanced",
    icon: Crown,
    color: "purple",
    description: "Experienced trader seeking mastery",
    focus: "Advanced frameworks, scaling & mentorship",
    ring: "ring-purple-400/50 shadow-[0_0_24px_rgba(168,85,247,0.25)]",
    bg: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-400",
    selectedBg: "bg-purple-500/[0.15] border-purple-400/40",
  },
] as const;

export function ClaimRoleModal({ open, onOpenChange }: Props) {
  const { user, refetchProfile } = useAuth();
  const { refetchOnboarding } = useAcademyData();
  const { invalidateProfile } = useChatProfiles();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!selected || !user) return;
    setSaving(true);

    const [profileRes, onboardRes] = await Promise.all([
      supabase.from("profiles").update({ role_level: selected, academy_experience: selected }).eq("user_id", user.id),
      supabase.from("onboarding_state").upsert(
        { user_id: user.id, claimed_role: true, role_level: selected },
        { onConflict: "user_id" }
      ),
    ]);

    if (profileRes.error || onboardRes.error) {
      toast.error("Failed to save role. Try again.");
      setSaving(false);
      return;
    }

    setSuccess(true);
    // Refresh auth profile state + invalidate chat cache
    await refetchProfile();
    invalidateProfile(user.id);
    await refetchOnboarding();

    setTimeout(() => {
      onOpenChange(false);
      // Reset after close animation
      setTimeout(() => { setSuccess(false); setSelected(null); }, 300);
    }, 1500);
  };

  const selectedRole = ROLES.find((r) => r.key === selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 border-white/10 bg-[hsl(var(--card))] overflow-hidden">
        {success ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-foreground">Role Claimed!</p>
            <p className="text-sm text-muted-foreground mt-1">
              You're locked in as <span className="font-semibold text-foreground">{selectedRole?.label}</span>
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 pt-6 pb-2">
              <DialogTitle className="text-lg font-bold text-foreground text-center">
                Claim Your Role
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Where are you in your trading journey?
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selected === role.key;
                return (
                  <button
                    key={role.key}
                    onClick={() => setSelected(role.key)}
                    className={`w-full flex items-start gap-4 rounded-xl border px-4 py-4 text-left transition-all duration-150
                      ${isSelected ? `${role.selectedBg} ring-2 ${role.ring} scale-[1.02]` : `${role.bg} hover:scale-[1.01] hover:border-white/20`}
                    `}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? role.iconColor : "text-muted-foreground"}`}
                      style={{ background: isSelected ? undefined : "rgba(255,255,255,0.05)" }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                        {role.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                      <p className={`text-[11px] mt-1.5 ${isSelected ? role.iconColor : "text-muted-foreground/60"}`}>
                        Focus: {role.focus}
                      </p>
                    </div>
                    {isSelected && (
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${role.iconColor}`}
                        style={{ background: "rgba(255,255,255,0.1)" }}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-5 pb-5 pt-1">
              <button
                onClick={handleSave}
                disabled={!selected || saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-100"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Locking in…" : "Lock In"}
              </button>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2.5">
                Your role evolves automatically as you progress
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
