import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Navigate, useParams } from "react-router-dom";
import { getRoomBySlug } from "@/lib/academyRooms";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { RoomChat } from "@/components/academy/RoomChat";

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
      <PageHeader title={`#${room.name}`} subtitle={room.description} />
      <div className="px-4 md:px-6 pb-6">
        <RoomChat roomSlug={room.slug} canPost={canPost} />
      </div>
    </AcademyLayout>
  );
};

export default AcademyRoom;
