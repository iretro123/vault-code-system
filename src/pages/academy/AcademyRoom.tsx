import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useParams } from "react-router-dom";

const AcademyRoom = () => {
  const { roomSlug } = useParams();

  return (
    <AcademyLayout>
      <PageHeader
        title={`#${roomSlug || "general"}`}
        subtitle="Community discussion room"
      />
      <div className="px-4 md:px-6 pb-6">
        <Card className="p-8 flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="p-3 rounded-lg bg-muted mb-4">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Chat Rooms Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            Real-time discussion with fellow traders, organized by topic.
          </p>
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyRoom;
