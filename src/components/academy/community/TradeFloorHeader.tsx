import { Users, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";

export function TradeFloorHeader() {
  // Simple active count placeholder — could be replaced with realtime presence
  const [activeCount] = useState(12);

  return (
    <div className="shrink-0 mx-auto w-full max-w-[1000px] px-4 py-2.5">
      <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5 backdrop-blur-sm">
        {/* Left — Today's focus */}
        <p className="text-xs text-white/50">
          <span className="text-white/30 mr-1.5">Today's Focus:</span>
          Wait for confirmation before entering.
        </p>

        {/* Right — Active + Guidelines */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
            <Users className="h-3 w-3" />
            {activeCount} active
          </span>
          <button className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/50 border border-white/[0.08] rounded-lg px-2.5 py-1 transition-colors">
            <BookOpen className="h-3 w-3" />
            Guidelines
          </button>
        </div>
      </div>
    </div>
  );
}
