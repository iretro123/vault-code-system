import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractFrameworkCardProps {
  accountBalance: number;
  riskPerTrade: number;
  direction: string;
  maxContracts?: number;
}

export function ContractFrameworkCard({ accountBalance, riskPerTrade, direction, maxContracts: maxContractsProp }: ContractFrameworkCardProps) {
  const [open, setOpen] = useState(false);

  // Pure client-side guidance logic
  const isMicro = accountBalance < 2000;
  const isSmall = accountBalance < 5000;

  const expirationStyle = isMicro
    ? "0DTE or next-day — keep theta risk minimal with small accounts"
    : isSmall
      ? "0DTE to 2DTE — short expirations match your risk budget"
      : "1–5 DTE — gives room for the move without excessive time decay";

  const strikeGuidance = riskPerTrade < 30
    ? "ATM or 1 strike OTM — maximize delta, minimize premium"
    : riskPerTrade < 60
      ? "ATM to near ATM — balance premium cost with movement"
      : "ATM preferred — you have budget for quality entries";

  const maxContracts = Math.max(1, Math.floor(riskPerTrade / 30));

  const avoidToday = isMicro
    ? "Avoid far OTM contracts — low delta means low probability and fast decay"
    : "Avoid wide spreads and multi-leg strategies — keep it simple and directional";

  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full px-3.5 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 shrink-0">
          <FileText className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] font-semibold text-foreground">Contract Framework</p>
          <p className="text-[10px] text-muted-foreground/60">What type of contract to look for today</p>
        </div>
        <Chevron className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-white/[0.04] pt-3">
          <div className="space-y-2.5">
            <div>
              <p className="text-[9px] text-muted-foreground/50 font-semibold uppercase tracking-wider mb-1">Expiration Style</p>
              <p className="text-[11px] text-foreground/80 font-medium leading-snug">{expirationStyle}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/50 font-semibold uppercase tracking-wider mb-1">Strike Guidance</p>
              <p className="text-[11px] text-foreground/80 font-medium leading-snug">{strikeGuidance}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                <p className="text-lg font-bold tabular-nums text-foreground">{maxContracts}</p>
                <p className="text-[9px] text-muted-foreground/50 font-medium">Max Contracts</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                <p className="text-lg font-bold tabular-nums text-foreground">{direction === "calls" ? "Calls" : "Puts"}</p>
                <p className="text-[9px] text-muted-foreground/50 font-medium">Direction</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/50 font-semibold uppercase tracking-wider mb-1">Avoid Today</p>
              <p className="text-[11px] text-foreground/80 font-medium leading-snug">{avoidToday}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
