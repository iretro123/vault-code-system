import { useState } from "react";
import { getChannelBySlug } from "@/lib/academyChannels";
import { Pin, Copy, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TRADE_FORMAT = `**Ticker:** 
**Setup:** 
**Entry/Exit:** 
**Risk:** 
**Thesis:** `;

const JOURNAL_FORMAT = `**Date:** ${new Date().toLocaleDateString()}
**What happened:** 
**Biggest mistake:** 
**Lesson learned:** 
**Followed rules:** Yes / No`;

const WIN_FORMAT = `**Ticker:** 
**Entry/Exit:** 
**P&L:** 
**Lesson learned:** 
(attach screenshot)`;

const FEEDBACK_FORMAT = `**Ticker:** 
**Setup type:** 
**What I need feedback on:** 
**Screenshot:** (attach)`;

interface RightRailProps {
  slug: string;
  pinnedMessages?: Array<{ id: string; body: string; user_name: string }>;
  onClose: () => void;
}

export function RightRail({ slug, pinnedMessages = [], onClose }: RightRailProps) {
  const channel = getChannelBySlug(slug);

  const templates = [
    { label: "Post Setup", template: TRADE_FORMAT, icon: "📋" },
    { label: "Post Journal", template: JOURNAL_FORMAT, icon: "📓" },
    { label: "Post Win/Proof", template: WIN_FORMAT, icon: "🏆" },
    { label: "Ask Feedback", template: FEEDBACK_FORMAT, icon: "💬" },
  ];

  const copyTemplate = (t: string) => {
    navigator.clipboard.writeText(t).then(
      () => toast.success("Template copied — paste into the composer"),
      () => toast.error("Failed to copy")
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-foreground">Details</h2>
        <button onClick={onClose} className="p-1 rounded-md text-white/40 hover:text-white/70">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
        {/* Channel info */}
        {channel && (
          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">About</p>
            <p className="text-xs text-white/60 leading-relaxed">{channel.description}</p>
          </div>
        )}

        {/* Pinned messages */}
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Pin className="h-3 w-3" /> Pinned
          </p>
          {pinnedMessages.length === 0 ? (
            <p className="text-xs text-white/25">No pinned messages yet.</p>
          ) : (
            <div className="space-y-2">
              {pinnedMessages.map((pm) => (
                <div key={pm.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <p className="text-[11px] font-medium text-white/50 mb-1">{pm.user_name}</p>
                  <p className="text-xs text-white/70 line-clamp-3">{pm.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates */}
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Templates
          </p>
          <div className="space-y-1.5">
            {templates.map((t) => (
              <button
                key={t.label}
                onClick={() => copyTemplate(t.template)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-left group"
              >
                <span className="text-sm">{t.icon}</span>
                <span className="text-xs text-white/60 group-hover:text-white/80 flex-1">{t.label}</span>
                <Copy className="h-3 w-3 text-white/20 group-hover:text-white/40" />
              </button>
            ))}
          </div>
        </div>

        {/* Copy Trade Format button */}
        <button
          onClick={() => copyTemplate(TRADE_FORMAT)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Trade Format
        </button>
      </div>
    </div>
  );
}
