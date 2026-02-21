import { Users, BookOpen, Flame, ClipboardCheck } from "lucide-react";
import { useState } from "react";

export function TradeFloorHeader() {
  const [activeCount] = useState(12);

  return (
    <div className="shrink-0 mx-auto w-full max-w-[1000px] px-4 py-3">
      <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.07] backdrop-blur-md px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left — Today's Focus */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-0.5">Today's Focus</p>
              <p className="text-sm text-white/70 font-medium">Wait for confirmation before entering.</p>
            </div>
          </div>

          {/* Right — Metrics */}
          <div className="flex items-center gap-5">
            {/* Active Now */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-white/25" />
                <span className="text-xs font-medium text-white/40">{activeCount}</span>
                <span className="text-[10px] text-white/20">active</span>
              </div>
            </div>

            {/* Streak */}
            <div className="hidden md:flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400/60" />
              <span className="text-xs font-medium text-white/40">5d streak</span>
            </div>

            {/* Weekly Review */}
            <div className="hidden md:flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 text-white/25" />
              <span className="text-xs text-white/30">Review due</span>
            </div>

            {/* Guidelines */}
            <button className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 border border-white/[0.08] rounded-xl px-3 py-1.5 transition-colors hover:bg-white/[0.03]">
              <BookOpen className="h-3 w-3" />
              Guidelines
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
