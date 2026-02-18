import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/formatTime";

interface AuditEvent {
  id: string;
  event_type: string;
  event_context: any;
  user_id: string;
  created_at: string;
}

export function AdminLogsTab() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("vault_events")
      .select("id, event_type, event_context, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setEvents((data as AuditEvent[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground">
        Recent system events and audit trail. Showing last 200 events.
      </p>
      {events.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-medium text-foreground bg-white/[0.05] px-1.5 py-0.5 rounded">
                    {e.event_type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(e.created_at)}
                  </span>
                </div>
                {e.event_context && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                    {typeof e.event_context === "string"
                      ? e.event_context
                      : JSON.stringify(e.event_context).slice(0, 120)}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                {e.user_id.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
