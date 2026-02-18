import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { toast } from "sonner";

interface PinnedMessage {
  room_slug: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
}

export function useChatModeration(roomSlug: string) {
  const { user } = useAuth();
  const { hasPermission } = useAcademyPermissions();
  const canModerate = hasPermission("moderate_chat");

  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [muteExpiresAt, setMuteExpiresAt] = useState<string | null>(null);

  // Fetch room lock, pinned message, and user mute status
  useEffect(() => {
    if (!roomSlug) return;

    const fetchState = async () => {
      // Parallel fetches
      const [lockRes, pinRes, muteRes] = await Promise.all([
        supabase.from("room_locks").select("room_slug").eq("room_slug", roomSlug).maybeSingle(),
        supabase.from("pinned_messages").select("message_id").eq("room_slug", roomSlug).maybeSingle(),
        user?.id
          ? supabase
              .from("chat_mutes")
              .select("muted_until")
              .eq("user_id", user.id)
              .or(`room_slug.eq.${roomSlug},room_slug.is.null`)
              .gt("muted_until", new Date().toISOString())
              .order("muted_until", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setIsRoomLocked(!!lockRes.data);
      setPinnedMessageId(pinRes.data?.message_id ?? null);

      if (muteRes.data) {
        setIsMuted(true);
        setMuteExpiresAt(muteRes.data.muted_until);
      } else {
        setIsMuted(false);
        setMuteExpiresAt(null);
      }
    };

    fetchState();
  }, [roomSlug, user?.id]);

  // Audit log helper
  const logAction = useCallback(
    async (action: string, targetUserId: string, metadata?: Record<string, any>) => {
      if (!user?.id) return;
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        target_user_id: targetUserId,
        action,
        metadata: metadata ?? {},
      } as any);
    },
    [user?.id]
  );

  // Timeout user (24h mute)
  const timeoutUser = useCallback(
    async (targetUserId: string, targetUserName: string) => {
      if (!user?.id || !canModerate) return;
      const mutedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("chat_mutes").insert({
        user_id: targetUserId,
        muted_by: user.id,
        muted_until: mutedUntil,
        room_slug: roomSlug,
        reason: "24h timeout by moderator",
      } as any);

      if (error) {
        toast.error("Failed to timeout user");
        return;
      }

      await logAction("chat_timeout", targetUserId, {
        room_slug: roomSlug,
        duration: "24h",
        target_name: targetUserName,
      });
      toast.success(`${targetUserName} timed out for 24 hours`);
    },
    [user?.id, canModerate, roomSlug, logAction]
  );

  // Lock room
  const lockRoom = useCallback(async () => {
    if (!user?.id || !canModerate) return;
    const { error } = await supabase.from("room_locks").insert({
      room_slug: roomSlug,
      locked_by: user.id,
    } as any);

    if (error) {
      toast.error("Failed to lock room");
      return;
    }

    setIsRoomLocked(true);
    await logAction("room_lock", user.id, { room_slug: roomSlug });
    toast.success("Room locked");
  }, [user?.id, canModerate, roomSlug, logAction]);

  // Unlock room
  const unlockRoom = useCallback(async () => {
    if (!user?.id || !canModerate) return;
    const { error } = await supabase.from("room_locks").delete().eq("room_slug", roomSlug);

    if (error) {
      toast.error("Failed to unlock room");
      return;
    }

    setIsRoomLocked(false);
    await logAction("room_unlock", user.id, { room_slug: roomSlug });
    toast.success("Room unlocked");
  }, [user?.id, canModerate, roomSlug, logAction]);

  // Pin message
  const pinMessage = useCallback(
    async (messageId: string) => {
      if (!user?.id || !canModerate) return;

      // Upsert: delete existing pin first, then insert
      await supabase.from("pinned_messages").delete().eq("room_slug", roomSlug);
      const { error } = await supabase.from("pinned_messages").insert({
        room_slug: roomSlug,
        message_id: messageId,
        pinned_by: user.id,
      } as any);

      if (error) {
        toast.error("Failed to pin message");
        return;
      }

      setPinnedMessageId(messageId);
      await logAction("message_pin", user.id, { room_slug: roomSlug, message_id: messageId });
      toast.success("Message pinned");
    },
    [user?.id, canModerate, roomSlug, logAction]
  );

  // Unpin message
  const unpinMessage = useCallback(async () => {
    if (!user?.id || !canModerate) return;
    await supabase.from("pinned_messages").delete().eq("room_slug", roomSlug);
    setPinnedMessageId(null);
    await logAction("message_unpin", user.id, { room_slug: roomSlug });
    toast.success("Message unpinned");
  }, [user?.id, canModerate, roomSlug, logAction]);

  // Mod delete (with audit log)
  const moderatorDelete = useCallback(
    async (
      messageId: string,
      messageUserId: string,
      deleteMessageFn: (id: string) => Promise<{ error: string | null }>
    ) => {
      const result = await deleteMessageFn(messageId);
      if (!result.error) {
        await logAction("message_delete", messageUserId, {
          room_slug: roomSlug,
          message_id: messageId,
        });
      }
      return result;
    },
    [roomSlug, logAction]
  );

  return {
    canModerate,
    isRoomLocked,
    isMuted,
    muteExpiresAt,
    pinnedMessageId,
    timeoutUser,
    lockRoom,
    unlockRoom,
    pinMessage,
    unpinMessage,
    moderatorDelete,
  };
}
