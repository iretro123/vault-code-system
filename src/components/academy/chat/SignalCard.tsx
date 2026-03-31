import React from "react";
import { cn } from "@/lib/utils";
import { Crosshair, Radar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatTime } from "@/lib/formatTime";
import { ChatAvatar } from "@/lib/chatAvatars";
import { AcademyRoleBadge } from "../AcademyRoleBadge";

export interface SignalWatchlistData {
  type: "signal-watchlist";
  ticker: string;
  bias: "bullish" | "bearish" | "neutral";
  levels?: string;
  notes?: string;
}

export interface SignalLiveData {
  type: "signal-live";
  direction: "calls" | "puts";
  ticker: string;
  strike: string;
  exp: string;
  fill?: string;
  notes?: string;
}

export type SignalAttachment = SignalWatchlistData | SignalLiveData;

interface SignalCardProps {
  signal: SignalAttachment;
  chartImageUrl?: string;
  userName: string;
  userRole: string;
  createdAt: string;
  onImageClick?: (src: string) => void;
}

const BIAS_CONFIG = {
  bullish: { label: "Bullish", icon: TrendingUp, cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20" },
  bearish: { label: "Bearish", icon: TrendingDown, cls: "text-red-400 bg-red-500/15 border-red-500/20" },
  neutral: { label: "Neutral", icon: Minus, cls: "text-zinc-400 bg-zinc-500/15 border-zinc-500/20" },
};

export const SignalCard = React.memo(function SignalCard({
  signal,
  chartImageUrl,
  userName,
  userRole,
  createdAt,
  onImageClick,
}: SignalCardProps) {
  if (signal.type === "signal-watchlist") {
    return <WatchlistCard signal={signal} chartImageUrl={chartImageUrl} userName={userName} userRole={userRole} createdAt={createdAt} onImageClick={onImageClick} />;
  }
  return <LiveSignalCard signal={signal} chartImageUrl={chartImageUrl} userName={userName} userRole={userRole} createdAt={createdAt} onImageClick={onImageClick} />;
});

function WatchlistCard({ signal, chartImageUrl, userName, userRole, createdAt, onImageClick }: { signal: SignalWatchlistData } & Omit<SignalCardProps, "signal">) {
  const bias = BIAS_CONFIG[signal.bias] || BIAS_CONFIG.neutral;
  const BiasIcon = bias.icon;

  return (
    <div className="vault-signal-card vault-signal-watchlist max-w-full sm:max-w-[520px] mt-2">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
          <Radar className="h-4 w-4 text-sky-400" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-400">Watching</span>
          <span className="text-[18px] font-bold text-foreground tracking-tight">{signal.ticker}</span>
        </div>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", bias.cls)}>
          <BiasIcon className="h-3 w-3" />
          {bias.label}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {signal.levels && (
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Key Levels</span>
            <p className="text-[14px] text-foreground font-medium mt-0.5">{signal.levels}</p>
          </div>
        )}

        {chartImageUrl && (
          <button
            type="button"
            onClick={() => onImageClick?.(chartImageUrl)}
            className="block w-full"
          >
            <img
              src={chartImageUrl}
              alt="Chart"
              loading="lazy"
              className="w-full rounded-lg border border-white/[0.08] hover:border-white/[0.15] transition-colors object-contain max-h-[280px]"
            />
          </button>
        )}

        {signal.notes && (
          <p className="text-[13px] text-foreground/80 leading-relaxed italic">"{signal.notes}"</p>
        )}
      </div>

      {/* Author */}
      <div className="h-px bg-white/[0.06]" />
      <div className="flex items-center gap-2 px-4 py-2.5">
        <ChatAvatar userName={userName} size="h-5 w-5" />
        <span className="text-[11px] font-medium text-foreground/70">{userName}</span>
        <AcademyRoleBadge roleName={userRole} />
        <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(createdAt)}</span>
      </div>
    </div>
  );
}

function LiveSignalCard({ signal, chartImageUrl, userName, userRole, createdAt, onImageClick }: { signal: SignalLiveData } & Omit<SignalCardProps, "signal">) {
  const isCalls = signal.direction === "calls";

  return (
    <div className={cn("vault-signal-card mt-2 max-w-full sm:max-w-[520px]", isCalls ? "vault-signal-live-calls" : "vault-signal-live-puts")}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
          isCalls ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
        )}>
          <Crosshair className={cn("h-4 w-4", isCalls ? "text-emerald-400" : "text-red-400")} />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn(
            "text-[11px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full",
            isCalls ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"
          )}>
            {isCalls ? "CALLS" : "PUTS"}
          </span>
          <span className="text-[18px] font-bold text-foreground tracking-tight">{signal.ticker}</span>
          {signal.strike && (
            <span className="text-[14px] text-foreground/60 font-medium">${signal.strike} Strike</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Metadata strip */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-white/[0.02]">
        {signal.exp && (
          <div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Exp</span>
            <p className="text-[13px] text-foreground font-semibold">{signal.exp}</p>
          </div>
        )}
        {signal.fill && (
          <div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Fill</span>
            <p className="text-[13px] text-foreground font-semibold">${signal.fill}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {chartImageUrl && (
          <button
            type="button"
            onClick={() => onImageClick?.(chartImageUrl)}
            className="block w-full"
          >
            <img
              src={chartImageUrl}
              alt="Chart"
              loading="lazy"
              className="w-full rounded-lg border border-white/[0.08] hover:border-white/[0.15] transition-colors object-contain max-h-[280px]"
            />
          </button>
        )}

        {signal.notes && (
          <p className="text-[13px] text-foreground/80 leading-relaxed italic">"{signal.notes}"</p>
        )}
      </div>

      {/* Author */}
      <div className="h-px bg-white/[0.06]" />
      <div className="flex items-center gap-2 px-4 py-2.5">
        <ChatAvatar userName={userName} size="h-5 w-5" />
        <span className="text-[11px] font-medium text-foreground/70">{userName}</span>
        <AcademyRoleBadge roleName={userRole} />
        <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(createdAt)}</span>
      </div>
    </div>
  );
}
