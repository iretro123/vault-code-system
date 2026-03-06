import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Library, BarChart3, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LEVELS = [
  { value: "beginner", label: "Beginner", desc: "New to trading or just getting structured" },
  { value: "intermediate", label: "Intermediate", desc: "Trading regularly, building consistency" },
  { value: "advanced", label: "Advanced", desc: "Experienced trader refining discipline" },
] as const;

const NEXT_STEPS: Record<string, { label: string; desc: string; path: string; icon: typeof BookOpen }> = {
  beginner: {
    label: "Start Module 1: Discipline Foundations",
    desc: "Build the mental framework for consistent execution",
    path: "/academy/learn/discipline-foundations",
    icon: BookOpen,
  },
  intermediate: {
    label: "Browse the Module Library",
    desc: "Pick a module that matches where you are",
    path: "/academy/learn",
    icon: Library,
  },
  advanced: {
    label: "Post Your First Trade",
    desc: "Share a trade using the simple posting template",
    path: "/academy/room/trade-recaps",
    icon: BarChart3,
  },
};

const AcademyStart = () => {
  const { user, profile } = useAuth();
  const { onboarding, refetchOnboarding } = useAcademyData();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // If profile is completed, redirect — edits go through Settings
  const profileCompleted = profile && (profile as any).profile_completed;
  if (profileCompleted && onboarding?.claimed_role) {
    return <Navigate to="/academy/home" replace />;
  }

  const handleSave = async () => {
    if (!user || !selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ academy_experience: selected, role_level: selected, profile_completed: true } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    // Also mark claimed_role in onboarding_state
    await supabase
      .from("onboarding_state")
      .upsert({ user_id: user.id, claimed_role: true } as any, { onConflict: "user_id" });
    refetchOnboarding();
    toast.success("Role claimed!");
    setSaved(true);
  };

  const nextStep = selected ? NEXT_STEPS[selected] : null;

  return (
    <>
      <PageHeader
        title="Start Here"
        subtitle="Pick your level and get a tailored starting point"
      />
      <div className="px-4 md:px-6 pb-6">
        <Card className="p-6 max-w-lg space-y-5">
          {/* Level selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Pick your level</p>
            {LEVELS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { if (!saved) setSelected(opt.value); }}
                disabled={saved}
                className={cn(
                  "w-full text-left rounded-lg border px-4 py-3 transition-colors",
                  selected === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30",
                  saved && selected !== opt.value && "opacity-40"
                )}
              >
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Save button — only before saved */}
          {!saved && (
            <Button onClick={handleSave} disabled={!selected || saving} className="gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Claim Role
            </Button>
          )}

          {/* Recommended next step — only after saved */}
          {saved && nextStep && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recommended next step
              </p>
              <Card
                className="vault-card group cursor-pointer p-4 transition-colors hover:border-primary/30"
                onClick={() => navigate(nextStep.path)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <nextStep.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground">{nextStep.label}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{nextStep.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </div>
              </Card>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => navigate("/academy/home")}
              >
                ← Back to Home
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyStart;
