import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { MessageSquare, Lock } from "lucide-react";
import { useParams, Navigate } from "react-router-dom";
import { getRoomBySlug } from "@/lib/academyRooms";
import { useAcademyRole } from "@/hooks/useAcademyRole";

const AcademyRoom = () => {
  const { roomSlug } = useParams();
  const room = getRoomBySlug(roomSlug || "");
  const { isAdmin } = useAcademyRole();

  if (!room) {
    return <Navigate to="/academy/rooms" replace />;
  }

  const canPost = !room.readOnly || isAdmin;

  return (
    <AcademyLayout>
      <PageHeader
        title={`#${room.name}`}
        subtitle={room.description}
      />
      <div className="px-4 md:px-6 pb-6">
        <Card className="p-8 flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="p-3 rounded-lg bg-muted mb-4">
            <room.icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Messages Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Real-time discussion will be available here.
          </p>
          {!canPost && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              This room is read-only for students
            </span>
          )}
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyRoom;
