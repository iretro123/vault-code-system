import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, X, ArrowRight, RotateCcw, Trophy } from "lucide-react";
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

  if (completed) {
    return (
      <div className="rounded-2xl bg-[hsl(var(--card))] border border-border p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Quiz Complete</h3>
          <p className="text-sm text-muted-foreground">
            {score}/{questions.length} correct
          </p>
        </div>
        <p className="text-base text-foreground/80 italic leading-relaxed max-w-sm mx-auto">
          "You don't need more indicators.{"\n"}You needed a map."
        </p>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" /> Retake Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[hsl(var(--card))] border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <h3 className="text-lg font-bold text-foreground tracking-tight">VAULT OS QUIZ</h3>
        <p className="text-xs text-muted-foreground mt-0.5">How Price Actually Moves</p>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i < currentQ
                  ? "bg-primary flex-1"
                  : i === currentQ
                    ? "bg-primary/60 flex-[2]"
                    : "bg-muted flex-1"
              )}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-5">
        {/* Teaching line */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
          <p className="text-sm text-foreground/90 leading-relaxed">💡 {q.teach}</p>
        </div>

        {/* Question */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            Question {currentQ + 1} of {questions.length}
          </p>
          <h4 className="text-base font-semibold text-foreground leading-snug">{q.question}</h4>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
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
                  "w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200",
                  showCorrectHighlight
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : showWrongHighlight
                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                      : "bg-muted/30 border-border text-foreground/80 hover:bg-muted/60 hover:border-foreground/20",
                  (showExplanation || revealed) && !showCorrectHighlight && "opacity-40"
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono",
                    showCorrectHighlight
                      ? "bg-emerald-500/20 text-emerald-400"
                      : showWrongHighlight
                        ? "bg-red-500/20 text-red-400"
                        : "bg-muted text-muted-foreground"
                  )}>
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
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 animate-in fade-in duration-300">
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
          <div className={cn(
            "rounded-xl px-4 py-3 animate-in fade-in duration-300",
            isCorrect || revealed
              ? "bg-emerald-500/5 border border-emerald-500/15"
              : ""
          )}>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {revealed && !isCorrect && (
                <span className="text-amber-400 font-medium block mb-1">Answer revealed after 3 tries.</span>
              )}
              {q.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {showExplanation && (
        <div className="px-6 pb-5">
          <Button size="sm" className="gap-1.5 w-full" onClick={handleNext}>
            {currentQ < questions.length - 1 ? (
              <>Next Question <ArrowRight className="h-3.5 w-3.5" /></>
            ) : (
              <>Finish Quiz <Trophy className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LessonQuiz;
