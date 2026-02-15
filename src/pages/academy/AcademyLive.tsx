import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AcademyLive = () => {
  const navigate = useNavigate();

  return (
    <AcademyLayout>
      <PageHeader
        title="Live Sessions"
        subtitle="Join scheduled live events and workshops"
      />
      <div className="px-4 md:px-6 pb-6">
        <Card className="vault-card p-10 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <Radio className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">No live sessions scheduled</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Workshops, Q&As, and live trading reviews will appear here once scheduled by the coaching team.
          </p>
          <Button variant="outline" onClick={() => navigate("/academy/rooms")} className="gap-2">
            <Bell className="h-3.5 w-3.5" />
            Browse Community Rooms
          </Button>
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyLive;
