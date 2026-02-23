import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PlaybookChapter, ChapterProgress } from "@/hooks/usePlaybookProgress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, Trophy, StickyNote, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Notes Panel ── */
function NotesPanel({ chapterId, disabled }: { chapterId: string; disabled?: boolean }) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    setLoaded(false);
    supabase
      .from("playbook_notes")
      .select("note_text")
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId)
      .maybeSingle()
      .then(({ data }) => {
        setNote(data?.note_text || "");
        setLoaded(true);
      });
  }, [chapterId, user]);

  const saveNote = useCallback(
    (text: string) => {
      if (!user) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const { data: existing } = await supabase
          .from("playbook_notes")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("chapter_id", chapterId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("playbook_notes")
            .update({ note_text: text, updated_at: new Date().toISOString() } as any)
            .eq("user_id", user.id)
            .eq("chapter_id", chapterId);
        } else {
          await supabase
            .from("playbook_notes")
            .insert({ user_id: user.id, chapter_id: chapterId, note_text: text } as any);
        }
      }, 1500);
    },
    [user, chapterId]
  );

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <StickyNote className="h-3.5 w-3.5 text-primary/50" />
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Notes</p>
        {disabled && <Lock className="h-3 w-3 text-white/15 ml-auto" />}
      </div>
      <Textarea
        value={disabled ? "" : note}
        onChange={(e) => {
          if (disabled) return;
          setNote(e.target.value);
          saveNote(e.target.value);
        }}
        placeholder={disabled ? "Complete the required chapter to unlock notes." : loaded ? "Capture key insights..." : "Loading..."}
        className="min-h-[120px] bg-white/[0.02] border-white/[0.06] text-sm resize-none"
        disabled={disabled || !loaded}
      />
      {!disabled && <p className="text-[10px] text-white/15">Auto-saved</p>}
    </div>
  );
}

/* ── Checkpoint Quiz ── */
function CheckpointPanel({
  chapter,
  progress: chProgress,
  onUpdateProgress,
  disabled,
  reachedEnd,
}: {
  chapter: PlaybookChapter;
  progress?: ChapterProgress;
  onUpdateProgress: (chapterId: string, updates: Partial<ChapterProgress>) => Promise<void>;
  disabled?: boolean;
  reachedEnd: boolean;
}) {
  const questions = chapter.checkpoint_json || [];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(chProgress?.checkpoint_passed || false);
  const [score, setScore] = useState(chProgress?.checkpoint_score || 0);

  // Reset when chapter changes
  useEffect(() => {
    setAnswers({});
    setSubmitted(chProgress?.checkpoint_passed || false);
    setScore(chProgress?.checkpoint_score || 0);
  }, [chapter.id, chProgress?.checkpoint_passed]);

  if (disabled) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-white/15" />
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Checkpoint Locked</p>
        </div>
        <p className="text-xs text-white/25 mt-2">Complete the required chapter first to unlock this checkpoint.</p>
      </div>
    );
  }

  if (questions.length === 0) {
    const canComplete = reachedEnd && (!chProgress?.status || chProgress.status !== "completed");
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] mb-3">Checkpoint</p>
        <p className="text-sm text-white/30">No quiz for this chapter.</p>
        {canComplete && (
          <Button
            size="sm"
            className="mt-4 w-full"
            onClick={() =>
              onUpdateProgress(chapter.id, {
                status: "completed",
                checkpoint_passed: true,
                completed_at: new Date().toISOString(),
              })
            }
          >
            Mark Chapter Complete
          </Button>
        )}
        {!canComplete && chProgress?.status !== "completed" && (
          <p className="text-[10px] text-white/20 mt-3">Read all pages to enable completion.</p>
        )}
      </div>
    );
  }

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q: any, i: number) => {
      if (answers[i] === q.answer) correct++;
    });
    const finalScore = Math.round((correct / questions.length) * 100);
    const passed = finalScore >= 70;
    setScore(finalScore);
    setSubmitted(true);
    onUpdateProgress(chapter.id, {
      checkpoint_score: finalScore,
      checkpoint_passed: passed,
      ...(passed && reachedEnd ? { status: "completed", completed_at: new Date().toISOString() } : {}),
    });
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-primary/50" />
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Checkpoint</p>
      </div>

      {questions.map((q: any, i: number) => (
        <div key={i} className="space-y-2">
          <p className="text-sm text-foreground/80 font-medium">{q.question}</p>
          <RadioGroup
            value={answers[i] || ""}
            onValueChange={(v) => setAnswers((prev) => ({ ...prev, [i]: v }))}
            disabled={submitted}
          >
            {(q.options || []).map((opt: string, oi: number) => (
              <div key={oi} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`q${i}-o${oi}`} />
                <Label
                  htmlFor={`q${i}-o${oi}`}
                  className={cn(
                    "text-sm cursor-pointer",
                    submitted && opt === q.answer
                      ? "text-emerald-400"
                      : submitted && answers[i] === opt && opt !== q.answer
                      ? "text-rose-400"
                      : "text-white/60"
                  )}
                >
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {submitted && q.explanation && <p className="text-xs text-white/30 pl-6">{q.explanation}</p>}
        </div>
      ))}

      {!submitted ? (
        <Button
          size="sm"
          className="w-full"
          disabled={Object.keys(answers).length < questions.length}
          onClick={handleSubmit}
        >
          Submit Answers
        </Button>
      ) : (
        <div>
          <div
            className={cn(
              "text-sm font-medium text-center py-2 rounded-lg",
              score >= 70 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}
          >
            Score: {score}% {score >= 70 ? "— Passed ✓" : "— Try again"}
          </div>
          {score >= 70 && reachedEnd && chProgress?.status !== "completed" && (
            <Button
              size="sm"
              className="w-full mt-3"
              onClick={() =>
                onUpdateProgress(chapter.id, {
                  status: "completed",
                  completed_at: new Date().toISOString(),
                })
              }
            >
              Mark Chapter Complete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Right Panel (exported) ── */
export function PlaybookRightPanel({
  chapter,
  chProgress,
  chapters,
  progress,
  onUpdateProgress,
  isLocked,
  unlockedIndex,
  reachedEnd,
  onGoToUnlocked,
}: {
  chapter: PlaybookChapter;
  chProgress?: ChapterProgress;
  chapters: PlaybookChapter[];
  progress: Record<string, ChapterProgress>;
  onUpdateProgress: (chapterId: string, updates: Partial<ChapterProgress>) => Promise<void>;
  isLocked: boolean;
  unlockedIndex: number;
  reachedEnd: boolean;
  onGoToUnlocked: () => void;
}) {
  const completedCount = Object.values(progress).filter(
    (p) => p.status === "completed" || p.checkpoint_passed
  ).length;
  const totalMinutes = chapters
    .filter((c) => !progress[c.id] || progress[c.id].status !== "completed")
    .reduce((s, c) => s + c.minutes_estimate, 0);

  return (
    <div className="space-y-4">
      {/* Locked banner */}
      {isLocked && (
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-4 space-y-2">
          <p className="text-xs text-amber-400/70 font-medium">
            Complete Chapter {unlockedIndex} to unlock notes + checkpoint for this chapter.
          </p>
          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={onGoToUnlocked}>
            Go to Required Chapter <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Progress summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Progress</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-foreground">
            {completedCount}/{chapters.length}
          </span>
          <span className="text-xs text-white/30">~{totalMinutes} min left</span>
        </div>
        <Progress
          value={chapters.length > 0 ? (completedCount / chapters.length) * 100 : 0}
          className="h-2"
        />

        {/* Unlock status */}
        <div className="pt-2 space-y-1.5">
          {chapters.length >= 2 && (
            <div className="flex items-center gap-2 text-xs">
              {progress[chapters[0]?.id]?.checkpoint_passed &&
              progress[chapters[1]?.id]?.checkpoint_passed ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400/70">Unlock: Post Setups</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full border border-white/20" />
                  <span className="text-white/30">Unlock: Post Setups (Ch 1–2)</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <NotesPanel chapterId={chapter.id} disabled={isLocked} />
      <CheckpointPanel
        chapter={chapter}
        progress={chProgress}
        onUpdateProgress={onUpdateProgress}
        disabled={isLocked}
        reachedEnd={reachedEnd}
      />
    </div>
  );
}
