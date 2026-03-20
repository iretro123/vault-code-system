import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function SettingsPrivacy() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  // Delete journal & progress gate
  const [showDeleteGate, setShowDeleteGate] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDownload = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const [profileRes, prefsRes, ticketsRes, messagesRes, tradesRes, journalRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("coach_tickets").select("*, coach_ticket_replies(*)").eq("user_id", user.id),
        supabase.from("academy_messages").select("body, room_slug, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("trade_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("journal_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      const data = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        preferences: prefsRes.data,
        coach_threads: ticketsRes.data,
        chat_messages: messagesRes.data,
        trade_entries: tradesRes.data,
        journal_entries: journalRes.data,
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

  const handleDeleteJournalProgress = async () => {
    if (deleteInput !== "DELETE" || !user) return;
    setDeleting(true);
    try {
      // Delete trade entries, journal entries, and reset balance
      const [tradeRes, journalRes, profileRes] = await Promise.all([
        supabase.from("trade_entries").delete().eq("user_id", user.id),
        supabase.from("journal_entries").delete().eq("user_id", user.id),
        supabase.from("profiles").update({ account_balance: 0 }).eq("user_id", user.id),
      ]);

      if (tradeRes.error) throw tradeRes.error;
      if (journalRes.error) throw journalRes.error;
      if (profileRes.error) throw profileRes.error;

      // Clear local cache
      try { localStorage.removeItem("va_cache_trade_entries"); } catch {}

      setShowDeleteGate(false);
      setDeleteInput("");
      toast.success("Journal & trade data deleted. Balance reset to $0.");
    } catch (e) {
      console.error("Error deleting journal/progress:", e);
      toast.error("Failed to delete data. Try again.");
    } finally {
      setDeleting(false);
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

        {/* Delete Journal & Progress */}
        {!showDeleteGate ? (
          <Button
            variant="outline"
            className="w-full gap-2 justify-start text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
            onClick={() => setShowDeleteGate(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Journal & Progress
          </Button>
        ) : (
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">This action is permanent</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  This will permanently delete all your logged trades, journal entries, and reset your tracked balance to $0. This cannot be undone.
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-foreground mb-1.5">
                Type <span className="font-mono text-destructive font-semibold">DELETE</span> to confirm
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  className="max-w-[120px] h-8 text-sm font-mono"
                  placeholder="DELETE"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value.toUpperCase())}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleteInput !== "DELETE" || deleting}
                  onClick={handleDeleteJournalProgress}
                  className="h-8"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => { setShowDeleteGate(false); setDeleteInput(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full gap-2 justify-start text-muted-foreground" disabled>
          <Trash2 className="h-4 w-4" />
          Delete My Account
          <span className="ml-auto text-[10px] text-muted-foreground/50">Contact support</span>
        </Button>
      </div>
    </Card>
  );
}
