import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { getModuleBySlug } from "@/lib/academyModules";
import { ArrowLeft, PlayCircle, CheckCircle } from "lucide-react";

const AcademyModule = () => {
  const { moduleSlug } = useParams();
  const navigate = useNavigate();
  const mod = getModuleBySlug(moduleSlug || "");

  if (!mod) {
    return <Navigate to="/academy/learn" replace />;
  }

  return (
    <AcademyLayout>
      <div className="px-4 md:px-6 pt-4">
        <button
          onClick={() => navigate("/academy/learn")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Modules
        </button>
      </div>

      <PageHeader title={mod.title} subtitle={mod.subtitle} />

      <div className="px-4 md:px-6 pb-6">
        <div className="max-w-2xl space-y-2">
          {mod.lessons.map((lesson, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <span className="text-xs font-mono font-semibold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground">{lesson.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{lesson.duration}</p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0">
                  <PlayCircle className="h-3.5 w-3.5" />
                  Start
                </Button>
              </div>
            </Card>
          ))}

          <div className="pt-4">
            <Button variant="outline" disabled className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Complete Module
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">
              Progress tracking coming soon
            </p>
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyModule;
