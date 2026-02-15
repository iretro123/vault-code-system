import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { BookOpen, Target, Shield, TrendingUp } from "lucide-react";

const pillars = [
  {
    icon: Shield,
    title: "Discipline Foundations",
    description: "Build the mental framework for consistent execution.",
  },
  {
    icon: Target,
    title: "Risk Management",
    description: "Master position sizing, stop placement, and capital protection.",
  },
  {
    icon: TrendingUp,
    title: "Performance Psychology",
    description: "Control emotions, eliminate revenge trading, stay process-driven.",
  },
  {
    icon: BookOpen,
    title: "Rulebook Workshop",
    description: "Define, test, and refine your personal trading rulebook.",
  },
];

const AcademyHome = () => {
  return (
    <AcademyLayout>
      <PageHeader
        title="Vault Academy"
        subtitle="Master the discipline side of trading"
      />

      <div className="px-4 md:px-6 space-y-6 pb-6">
        <div>
          <p className="section-title">Core Pillars</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="p-4 hover:border-primary/30 transition-colors cursor-default"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-muted shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Modules launching soon. Your progress will sync with Vault OS.
        </p>
      </div>
    </AcademyLayout>
  );
};

export default AcademyHome;
