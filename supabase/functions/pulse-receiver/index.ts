import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";
import { createPulseReceiver } from "../_shared/pulse/receiver.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error("Pulse database operation failed");
  return data;
}

Deno.serve(createPulseReceiver({
  authorized: hash => rpc("pulse_authorize_delivery", { p_hash: hash }),
  read: timeframe => rpc("pulse_processing_state", { p_timeframe: timeframe }),
  commit: (revision, snapshot, posts) => rpc("pulse_commit_snapshot", { p_revision: revision, p_snapshot: snapshot, p_posts: posts }),
}));
