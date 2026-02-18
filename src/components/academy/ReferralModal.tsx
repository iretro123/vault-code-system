import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Link, Send, UserPlus, Star, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface ReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { icon: Send, text: "Share your invite link" },
  { icon: UserPlus, text: "They sign up and get a bonus" },
  { icon: Star, text: "You get rewards when they upgrade" },
];

function ReferralBody({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { referralStats } = useAcademyData();
  const refLink = `${window.location.origin}/auth?ref=${user?.id || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    toast.success("Referral link copied!");
  };

  return (
    <div className="relative">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-0 right-0 z-10 flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/[0.06] transition-colors"
      >
        <X className="h-4 w-4 text-white/60" />
      </button>

      {/* Hero */}
      <div className="flex items-start justify-between gap-6 pb-6 border-b border-white/[0.06]">
        <div className="min-w-0 space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-[12px] font-medium text-white/70">
            <Gift className="h-3 w-3" />
            Earn rewards
          </span>
          <h2 className="text-[22px] sm:text-[26px] font-semibold text-white/90 leading-tight tracking-tight">
            Invite traders.<br />Get rewards.
          </h2>
          <p className="text-[14px] text-white/[0.55] leading-relaxed max-w-[340px]">
            Share Vault OS and earn credits when they join.
          </p>
        </div>
        <div className="hidden sm:flex shrink-0 items-center justify-center h-20 w-20 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <Gift className="h-9 w-9 text-white/[0.18]" strokeWidth={1.5} />
        </div>
      </div>

      {/* How it works */}
      <div className="pt-5 pb-5 space-y-3.5">
        <h3 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">How it works</h3>
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0">
                <step.icon className="h-4 w-4 text-white/[0.75]" strokeWidth={1.8} />
              </div>
              <p className="text-[14px] text-white/[0.80] leading-snug">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="py-3 border-t border-white/[0.06]">
        <p className="text-[13px] text-white/[0.40]">
          {referralStats.total_signed_up} invited · {referralStats.total_paid} upgraded
        </p>
      </div>

      {/* Copy link */}
      <div className="pt-3 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-2.5 min-w-0">
            <Link className="h-4 w-4 text-white/[0.35] shrink-0" strokeWidth={1.8} />
            <p className="text-[13px] text-white/[0.70] font-mono truncate select-all">{refLink}</p>
          </div>
          <Button
            onClick={handleCopy}
            className="shrink-0 gap-1.5 h-10 px-5 rounded-xl bg-white text-black font-semibold text-[13px] hover:bg-white/90 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-white/[0.06]">
        <button className="text-[12px] text-white/[0.35] hover:text-white/[0.55] transition-colors">
          View Terms
        </button>
      </div>
    </div>
  );
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-[hsl(220,18%,8%)] border-t border-white/[0.08] px-5 pb-6 pt-4">
          <ReferralBody onClose={() => onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-6 bg-[hsl(220,18%,8%)]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-3xl overflow-hidden [&>button:last-child]:hidden">
        <ReferralBody onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
