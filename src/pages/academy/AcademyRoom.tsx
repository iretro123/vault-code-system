import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { Navigate, useParams } from "react-router-dom";
import { getRoomBySlug } from "@/lib/academyRooms";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { RoomChat } from "@/components/academy/RoomChat";
import { AnnouncementsFeed } from "@/components/academy/AnnouncementsFeed";
import { SendNotificationModal } from "@/components/academy/SendNotificationModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Megaphone, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AcademyRoom = () => {
  const { roomSlug } = useParams();
  const room = getRoomBySlug(roomSlug || "");
  const { isAdmin } = useAcademyRole();
  const { user } = useAuth();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [announcementsTab, setAnnouncementsTab] = useState("announcements");

  // Persist last visited room per user
  useEffect(() => {
    if (room && user) {
      localStorage.setItem(`academy_last_room_${user.id}`, `/academy/room/${room.slug}`);
    }
  }, [room, user]);

  if (!room) {
    return <Navigate to="/academy/rooms" replace />;
  }

  const canPost = !room.readOnly || isAdmin;
  const isAnnouncements = room.slug === "announcements";

  return (
    <AcademyLayout>
      <PageHeader title={`#${room.name}`} subtitle={room.description} />
      <div className="px-4 md:px-6 pb-6">
        {isAnnouncements ? (
          <>
            {isAdmin && (
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
            <Tabs value={announcementsTab} onValueChange={setAnnouncementsTab} className="space-y-4">
              <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto">
                <TabsTrigger value="announcements" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
                  <Megaphone className="h-3.5 w-3.5" />
                  Announcements
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Discussion
                </TabsTrigger>
              </TabsList>
              <TabsContent value="announcements">
                <AnnouncementsFeed />
              </TabsContent>
              <TabsContent value="chat">
                <RoomChat roomSlug={room.slug} canPost={canPost} isAnnouncements={isAnnouncements} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <RoomChat roomSlug={room.slug} canPost={canPost} isAnnouncements={false} />
        )}
      </div>
    </AcademyLayout>
  );
};

export default AcademyRoom;
