import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { enableGuestMode } from "@/lib/guestMode";
import introWins from "@/assets/intro/intro-wins.jpg";
import introCommunity from "@/assets/intro/intro-community.jpg";
import introLive from "@/assets/intro/intro-live.jpg";
import introMentoring from "@/assets/intro/intro-mentoring.jpg";

const SLIDES = [
  {
    image: introWins,
    eyebrow: "Wins",
    title: "Real trader wins, every week.",
    body: "See verified results from a serious community — proof, not hype.",
  },
  {
    image: introCommunity,
    eyebrow: "Community",
    title: "Trade alongside a serious team.",
    body: "Setups, feedback, and live discussion from traders who show up.",
  },
  {
    image: introLive,
    eyebrow: "Live Sessions",
    title: "Daily live coaching, on the open.",
    body: "Join live calls with real traders — every session, every market.",
  },
  {
    image: introMentoring,
    eyebrow: "1:1 Mentoring",
    title: "Personal Vault OS mentoring.",
    body: "One-on-one coaching tuned to your trading, your goals, your rules.",
  },
];

const IntroCarousel = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") === "guest" ? "guest" : "signup";
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = () => {
    if (next === "guest") {
      enableGuestMode();
      window.dispatchEvent(new Event("guest-mode-changed"));
      navigate("/guest");
    } else {
      navigate("/signup");
    }
  };

  const advance = () => {
    if (isLast) finish();
    else setIndex(index + 1);
  };

  const goBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  const skip = () => {
    if (next === "guest") finish();
    else navigate("/signup");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) advance();
    else if (dx > 40) goBack();
    touchStartX.current = null;
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-8 relative select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 20% 100%, rgba(99,102,241,0.10) 0%, transparent 60%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      {/* Top bar — dots + skip */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "w-6 bg-primary"
                  : i < index
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-white/10"
              )}
            />
          ))}
        </div>
        {!isLast && (
          <button
            type="button"
            onClick={skip}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slide */}
      <div
        key={index}
        className="flex-1 w-full max-w-md flex flex-col animate-fade-in"
      >
        {/* Phone frame with swipe hint */}
        <div className="relative mx-auto w-full max-w-[280px]">
          <div className="relative aspect-[9/19] rounded-[2.25rem] overflow-hidden border border-white/[0.08] bg-black shadow-[0_40px_100px_-20px_rgba(59,130,246,0.35),0_20px_60px_-10px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.04]">
            <img
              src={slide.image}
              alt={slide.eyebrow}
              className="w-full h-full object-cover object-top"
              loading={index === 0 ? "eager" : "lazy"}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/[0.06] to-transparent" />
          </div>

          {/* Swipe-right hint chevron */}
          {!isLast && (
            <button
              type="button"
              onClick={advance}
              aria-label="Next slide"
              className="absolute top-1/2 -right-2 -translate-y-1/2 h-11 w-11 rounded-full bg-primary/15 backdrop-blur-md border border-primary/30 flex items-center justify-center text-primary shadow-[0_8px_24px_-6px_rgba(59,130,246,0.5)] animate-pulse hover:bg-primary/25 active:scale-95 transition"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Copy */}
        <div className="mt-8 text-center px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            {slide.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground leading-tight">
            {slide.title}
          </h2>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-md pt-6">
        <Button
          onClick={advance}
          className="w-full h-14 text-base font-semibold rounded-2xl gap-2"
        >
          {isLast ? (next === "guest" ? "Enter Live" : "Get Started") : "Swipe or tap to continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 pt-6">
          Powered by Vault Trading Academy
        </p>
      </div>
    </div>
  );
};

export default IntroCarousel;
