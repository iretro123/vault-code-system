import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, X, ArrowRight, RotateCcw, Trophy, Lightbulb, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuizQuestion {
  teach: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}

const QUIZ_MAP: Record<string, QuizQuestion[]> = {
  "chapter-10-vault-archive-legacy-replays-advanced-library": [
    {
      teach: "Price moves to where money is sitting.",
      question: "Where is the money usually sitting in the market?",
      options: ["Random places", "Highs and lows where traders place stops", "Inside indicators"],
      correctIndex: 1,
      hint: "Think about where traders get stopped out.",
      explanation: "Liquidity = where traders are trapped (highs/lows). That's what price goes after.",
    },
    {
      teach: "When price moves fast, it leaves a gap behind.",
      question: "What is an imbalance?",
      options: ["Slow sideways movement", "A strong fast move that leaves an unfinished area", "A support line"],
      correctIndex: 1,
      hint: "Think speed. Not slow.",
      explanation: "Imbalance = price moved too fast and didn't fully trade there.",
    },
    {
      teach: "Price usually comes back to unfinished areas.",
      question: "What does price often do after leaving an imbalance?",
      options: ["Never comes back", "Comes back later to fill it", "Deletes it"],
      correctIndex: 1,
      hint: "Markets like to \"clean things up.\"",
      explanation: "Price returns to imbalance to rebalance the market.",
    },
    {
      teach: "Liquidity is the target. That's where price is going.",
      question: "If liquidity is above price, what is most likely?",
      options: ["Price goes down", "Price goes toward it (up)", "Nothing happens"],
      correctIndex: 1,
      hint: "Price hunts liquidity.",
      explanation: "Price is drawn to liquidity like a magnet.",
    },
    {
      teach: "There is a simple process. Don't skip steps.",
      question: "What is the correct order?",
      options: ["Guess → Enter → Hope", "Structure → Zone → Confirmation", "Buy → Sell → Repeat"],
      correctIndex: 1,
      hint: "You always start by understanding direction first.",
      explanation: "Structure = direction, Zone = area, Confirmation = entry.",
    },
    {
      teach: "No setup = no trade.",
      question: "What should you do if price doesn't reach your level?",
      options: ["Chase it", "Enter anyway", "Wait patiently"],
      correctIndex: 2,
      hint: "Good traders don't force trades.",
      explanation: "Patience protects your account. No setup = no entry.",
    },
  ],
};

interface LessonQuizProps {
  moduleSlug?: string;
  lessonId?: string;
}

const LessonQuiz = ({ moduleSlug }: LessonQuizProps) => {
  const questions = moduleSlug ? QUIZ_MAP[moduleSlug] : undefined;

  const [currentQ, setCurrentQ] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const reset = useCallback(() => {
    setCurrentQ(0);
    setAttempts([]);
    setSelectedIndex(null);
    setShowHint(false);
    setShowExplanation(false);
    setRevealed(false);
    setCompleted(false);
    setScore(0);
  }, []);

  if (!questions || questions.length === 0) return null;

  const q = questions[currentQ];
  const currentAttempts = attempts[currentQ] || 0;
  const isCorrect = selectedIndex === q.correctIndex;

  const handleSelect = (index: number) => {
    if (showExplanation || revealed) return;

    setSelectedIndex(index);
    const newAttempts = [...attempts];
    newAttempts[currentQ] = (newAttempts[currentQ] || 0) + 1;
    setAttempts(newAttempts);

    if (index === q.correctIndex) {
      setScore((s) => s + 1);
      setShowExplanation(true);
      setShowHint(false);
    } else if (newAttempts[currentQ] >= 3) {
      setRevealed(true);
      setShowExplanation(true);
      setShowHint(false);
    } else {
      setShowHint(true);
      setTimeout(() => setSelectedIndex(null), 800);
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((c) => c + 1);
      setSelectedIndex(null);
      setShowHint(false);
      setShowExplanation(false);
      setRevealed(false);
    } else {
      setCompleted(true);
    }
  };

  /* ── Completion Screen ── */
  if (completed) {
    return (
      <div
        className="rounded-2xl border border-white/[0.06] p-8 text-center space-y-6"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, hsl(217 91% 60% / 0.06) 0%, hsl(214 22% 12%) 70%)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Trophy with glow ring */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full vault-quiz-trophy-ring"
            style={{
              background: "conic-gradient(from 0deg, hsl(217 91% 60% / 0.4), transparent 40%, hsl(217 91% 60% / 0.2), transparent 80%, hsl(217 91% 60% / 0.4))",
            }}
          />
          <div className="absolute inset-[3px] rounded-full bg-[hsl(214_22%_12%)]" />
          <Trophy className="relative h-9 w-9 text-primary" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground tracking-tight">Quiz Complete</h3>
          <p className="text-3xl font-bold text-primary">
            {score}<span className="text-lg text-muted-foreground font-medium">/{questions.length}</span>
          </p>
        </div>

        <p className="text-base text-foreground/60 italic leading-relaxed max-w-sm mx-auto" style={{ fontFamily: "Georgia, serif" }}>
          "You don't need more indicators.{"\n"}You needed a map."
        </p>

        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" /> Retake Quiz
        </Button>
      </div>
    );
  }

  /* ── Quiz Card ── */
  return (
    <div
      className="rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, hsl(217 91% 60% / 0.06) 0%, hsl(214 22% 12%) 70%)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Top shimmer line */}
      <div className="h-[1px]" style={{ background: "linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.4), transparent)" }} />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          <h3 className="text-sm font-bold text-foreground tracking-[0.2em] uppercase">VAULT OS QUIZ</h3>
        </div>
        <p className="text-xs text-muted-foreground">How Price Actually Moves</p>

        {/* Segmented progress bar */}
        <div className="flex gap-[3px] h-[6px] rounded-[3px] p-[1px]" style={{ background: "hsl(214 22% 10%)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-[2px] transition-all duration-300",
                i < currentQ
                  ? "bg-primary"
                  : i === currentQ
                    ? "bg-primary/60 vault-quiz-glow"
                    : "bg-white/[0.04]"
              )}
            />
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-white/[0.04]" />

      {/* Body */}
      <div className="px-6 py-6 space-y-5">
        {/* Teaching line */}
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{
            background: "hsl(217 91% 60% / 0.05)",
            borderLeft: "2px solid hsl(217 91% 60% / 0.4)",
          }}
        >
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground/80 leading-relaxed">{q.teach}</p>
        </div>

        {/* Question */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Question {currentQ + 1} of {questions.length}
          </p>
          <h4
            className="text-xl font-bold text-foreground leading-snug"
            style={{ textShadow: "0 1px 8px hsl(0 0% 0% / 0.3)" }}
          >
            {q.question}
          </h4>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            const isAnswer = i === q.correctIndex;
            const showCorrectHighlight = (showExplanation || revealed) && isAnswer;
            const showWrongHighlight = isSelected && !isCorrect && !showExplanation && !revealed;

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={showExplanation || revealed}
                className={cn(
                  "w-full text-left px-4 py-4 rounded-xl border text-[15px] font-medium transition-all duration-200",
                  showCorrectHighlight
                    ? "border-emerald-500/40 text-emerald-400"
                    : showWrongHighlight
                      ? "border-red-500/40 text-red-400"
                      : "border-white/[0.06] text-foreground/80 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-lg",
                  (showExplanation || revealed) && !showCorrectHighlight && "opacity-40"
                )}
                style={{
                  background: showCorrectHighlight
                    ? "hsl(160 84% 39% / 0.08)"
                    : showWrongHighlight
                      ? "hsl(0 72% 51% / 0.08)"
                      : "hsl(214 22% 14%)",
                  ...(showCorrectHighlight ? { boxShadow: "0 0 12px hsl(160 84% 39% / 0.15)" } : {}),
                  ...(showWrongHighlight ? { boxShadow: "0 0 12px hsl(0 72% 51% / 0.15)" } : {}),
                }}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono ring-1",
                      showCorrectHighlight
                        ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                        : showWrongHighlight
                          ? "bg-red-500/15 text-red-400 ring-red-500/30"
                          : "bg-white/[0.04] text-muted-foreground ring-white/[0.08]"
                    )}
                  >
                    {showCorrectHighlight ? <Check className="h-3.5 w-3.5" /> :
                      showWrongHighlight ? <X className="h-3.5 w-3.5" /> :
                        String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        {showHint && !showExplanation && !revealed && (
          <div
            className="rounded-xl px-4 py-3 animate-in fade-in duration-300"
            style={{
              background: "hsl(38 92% 50% / 0.06)",
              borderLeft: "2px solid hsl(38 92% 50% / 0.4)",
            }}
          >
            <p className="text-sm text-amber-300/90">
              <span className="font-medium">Hint:</span> {q.hint}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {3 - currentAttempts} {3 - currentAttempts === 1 ? "try" : "tries"} left
            </p>
          </div>
        )}

        {/* Explanation */}
        {showExplanation && (
          <div
            className="rounded-xl px-4 py-3 animate-in fade-in duration-300"
            style={{
              background: "hsl(160 84% 39% / 0.05)",
              borderLeft: "2px solid hsl(160 84% 39% / 0.3)",
            }}
          >
            <p className="text-sm text-foreground/90 leading-relaxed">
              {revealed && !isCorrect && (
                <span className="text-amber-400 font-medium block mb-1">Answer revealed after 3 tries.</span>
              )}
              {q.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Footer — Next button */}
      {showExplanation && (
        <div className="px-6 pb-6">
          <Button
            size="lg"
            className="gap-2 w-full hover:shadow-[0_0_16px_hsl(217_91%_60%/0.15)]"
            onClick={handleNext}
          >
            {currentQ < questions.length - 1 ? (
              <>Next Question <ArrowRight className="h-4 w-4" /></>
            ) : (
              <>Finish Quiz <Trophy className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LessonQuiz;
