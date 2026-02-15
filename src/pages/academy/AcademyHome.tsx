import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate, Navigate } from "react-router-dom";
import { Rocket, BookOpen, MessageSquare, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  { label: "Claim Role", path: "/academy/start", icon: Rocket },
  { label: "Watch First Lesson", path: "/academy/learn", icon: BookOpen },
  { label: "Post Intro", path: "/academy/room/introductions", icon: MessageSquare },
];

const AcademyHome = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  // While auth is loading, show nothing to avoid flash
  if (loading) return null;

  // If profile has default experience and onboarding not completed, redirect to start
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
        subtitle="Master the discipline side of trading"
      />
      <div className="px-4 md:px-6 pb-6 space-y-6">
        {/* Progress strip */}
        <div className="flex flex-col sm:flex-row gap-2">
          {steps.map(({ label, path, icon: Icon }, i) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="group flex items-center gap-3 flex-1 rounded-lg border border-border bg-muted/5 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              <span className="text-sm font-medium text-foreground">{label}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50" />
            </button>
          ))}
        </div>

        <div className="max-w-lg">
          <p className="text-muted-foreground mb-6">
            Your structured path to becoming a disciplined, consistent trader starts here.
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
