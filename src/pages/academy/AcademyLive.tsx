import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Radio } from "lucide-react";

const AcademyLive = () => (
  <AcademyLayout>
    <PageHeader
      title="Live Sessions"
      subtitle="Join scheduled live events and workshops"
    />
    <div className="px-4 md:px-6 pb-6">
      <Card className="p-8 flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="p-3 rounded-lg bg-muted mb-4">
          <Radio className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Live Events Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Scheduled workshops, Q&As, and live trading reviews.
        </p>
      </Card>
    </div>
  </AcademyLayout>
);

export default AcademyLive;
