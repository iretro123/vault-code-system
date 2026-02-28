import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import handGiftImg from "@/assets/hand-gift.png";
import vaultVLogo from "@/assets/vault-v-logo.png";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Link, Send, UserPlus, Star, X, ArrowLeft } from "lucide-react";
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
  { icon: UserPlus, text: "They sign up and join Vault" },
  { icon: Star, text: "We track every referral you bring in" },
];

function HeroBanner() {
  return (
    <div className="relative w-full h-[140px] sm:h-[140px] overflow-hidden rounded-t-[22px]"
      style={{ background: "linear-gradient(135deg, #0B1220 0%, #1D4ED8 55%, #38BDF8 100%)" }}
    >
      {/* Dot grid texture */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      {/* Hand + Gift illustration — LEFT */}
      <div className="absolute left-3 bottom-0 h-[140px] flex items-end">
        <img
          src={handGiftImg}
          alt=""
          className="h-[120px] w-auto object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.25)]"
          style={{ mixBlendMode: "screen" }}
        />
      </div>
      {/* Vault "V" logo — FAR RIGHT */}
      <img
        src={vaultVLogo}
        alt=""
        className="absolute right-4 top-1/2 -translate-y-1/2 h-[90px] w-auto opacity-[0.12] blur-[1px] pointer-events-none select-none"
      />
    </div>
  );
}

const GUIDELINES_TEXT = [
  "This referral program tracks signups made through your unique invite link. The goal is to grow the Vault trading community with serious traders.",
  "Referral tracking is live — we record every signup that comes through your link. Reward and credit features will be added in a future update.",
  "We do not track referrals from disposable, temporary, or high-risk email accounts. All referrals may be reviewed to ensure legitimate participation.",
  "Each new user generates one (1) tracked referral. Self-referrals, multiple accounts, or attempts to manipulate the system will result in disqualification.",
  "Please do not spam, mass-message, or misuse your referral link. Referrals must be genuine traders who voluntarily join Vault OS.",
  "If suspicious or non-compliant activity is detected, we reserve the right to suspend referral privileges or deactivate your referral link.",
  "Vault OS may update, modify, pause, or discontinue this referral program at any time.",
  "For complete platform rules and policies, please refer to the Vault OS Terms of Service.",
];

function GuidelinesCard({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-6 py-5">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-white/[0.55] hover:text-white/[0.80] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            onClick={onBack}
            className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-3.5 w-3.5 text-white/[0.55]" />
          </button>
        </div>
        <h3 className="text-[16px] font-semibold text-white/[0.90] mb-4">General Referral Guidelines</h3>
        <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
          {GUIDELINES_TEXT.map((p, i) => (
            <p key={i} className="text-[13px] text-white/[0.55] leading-[1.55]">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReferralBody({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { referralStats } = useAcademyData();
  const [showGuidelines, setShowGuidelines] = useState(false);
  const refLink = `${window.location.origin}/auth?ref=${user?.id || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    toast.success("Referral link copied!");
  };

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Banner */}
      <div className="relative">
        <HeroBanner />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors"
        >
          <X className="h-4 w-4 text-white/80" />
        </button>
      </div>

      {showGuidelines ? (
        <GuidelinesCard onBack={() => setShowGuidelines(false)} />
      ) : (
        <div className="px-6 py-6 space-y-4">
          {/* Pill + headline */}
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-[12px] font-medium text-white/70">
              <Gift className="h-3 w-3" />
              Affiliate Program
            </span>
            <h2 className="text-[24px] font-semibold text-white/90 leading-[1.12] max-w-[420px]">
              Invite traders. Earn rewards.
            </h2>
            <p className="text-[14px] text-white/[0.55] leading-[1.4] max-w-[420px]">
              Share Vault OS with other traders and earn credits when they join and upgrade.
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">How it works</h3>
            <div className="space-y-2.5">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0">
                    <step.icon className="h-4 w-4 text-white/[0.75]" strokeWidth={1.8} />
                  </div>
                  <p className="text-[14px] text-white/[0.80] leading-[1.4]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="pt-3">
            <p className="text-[15px] font-semibold text-white/[0.85]">
              {referralStats.total_signed_up} invited · {referralStats.total_paid} upgraded
            </p>
          </div>

          {/* Copy link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-2.5 min-w-0 overflow-hidden">
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

          {/* Footer */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => setShowGuidelines(true)}
              className="text-[13px] font-medium text-white/[0.55] hover:text-white/[0.80] hover:underline transition-all cursor-pointer"
            >
              View Terms
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReferralModal({ open, onOpenChange }: ReferralModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-[hsl(220,18%,8%)] border-t border-white/[0.08] p-0 overflow-hidden">
          <ReferralBody onClose={() => onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[680px] max-w-[92vw] p-0 bg-[hsl(220,18%,8%)] border border-white/[0.08] rounded-[22px] overflow-hidden [&>button:last-child]:hidden">
        <ReferralBody onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
