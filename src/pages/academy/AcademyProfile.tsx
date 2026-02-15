import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const AcademyProfile = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Trader";
  const experience = (profile as any)?.academy_experience ?? "newbie";

  const expLabel: Record<string, string> = {
    newbie: "Newbie",
    active: "Active Trader",
    veteran: "Veteran",
  };

  return (
    <AcademyLayout>
      <PageHeader
        title="Profile"
        subtitle="Your Academy identity and progress"
      />
      <div className="px-4 md:px-6 pb-6 space-y-4 max-w-md">
        {/* Identity card */}
        <Card className="vault-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate">{displayName}</h3>
              <p className="text-xs text-muted-foreground">{expLabel[experience] || experience}</p>
            </div>
          </div>
        </Card>

        {/* Progress placeholder */}
        <Card className="vault-card p-10 flex flex-col items-center text-center">
          <h3 className="text-base font-semibold text-foreground mb-2">Progress tracking coming soon</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Your completed modules, badges, and learning milestones will show up here.
          </p>
          <Button variant="outline" onClick={() => navigate("/settings")} className="gap-2">
            <Settings className="h-3.5 w-3.5" />
            Edit Profile in Settings
          </Button>
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyProfile;
