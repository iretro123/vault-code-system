import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { ACADEMY_MODULES } from "@/lib/academyModules";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const AcademyLearn = () => {
  const navigate = useNavigate();

  return (
    <AcademyLayout>
      <PageHeader
        title="Module Map"
        subtitle="Your structured path to trading discipline"
      />
      <div className="px-4 md:px-6 pb-6">
        <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
          {ACADEMY_MODULES.map((mod, i) => (
            <Card
              key={mod.slug}
              className="group relative p-5 cursor-pointer transition-colors hover:border-primary/30"
              onClick={() => navigate(`/academy/learn/${mod.slug}`)}
            >
              {mod.badge && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {mod.badge}
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <mod.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {mod.subtitle}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    {mod.lessons.length} lessons
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1 group-hover:text-primary transition-colors" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyLearn;
