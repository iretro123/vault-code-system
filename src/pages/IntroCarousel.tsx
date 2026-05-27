import { useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Radio,
  Calendar,
  MessageCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { enableGuestMode } from "@/lib/guestMode";
import introWins from "@/assets/intro/intro-wins.jpg";
import introCommunity from "@/assets/intro/intro-community.jpg";

/* ------------------------------ Premium mocks ------------------------------ */

const LiveMock = () => (
  <div className="w-full h-full bg-gradient-to-b from-[#0a0f1a] via-[#0a0f1a] to-black p-3 flex flex-col gap-2.5 text-[10px] text-foreground">
    {/* Status bar */}
    <div className="flex items-center justify-between text-[8px] text-white/40 px-1 pt-0.5">
      <span>9:41</span>
      <span>VaultOS</span>
    </div>

    {/* Live header */}
    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/10 to-blue-500/20 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
        </span>
        <span className="text-[8px] uppercase tracking-widest font-bold text-rose-300">Live now</span>
        <span className="ml-auto text-[8px] text-white/50">42 watching</span>
      </div>
      <p className="text-[11px] font-semibold leading-tight">Morning Open · SPY / QQQ</p>
      <p className="text-[8px] text-white/50 mt-0.5">Coach Marcus · started 4m ago</p>

      {/* faux video preview */}
      <div className="mt-2 rounded-md bg-black/60 aspect-video border border-white/5 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full bg-white/95 flex items-center justify-center">
          <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-black ml-0.5" />
        </div>
      </div>
    </div>

    {/* Upcoming */}
    <p className="text-[8px] uppercase tracking-widest text-white/40 px-1 mt-1">Up next</p>

    {[
      { day: "Today", time: "1:30 PM", title: "Power Hour Recap", host: "Coach Lex" },
      { day: "Tue", time: "9:15 AM", title: "Setup Review", host: "Coach Ana" },
      { day: "Wed", time: "4:00 PM", title: "Weekly Game Plan", host: "Coach Marcus" },
    ].map((s) => (
      <div
        key={s.title}
        className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1.5 flex items-center gap-2"
      >
        <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/20 flex flex-col items-center justify-center leading-none">
          <span className="text-[7px] uppercase text-primary/80">{s.day}</span>
          <span className="text-[8px] font-bold text-foreground">{s.time.split(" ")[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold truncate">{s.title}</p>
          <p className="text-[8px] text-white/40 truncate">{s.host} · {s.time}</p>
        </div>
        <Radio className="h-3 w-3 text-white/30" />
      </div>
    ))}
  </div>
);

const MentoringMock = () => (
  <div className="w-full h-full bg-gradient-to-b from-[#0a0f1a] via-[#0a0f1a] to-black p-3 flex flex-col gap-2.5 text-[10px] text-foreground">
    {/* Status bar */}
    <div className="flex items-center justify-between text-[8px] text-white/40 px-1 pt-0.5">
      <span>9:41</span>
      <span>VaultOS</span>
    </div>

    {/* Mentor hero card */}
    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-primary/20 via-indigo-500/10 to-violet-500/20 p-3">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-sm font-bold ring-2 ring-white/10">
          M
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold leading-tight">Coach Marcus</p>
          <p className="text-[8px] text-white/50">Your dedicated mentor</p>
        </div>
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex-1 rounded-md bg-black/30 border border-white/5 px-2 py-1.5">
          <p className="text-[7px] uppercase tracking-widest text-white/40">Next call</p>
          <p className="text-[9px] font-semibold mt-0.5">Thu · 2:00 PM</p>
        </div>
        <div className="flex-1 rounded-md bg-black/30 border border-white/5 px-2 py-1.5">
          <p className="text-[7px] uppercase tracking-widest text-white/40">Sessions</p>
          <p className="text-[9px] font-semibold mt-0.5">12 / 24</p>
        </div>
      </div>
    </div>

    {/* Focus list */}
    <p className="text-[8px] uppercase tracking-widest text-white/40 px-1 mt-1">This week's focus</p>

    {[
      { icon: TrendingUp, label: "Tighten stop-loss discipline", chip: "Risk" },
      { icon: Calendar, label: "Review Tuesday's losing trade", chip: "Journal" },
      { icon: MessageCircle, label: "Submit playbook v2 for review", chip: "Plan" },
    ].map(({ icon: Icon, label, chip }) => (
      <div
        key={label}
        className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1.5 flex items-center gap-2"
      >
        <div className="h-6 w-6 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
          <Icon className="h-3 w-3 text-primary" />
        </div>
        <p className="text-[10px] font-medium flex-1 truncate">{label}</p>
        <span className="text-[7px] uppercase tracking-wider text-white/50 border border-white/10 rounded-full px-1.5 py-0.5">
          {chip}
        </span>
      </div>
    ))}

    {/* CTA pill */}
    <div className="mt-auto rounded-lg bg-primary/90 text-primary-foreground text-center text-[10px] font-semibold py-2">
      Book your next 1:1 →
    </div>
  </div>
);

type Slide = {
  eyebrow: string;
  title: string;
  image?: string;
  render?: () => ReactNode;
};

const SLIDES: Slide[] = [
  {
    image: introWins,
    eyebrow: "Wins",
    title: "Real trader wins, every week.",
  },
  {
    image: introCommunity,
    eyebrow: "Community",
    title: "Trade alongside a serious team.",
  },
  {
    render: () => <LiveMock />,
    eyebrow: "Live Sessions",
    title: "Daily live coaching, on the open.",
  },
  {
    render: () => <MentoringMock />,
    eyebrow: "1:1 Mentoring",
    title: "Personal Vault OS mentoring.",
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
      className="h-[100dvh] flex flex-col items-center px-6 relative select-none overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 20% 100%, rgba(99,102,241,0.10) 0%, transparent 60%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      {/* Top bar — dots + skip */}
      <div className="w-full max-w-md flex items-center justify-between shrink-0">
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
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slide — phone + copy + CTA stack together, hugging the phone */}
      <div
        key={index}
        className="flex-1 min-h-0 w-full max-w-md flex flex-col items-center justify-center gap-5 py-4 animate-fade-in"
      >
        {/* Phone frame flanked by nav arrows */}
        <div className="relative w-full flex items-center justify-center gap-2 min-h-0">
          {/* Left arrow */}
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            aria-label="Previous slide"
            className="shrink-0 h-11 w-11 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 flex items-center justify-center text-foreground/80 hover:bg-white/[0.08] active:scale-95 transition disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Phone */}
          <div className="relative h-[52vh] max-h-[480px] aspect-[9/19] rounded-[2rem] overflow-hidden border border-white/[0.08] bg-black shadow-[0_40px_100px_-20px_rgba(59,130,246,0.35),0_20px_60px_-10px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.04]">
            {slide.image ? (
              <img
                src={slide.image}
                alt={slide.eyebrow}
                className="w-full h-full object-cover object-top"
                loading={index === 0 ? "eager" : "lazy"}
              />
            ) : (
              slide.render?.()
            )}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/[0.06] to-transparent" />
          </div>

          {/* Right arrow */}
          <button
            type="button"
            onClick={advance}
            aria-label="Next slide"
            className={cn(
              "shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition active:scale-95",
              !isLast
                ? "bg-primary/20 border border-primary/40 text-primary shadow-[0_8px_24px_-6px_rgba(59,130,246,0.6)] animate-pulse hover:bg-primary/30"
                : "bg-white/[0.04] border border-white/10 text-foreground/80 hover:bg-white/[0.08]"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Copy */}
        <div className="text-center px-2 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
            {slide.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground leading-tight">
            {slide.title}
          </h2>
        </div>

        {/* CTA — sits right under the title */}
        <Button
          onClick={advance}
          className="w-full h-13 py-3 text-base font-semibold rounded-2xl gap-2 shrink-0"
        >
          {isLast ? (next === "guest" ? "Enter Live" : "Get Started") : "Swipe or tap to continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Footer — pinned at the bottom */}
      <p className="w-full max-w-md text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0">
        Powered by Vault Trading Academy
      </p>

    </div>
  );
};

export default IntroCarousel;
