import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { usePlaybookProgress, PlaybookChapter, ChapterProgress } from "@/hooks/usePlaybookProgress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Check, ChevronRight, Clock, Loader2, Play, StickyNote, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* ── Chapter List (Left Column) ── */
function ChapterList({
  chapters, progress, activeId, onSelect, nextChapter,
}: {
  chapters: PlaybookChapter[];
  progress: Record<string, ChapterProgress>;
  activeId: string | null;
  onSelect: (id: string) => void;
  nextChapter?: PlaybookChapter;
}) {
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
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                status === "completed"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : status === "in_progress"
                  ? "bg-primary/20 text-primary"
                  : "bg-white/[0.06] text-white/30"
              )}>
                {status === "completed" ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  status === "completed" ? "text-white/50" : "text-foreground/90"
                )}>
                  {ch.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="h-3 w-3 text-white/20" />
                  <span className="text-[11px] text-white/25">{ch.minutes_estimate} min</span>
                  {status !== "not_started" && (
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400/70"
                        : "bg-primary/10 text-primary/70"
                    )}>
                      {status === "completed" ? "Complete" : "In Progress"}
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

/* ── Reader Panel (Center Column) ── */
function ReaderPanel({
  chapter, progress: chProgress, onUpdateProgress,
}: {
  chapter: PlaybookChapter;
  progress?: ChapterProgress;
  onUpdateProgress: (chapterId: string, updates: Partial<ChapterProgress>) => Promise<void>;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const timerRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch signed URL for the PDF
  useEffect(() => {
    async function getUrl() {
      setLoadingPdf(true);
      const { data } = await supabase.storage
        .from("playbook")
        .createSignedUrl("vault-playbook.pdf", 3600);
      if (data?.signedUrl) {
        // Add page fragment for PDF viewer
        const pageParam = `#page=${chapter.pdf_page_start}`;
        setPdfUrl(data.signedUrl + pageParam);
      }
      setLoadingPdf(false);
    }
    getUrl();
  }, [chapter.id, chapter.pdf_page_start]);

  // Track reading time
  useEffect(() => {
    timerRef.current = chProgress?.time_in_reader_seconds || 0;

    intervalRef.current = setInterval(() => {
      timerRef.current += 1;
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      // Save on unmount (debounced effect)
      if (timerRef.current > (chProgress?.time_in_reader_seconds || 0)) {
        onUpdateProgress(chapter.id, {
          time_in_reader_seconds: timerRef.current,
          status: chProgress?.status === "completed" ? "completed" : "in_progress",
        });
      }
    };
  }, [chapter.id]);

  // Mark as in_progress on first view
  useEffect(() => {
    if (!chProgress || chProgress.status === "not_started") {
      onUpdateProgress(chapter.id, { status: "in_progress" });
    }
  }, [chapter.id]);

  return (
    <div className="vault-glass-card overflow-hidden flex flex-col h-full">
      {/* Chapter header */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/25 font-bold mb-1">
          Reading
        </p>
        <h2 className="text-xl font-bold text-foreground">{chapter.title}</h2>
        <p className="text-xs text-white/30 mt-1">
          Pages {chapter.pdf_page_start}–{chapter.pdf_page_end} · ~{chapter.minutes_estimate} min
        </p>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 min-h-0">
        {loadingPdf ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={`Playbook: ${chapter.title}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <BookOpen className="h-12 w-12 text-white/10 mb-4" />
            <p className="text-sm text-white/40 font-medium">PDF not uploaded yet</p>
            <p className="text-xs text-white/20 mt-1">
              Upload vault-playbook.pdf to the playbook storage bucket to start reading.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Checkpoint Quiz ── */
function CheckpointPanel({
  chapter, progress: chProgress, onUpdateProgress,
}: {
  chapter: PlaybookChapter;
  progress?: ChapterProgress;
  onUpdateProgress: (chapterId: string, updates: Partial<ChapterProgress>) => Promise<void>;
}) {
  const questions = chapter.checkpoint_json || [];
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(chProgress?.checkpoint_passed || false);
  const [score, setScore] = useState(chProgress?.checkpoint_score || 0);

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] mb-3">Checkpoint</p>
        <p className="text-sm text-white/30">No checkpoint for this chapter.</p>
        {!chProgress?.status || chProgress.status !== "completed" ? (
          <Button
            size="sm"
            className="mt-4 w-full"
            onClick={() => onUpdateProgress(chapter.id, {
              status: "completed",
              checkpoint_passed: true,
              completed_at: new Date().toISOString(),
            })}
          >
            Mark Chapter Complete
          </Button>
        ) : null}
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
      ...(passed ? { status: "completed", completed_at: new Date().toISOString() } : {}),
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
            onValueChange={(v) => setAnswers(prev => ({ ...prev, [i]: v }))}
            disabled={submitted}
          >
            {(q.options || []).map((opt: string, oi: number) => (
              <div key={oi} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`q${i}-o${oi}`} />
                <Label
                  htmlFor={`q${i}-o${oi}`}
                  className={cn(
                    "text-sm cursor-pointer",
                    submitted && opt === q.answer ? "text-emerald-400" :
                    submitted && answers[i] === opt && opt !== q.answer ? "text-rose-400" :
                    "text-white/60"
                  )}
                >
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {submitted && q.explanation && (
            <p className="text-xs text-white/30 pl-6">{q.explanation}</p>
          )}
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
        <div className={cn(
          "text-sm font-medium text-center py-2 rounded-lg",
          score >= 70 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        )}>
          Score: {score}% {score >= 70 ? "— Passed ✓" : "— Try again"}
        </div>
      )}
    </div>
  );
}

/* ── Notes Panel ── */
function NotesPanel({ chapterId }: { chapterId: string }) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    setLoaded(false);
    supabase.from("playbook_notes")
      .select("note_text")
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId)
      .maybeSingle()
      .then(({ data }) => {
        setNote(data?.note_text || "");
        setLoaded(true);
      });
  }, [chapterId, user]);

  const saveNote = useCallback((text: string) => {
    if (!user) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data: existing } = await supabase.from("playbook_notes")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("chapter_id", chapterId)
        .maybeSingle();

      if (existing) {
        await supabase.from("playbook_notes")
          .update({ note_text: text, updated_at: new Date().toISOString() } as any)
          .eq("user_id", user.id)
          .eq("chapter_id", chapterId);
      } else {
        await supabase.from("playbook_notes")
          .insert({ user_id: user.id, chapter_id: chapterId, note_text: text } as any);
      }
    }, 1500);
  }, [user, chapterId]);

  const handleChange = (text: string) => {
    setNote(text);
    saveNote(text);
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <StickyNote className="h-3.5 w-3.5 text-primary/50" />
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Notes</p>
      </div>
      <Textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={loaded ? "Capture key insights..." : "Loading..."}
        className="min-h-[120px] bg-white/[0.02] border-white/[0.06] text-sm resize-none"
        disabled={!loaded}
      />
      <p className="text-[10px] text-white/15">Auto-saved</p>
    </div>
  );
}

/* ── Right Column (Notes + Checkpoint + Progress Summary) ── */
function RightPanel({
  chapter, chProgress, chapters, progress, onUpdateProgress,
}: {
  chapter: PlaybookChapter;
  chProgress?: ChapterProgress;
  chapters: PlaybookChapter[];
  progress: Record<string, ChapterProgress>;
  onUpdateProgress: (chapterId: string, updates: Partial<ChapterProgress>) => Promise<void>;
}) {
  const completedCount = Object.values(progress).filter(p => p.status === "completed").length;
  const totalMinutes = chapters
    .filter(c => !progress[c.id] || progress[c.id].status !== "completed")
    .reduce((s, c) => s + c.minutes_estimate, 0);

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Progress</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-foreground">{completedCount}/{chapters.length}</span>
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
              {progress[chapters[0]?.id]?.checkpoint_passed && progress[chapters[1]?.id]?.checkpoint_passed ? (
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

      <NotesPanel chapterId={chapter.id} />
      <CheckpointPanel chapter={chapter} progress={chProgress} onUpdateProgress={onUpdateProgress} />
    </div>
  );
}

/* ── Main Playbook Page ── */
const AcademyPlaybook = () => {
  const [searchParams] = useSearchParams();
  const { chapters, progress, loading, nextChapter, updateProgress } = usePlaybookProgress();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  // Set initial chapter from URL or first available
  useEffect(() => {
    const urlChapter = searchParams.get("chapter");
    if (urlChapter && chapters.find(c => c.id === urlChapter)) {
      setActiveChapterId(urlChapter);
    } else if (!activeChapterId && chapters.length > 0) {
      setActiveChapterId(nextChapter?.id || chapters[0].id);
    }
  }, [chapters, searchParams]);

  const activeChapter = chapters.find(c => c.id === activeChapterId);

  if (loading) {
    return (
      <AcademyLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AcademyLayout>
    );
  }

  if (chapters.length === 0) {
    return (
      <AcademyLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
          <BookOpen className="h-16 w-16 text-white/10 mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Vault Playbook</h2>
          <p className="text-sm text-white/40 max-w-md">
            The Trading OS playbook is being prepared. Chapters will appear here once configured by your coach.
          </p>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Vault Playbook</h1>
              <p className="text-xs text-white/30">Your Trading Operating System</p>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 min-h-0 flex">
          {/* Left: Chapter list */}
          <div className="w-[260px] shrink-0 border-r border-white/[0.06] overflow-y-auto p-4">
            <ChapterList
              chapters={chapters}
              progress={progress}
              activeId={activeChapterId}
              onSelect={setActiveChapterId}
              nextChapter={nextChapter}
            />
          </div>

          {/* Center: Reader */}
          <div className="flex-1 min-w-0 p-4">
            {activeChapter ? (
              <ReaderPanel
                chapter={activeChapter}
                progress={progress[activeChapter.id]}
                onUpdateProgress={updateProgress}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/20">
                Select a chapter
              </div>
            )}
          </div>

          {/* Right: Notes + Checkpoint + Progress */}
          <div className="w-[300px] shrink-0 border-l border-white/[0.06] overflow-y-auto p-4">
            {activeChapter && (
              <RightPanel
                chapter={activeChapter}
                chProgress={progress[activeChapter.id]}
                chapters={chapters}
                progress={progress}
                onUpdateProgress={updateProgress}
              />
            )}
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyPlaybook;
