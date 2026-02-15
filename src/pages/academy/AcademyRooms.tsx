import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { ACADEMY_ROOMS } from "@/lib/academyRooms";
import { useNavigate } from "react-router-dom";
import { Lock, ChevronRight } from "lucide-react";

const AcademyRooms = () => {
  const navigate = useNavigate();

  return (
    <AcademyLayout>
      <PageHeader
        title="Rooms"
        subtitle="Curated discussion spaces for the community"
      />
      <div className="px-4 md:px-6 pb-6">
        <div className="space-y-2 max-w-2xl">
          {ACADEMY_ROOMS.map(({ slug, name, description, icon: Icon, readOnly }) => (
            <Card
              key={slug}
              className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(`/academy/room/${slug}`)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground text-sm">#{name}</h4>
                    {readOnly && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" />
                        Read-only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyRooms;
