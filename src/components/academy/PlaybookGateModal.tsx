import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { VaultPlaybookIcon } from "@/components/icons/VaultPlaybookIcon";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "setup" | "wins";
}

export function PlaybookGateModal({ open, onOpenChange, type }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSetup = type === "setup";
  const title = isSetup ? "Unlock Posting" : "Unlock Wins & Proof";
  const body = isSetup
    ? "Complete Playbook Chapters 1–2 (about 8 minutes). This keeps Trade Floor high-signal and protects your account."
    : "Log 1 trade + 1 journal entry to unlock Wins & Proof posting.";

  const snooze = async (days: number) => {
    if (!user) return;
    const key = isSetup ? "unlock_setups" : "unlock_wins";
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase.from("user_nudges_dismissed")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("nudge_key", key)
      .maybeSingle();

    if (existing) {
      await supabase.from("user_nudges_dismissed")
        .update({ dismissed_until: until } as any)
        .eq("user_id", user.id)
        .eq("nudge_key", key);
    } else {
      await supabase.from("user_nudges_dismissed")
        .insert({ user_id: user.id, nudge_key: key, dismissed_until: until } as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md vault-glass-card border-white/[0.08]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <VaultPlaybookIcon className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-white/50 leading-relaxed">{body}</p>

        <div className="space-y-2 pt-4">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate(isSetup ? "/academy/playbook" : "/academy/trade");
            }}
          >
            {isSetup ? "Continue Playbook" : "Log a Trade"}
            <VaultPlaybookIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="w-full text-white/30 hover:text-white/50"
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
          <Clock className="h-3 w-3 text-white/15" />
          <span className="text-[11px] text-white/20">Snooze:</span>
          <button
            onClick={() => snooze(1)}
            className="text-[11px] text-white/25 hover:text-white/40 transition-colors"
          >
            24h
          </button>
          <span className="text-white/10">·</span>
          <button
            onClick={() => snooze(3)}
            className="text-[11px] text-white/25 hover:text-white/40 transition-colors"
          >
            3 days
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
