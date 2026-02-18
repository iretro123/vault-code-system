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

const STEPS = [
  { num: "1", text: "Share your unique referral link with a fellow trader" },
  { num: "2", text: "They sign up and start using VaultAcademy" },
  { num: "3", text: "You both unlock rewards at 3 / 7 / 15 referrals" },
];

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
      <DialogContent className="sm:max-w-[420px] p-0 bg-[hsl(220,18%,7%)]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2.5 text-foreground text-lg">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            Refer a Trader
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4 space-y-5">
          {/* Steps */}
          <div className="space-y-3">
            {STEPS.map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-muted-foreground shrink-0 mt-px">
                  {step.num}
                </span>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>

          {/* Copy link */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground/70 font-medium">Your referral link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 min-w-0">
                <p className="text-[13px] text-foreground font-mono truncate select-all">{refLink}</p>
              </div>
              <Button onClick={handleCopy} size="sm" className="shrink-0 gap-1.5 h-9">
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <div className="flex-1 text-center">
              <p className="text-lg font-semibold text-foreground">{referralStats.total_signed_up}</p>
              <p className="text-[11px] text-muted-foreground/70">signed up</p>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="flex-1 text-center">
              <p className="text-lg font-semibold text-foreground">{referralStats.total_paid}</p>
              <p className="text-[11px] text-muted-foreground/70">converted</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
