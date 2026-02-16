import { useState } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Navigate, useParams } from "react-router-dom";
import { getRoomBySlug } from "@/lib/academyRooms";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { RoomChat } from "@/components/academy/RoomChat";
import { SendNotificationModal } from "@/components/academy/SendNotificationModal";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

const AcademyRoom = () => {
  const { roomSlug } = useParams();
  const room = getRoomBySlug(roomSlug || "");
  const { isAdmin } = useAcademyRole();
  const [notifyOpen, setNotifyOpen] = useState(false);

  if (!room) {
    return <Navigate to="/academy/rooms" replace />;
  }

  const canPost = !room.readOnly || isAdmin;
  const isAnnouncements = room.slug === "announcements";

  return (
    <AcademyLayout>
      <PageHeader title={`#${room.name}`} subtitle={room.description} />
      <div className="px-4 md:px-6 pb-6">
        {isAdmin && isAnnouncements && (
          <div className="mb-4">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNotifyOpen(true)}>
              <Bell className="h-3.5 w-3.5" />
              Send Notification
            </Button>
            <SendNotificationModal
              open={notifyOpen}
              onClose={() => setNotifyOpen(false)}
              defaultType="announcement"
              defaultTitle=""
              defaultLinkPath="/academy/room/announcements"
            />
          </div>
        )}
        <RoomChat roomSlug={room.slug} canPost={canPost} isAnnouncements={isAnnouncements} />
      </div>
    </AcademyLayout>
  );
};

export default AcademyRoom;
