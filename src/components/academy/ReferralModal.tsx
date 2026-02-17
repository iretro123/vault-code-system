import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { toast } from "sonner";

interface ReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const { user } = useAuth();
  const { referralStats } = useAcademyData();
  const refLink = `${window.location.origin}/auth?ref=${user?.id || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    toast.success("Referral link copied!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[hsl(220,20%,8%)]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Gift className="h-5 w-5 text-primary" />
            Refer a Trader
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Share VaultAcademy with a fellow trader.
          </p>

          <div className="rounded-lg bg-black/30 border border-white/[0.06] px-3 py-2.5">
            <p className="text-xs text-muted-foreground/70 mb-1">Your referral link</p>
            <p className="text-sm text-foreground font-mono truncate select-all">{refLink}</p>
          </div>

          <Button onClick={handleCopy} className="w-full gap-2">
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>

          <div className="flex items-center justify-between text-sm border-t border-white/[0.06] pt-3">
            <div className="text-muted-foreground">Referrals</div>
            <div className="font-medium text-foreground">{referralStats.total_signed_up}</div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Streak</div>
            <div className="font-medium text-foreground">{referralStats.current_streak_weeks} weeks</div>
          </div>

          <p className="text-xs text-muted-foreground/50 text-center pt-1">
            You'll earn rewards when they join. Rewards unlock at 3 / 7 / 15 referrals.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
