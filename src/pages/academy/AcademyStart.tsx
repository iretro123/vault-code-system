import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EXPERIENCE_OPTIONS = [
  { value: "newbie", label: "Newbie", desc: "Just getting started with trading" },
  { value: "active", label: "Active Trader", desc: "Trading regularly, building consistency" },
  { value: "veteran", label: "Veteran", desc: "Years of experience, refining discipline" },
] as const;

const AcademyStart = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>(
    (profile as any)?.academy_experience ?? "newbie"
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ academy_experience: selected, role_level: selected } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Profile updated!");
    navigate("/academy/home");
  };

  return (
    <AcademyLayout>
      <PageHeader
        title="Start Here"
        subtitle="Claim your role and set your experience level"
      />
      <div className="px-4 md:px-6 pb-6">
        <Card className="p-6 max-w-lg space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Set Up Your Profile</h3>
              <p className="text-sm text-muted-foreground">
                Tell us about your experience level so we can tailor your learning path.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={cn(
                  "w-full text-left rounded-lg border px-4 py-3 transition-colors",
                  selected === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save & Continue
          </Button>
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyStart;
