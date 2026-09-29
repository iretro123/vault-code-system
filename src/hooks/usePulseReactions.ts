import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ReactionRow { event_id: string; emoji: string; count: number; active: boolean }
const emojiOptions = ["🔥", "👀"];

export function usePulseReactions(eventIds: string[], enabled: boolean) {
  const { user } = useAuth();
  const client = useQueryClient();
  const ids = [...eventIds].sort().slice(0, 100);
  const query = useQuery({
    queryKey: ["pulse-reactions", user?.id, ids],
    enabled: enabled && !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("pulse_spy_reactions_read", { p_event_ids: ids });
      if (error) throw error;
      return data as ReactionRow[];
    },
    refetchInterval: enabled ? 30000 : false,
    staleTime: 5000,
  });
  const mutation = useMutation({
    mutationFn: async ({ eventId, emoji, active }: { eventId: string; emoji: string; active: boolean }) => {
      const { error } = await (supabase as any).rpc("pulse_spy_reaction_set", { p_event_id: eventId, p_emoji: emoji, p_active: active });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["pulse-reactions", user?.id] }),
    onError: () => toast.error("Your reaction didn’t save. Please try again."),
  });
  const forPost = (eventId: string) => emojiOptions.map(emoji => {
    const row = query.data?.find(item => item.event_id === eventId && item.emoji === emoji);
    return { emoji, count: Number(row?.count ?? 0), active: row?.active ?? false };
  });
  return {
    forPost,
    pending: query.isLoading || query.isError || mutation.isPending,
    react: (eventId: string, emoji: string) => {
      if (!user || !enabled || mutation.isPending || !emojiOptions.includes(emoji) || !ids.includes(eventId)) return;
      mutation.mutate({ eventId, emoji, active: !forPost(eventId).find(item => item.emoji === emoji)?.active });
    },
  };
}
