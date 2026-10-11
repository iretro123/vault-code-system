import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatInUserTime } from "@/lib/mentoringTime";

type Row = { id: string; status: string; booking_url: string | null; booked_start_at: string | null };

/**
 * Private mentoring booking entry. Renders nothing unless the server returns a purchase bound to this
 * account (binding requires a fresh email-link sign-in with the purchase email).
 */
export function MentoringBookingCard() {
  const { data } = useQuery({
    queryKey: ["my-vault-mentoring"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_vault_mentoring");
      if (error) return [] as Row[];
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
  });
  const rows = (data ?? []).filter(r => r.booking_url || r.booked_start_at);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Private 2-Hour Trading Mentoring</p>
      {rows.map(r => r.booked_start_at ? (
        <p key={r.id} className="text-xs text-muted-foreground">Booked for {formatInUserTime(r.booked_start_at)}. Check your Calendly confirmation for the Zoom link.</p>
      ) : (
        <div key={r.id} className="space-y-2">
          <p className="text-xs text-muted-foreground">Your session is paid. This link works for one booking.</p>
          <a href={r.booking_url!} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">Choose your session time</a>
        </div>
      ))}
    </div>
  );
}
