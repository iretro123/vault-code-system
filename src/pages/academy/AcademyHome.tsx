import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, Navigate } from "react-router-dom";
import { Rocket, BookOpen, MessageSquare, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  { label: "Claim Role", desc: "Set your experience level", path: "/academy/start", icon: Rocket },
  { label: "First Lesson", desc: "Watch a module lesson", path: "/academy/learn", icon: BookOpen },
  { label: "Introduce Yourself", desc: "Post in the community", path: "/academy/room/introductions", icon: MessageSquare },
];

const AcademyHome = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  if (loading) return null;

  const isFirstVisit =
    profile &&
    (profile as any).academy_experience === "newbie" &&
    !profile.onboarding_completed;

  if (isFirstVisit) {
    return <Navigate to="/academy/start" replace />;
  }

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Trader";

  return (
    <AcademyLayout>
      <PageHeader
        title={`Welcome back, ${displayName}`}
        subtitle="Your trading discipline journey continues"
      />
      <div className="px-4 md:px-6 pb-6 space-y-6">
        {/* Next steps */}
        <div>
          <p className="section-title">Quick Start</p>
          <div className="grid gap-2 sm:grid-cols-3 max-w-3xl">
            {steps.map(({ label, desc, path, icon: Icon }) => (
              <Card
                key={path}
                className="vault-card group cursor-pointer p-4 transition-colors hover:border-primary/30"
                onClick={() => navigate(path)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground">{label}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Main CTA */}
        <div className="max-w-lg">
          <p className="text-sm text-muted-foreground mb-4">
            Pick up where you left off or start a new module.
          </p>
          <Button onClick={() => navigate("/academy/learn")} className="gap-2">
            <BookOpen className="h-4 w-4" />
            Continue Learning
          </Button>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyHome;
