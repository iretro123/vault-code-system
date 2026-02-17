import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export function SettingsPrivacy() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const [profileRes, prefsRes, ticketsRes, messagesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("coach_tickets").select("*, coach_ticket_replies(*)").eq("user_id", user.id),
        supabase.from("academy_messages").select("body, room_slug, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      ]);

      const data = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        preferences: prefsRes.data,
        coach_threads: ticketsRes.data,
        chat_messages: messagesRes.data,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully.");
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="vault-card p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Privacy & Data</h3>
        <p className="text-xs text-muted-foreground">Control what's stored and export your information.</p>
      </div>

      <div className="space-y-3">
        <Button variant="outline" onClick={handleDownload} disabled={downloading} className="w-full gap-2 justify-start">
          <Download className="h-4 w-4" />
          {downloading ? "Exporting…" : "Download My Data"}
        </Button>

        <Button variant="outline" className="w-full gap-2 justify-start text-muted-foreground" disabled>
          <Trash2 className="h-4 w-4" />
          Delete My Account
          <span className="ml-auto text-[10px] text-muted-foreground/50">Contact support</span>
        </Button>
      </div>
    </Card>
  );
}
