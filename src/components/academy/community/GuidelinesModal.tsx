import { X, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RULES = [
  "All trade posts must use the structured format — no freestyle.",
  "Be respectful. Personal attacks or spam = instant timeout.",
  "No financial advice. Share your analysis, not recommendations.",
  "Screenshots encouraged. Charts add credibility to your post.",
  "One setup per post. Keep the feed clean and scannable.",
];

interface GuidelinesModalProps {
  open: boolean;
  onClose: () => void;
}

export function GuidelinesModal({ open, onClose }: GuidelinesModalProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-[520px] rounded-[20px] border border-white/[0.08] bg-[#0E1218] shadow-[0_24px_64px_rgba(0,0,0,0.5)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4.5 w-4.5 text-primary" />
              <h2 className="text-base font-semibold text-foreground tracking-[-0.01em]">
                Trade Floor Guidelines
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Rules */}
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3">
                Rules of the Room
              </p>
              <div className="space-y-2.5">
                {RULES.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-[11px] text-primary/60 font-mono mt-0.5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[14px] text-white/70 leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.08] p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400/60 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1.5">
                    Disclaimer
                  </p>
                  <p className="text-[13px] text-white/50 leading-relaxed">
                    Content shared here is for educational purposes only and does not constitute financial advice. 
                    Trading involves substantial risk of loss. Past performance is not indicative of future results. 
                    Always do your own research and consult a licensed financial advisor.
                  </p>
                </div>
              </div>
            </div>

            {/* Moderation note */}
            <p className="text-[11px] text-white/20 text-center pb-1">
              Moderators may remove posts that violate guidelines without notice.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
