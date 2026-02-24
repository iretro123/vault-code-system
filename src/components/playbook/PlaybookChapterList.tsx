import { Check, Clock, Lock, Play } from "lucide-react";
import { PlaybookChapter, ChapterProgress } from "@/hooks/usePlaybookProgress";
import { cn } from "@/lib/utils";

interface Props {
  chapters: PlaybookChapter[];
  progress: Record<string, ChapterProgress>;
  activeId: string | null;
  unlockedIndex: number; // order_index of the next unlockable chapter
  onSelect: (id: string) => void;
  nextChapter?: PlaybookChapter;
}

export function PlaybookChapterList({
  chapters,
  progress,
  activeId,
  unlockedIndex,
  onSelect,
  nextChapter,
}: Props) {
  return (
    <div className="space-y-3">
      {nextChapter && (
        <button
          onClick={() => onSelect(nextChapter.id)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
        >
          <Play className="h-4 w-4" fill="currentColor" />
          Continue Reading
        </button>
      )}

      <div className="space-y-1">
        {chapters.map((ch, i) => {
          const p = progress[ch.id];
          const status = p?.status || "not_started";
          const isActive = activeId === ch.id;
          const isCompleted = status === "completed" || p?.checkpoint_passed;
          const isLocked = ch.order_index > unlockedIndex && !isCompleted;

          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-100",
                isActive
                  ? "bg-white/[0.08] border border-white/[0.12]"
                  : "hover:bg-white/[0.04] border border-transparent"
              )}
            >
              {/* Status indicator */}
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isLocked
                    ? "bg-white/[0.04] text-white/20"
                    : status === "in_progress"
                    ? "bg-primary/20 text-primary"
                    : "bg-white/[0.06] text-white/30"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isCompleted ? "text-white/50" : "text-foreground/90"
                  )}
                >
                  {ch.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="h-3 w-3 text-white/20" />
                  <span className="text-[11px] text-white/25">{ch.minutes_estimate} min</span>
                  {isCompleted && (
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                      style={{ background: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.35)", color: "#EFFFF3" }}
                    >
                      Complete
                    </span>
                  )}
                  {!isCompleted && status === "in_progress" && !isLocked && (
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                      style={{ background: "rgba(59,130,246,0.18)", borderColor: "rgba(59,130,246,0.35)", color: "rgba(255,255,255,0.9)" }}
                    >
                      In Progress
                    </span>
                  )}
                  {isLocked && (
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                      style={{ background: "rgba(148,163,184,0.10)", borderColor: "rgba(148,163,184,0.20)", color: "rgba(226,232,240,0.75)" }}
                    >
                      Preview
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
