/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
import type { Json } from "@/integrations/supabase/types";

export interface VaultEvent {
  event_id: string;
  event_type: string;
  event_context: Json | null;
  created_at: string;
}

interface UseVaultTimelineReturn {
  events: VaultEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVaultTimeline(_limit: number = 50): UseVaultTimelineReturn {
  return { events: [], loading: false, error: null, refetch: () => {} };
}
