import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyCheckInModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [followedRules, setFollowedRules] = useState<boolean | null>(null);
  const [trades, setTrades] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = followedRules !== null && trades !== null && !submitting;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);

    const todayDate = new Date().toISOString().slice(0, 10);

    await supabase.from("vault_daily_checklist").insert({
      user_id: user.id,
      date: todayDate,
      plan_reviewed: true,
      risk_confirmed: true,
      sleep_quality: 5,
      mental_state: 5,
      emotional_control: 5,
      completed: true,
    });

    // If they traded, also log a minimal journal entry
    if (trades !== "0" && note.trim()) {
      await supabase.from("journal_entries").insert({
        user_id: user.id,
        entry_date: todayDate,
        what_happened: note.trim(),
        followed_rules: followedRules ?? true,
        biggest_mistake: followedRules ? "none" : "Rule break noted",
        lesson: "",
      });
    }

    setSubmitting(false);
    setDone(true);
    toast({ title: "Check-in logged", description: "Your daily check-in has been recorded." });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setFollowedRules(null);
      setTrades(null);
      setNote("");
      setNoteOpen(false);
      setDone(false);
    }, 200);
  };

  const handleReviewTrade = () => {
    handleClose();
    navigate("/academy/trade");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[420px] border-white/[0.10] gap-0"
        style={{
          background: "linear-gradient(180deg, hsl(220,20%,8%) 0%, hsl(220,20%,6%) 100%)",
        }}
      >
        {done ? (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-lg font-semibold text-[rgba(255,255,255,0.92)]">
              Check-in complete
            </p>
            {followedRules === false && (
              <div className="space-y-2 mt-2">
                <p className="text-sm text-[rgba(255,255,255,0.55)]">
                  Consider reviewing your last trade.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-semibold"
                  onClick={handleReviewTrade}
                >
                  Go to Trade
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground mt-2"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="pb-5">
              <DialogTitle className="text-lg font-bold text-[rgba(255,255,255,0.94)]">
                Daily Check-In
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Q1: Followed rules */}
              <div className="space-y-2.5">
                <p className="text-sm font-medium text-[rgba(255,255,255,0.70)]">
                  Followed your rules today?
                </p>
                <div className="flex gap-2">
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => setFollowedRules(val)}
                      className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-100"
                      style={{
                        background: followedRules === val
                          ? "hsl(217,91%,60%)"
                          : "rgba(255,255,255,0.06)",
                        color: followedRules === val ? "#fff" : "rgba(255,255,255,0.75)",
                        border: followedRules === val
                          ? "1px solid hsl(217,91%,60%)"
                          : "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      {val ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2: Trades */}
              <div className="space-y-2.5">
                <p className="text-sm font-medium text-[rgba(255,255,255,0.70)]">
                  Trades today?
                </p>
                <div className="flex gap-2">
                  {["0", "1", "2+"].map((val) => (
                    <button
                      key={val}
                      onClick={() => setTrades(val)}
                      className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-100"
                      style={{
                        background: trades === val
                          ? "hsl(217,91%,60%)"
                          : "rgba(255,255,255,0.06)",
                        color: trades === val ? "#fff" : "rgba(255,255,255,0.75)",
                        border: trades === val
                          ? "1px solid hsl(217,91%,60%)"
                          : "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional note */}
              {!noteOpen ? (
                <button
                  onClick={() => setNoteOpen(true)}
                  className="text-xs font-medium text-primary/70 hover:text-primary transition-colors"
                >
                  + Add a note (optional)
                </button>
              ) : (
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Quick note..."
                  className="h-10 rounded-xl bg-white/[0.04] border-white/[0.10] text-sm placeholder:text-white/30"
                  maxLength={140}
                />
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full rounded-xl font-semibold h-12"
              >
                {submitting ? "Saving..." : "Submit"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
