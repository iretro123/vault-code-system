import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  Activity,
  Users,
  Radio,
  BotMessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your command center. See what to do next, every day.",
    color: "from-blue-500/20 to-blue-600/5",
  },
  {
    icon: GraduationCap,
    title: "Learn",
    description: "Video lessons that build your trading foundation.",
    color: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    icon: Activity,
    title: "Trade OS",
    description: "Your personal risk cockpit. Tracks every session.",
    color: "from-amber-500/20 to-amber-600/5",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with other traders. Share wins, get feedback.",
    color: "from-violet-500/20 to-violet-600/5",
  },
  {
    icon: Radio,
    title: "Live",
    description: "Join live coaching calls with real traders.",
    color: "from-rose-500/20 to-rose-600/5",
  },
  {
    icon: BotMessageSquare,
    title: "Ask Coach",
    description: "Your AI-powered trading mentor, available 24/7.",
    color: "from-cyan-500/20 to-cyan-600/5",
  },
];

interface VaultTourCarouselProps {
  onComplete: () => void;
}

export function VaultTourCarousel({ onComplete }: VaultTourCarouselProps) {
  const [index, setIndex] = useState(0);
  const feature = FEATURES[index];
  const Icon = feature.icon;
  const isLast = index === FEATURES.length - 1;

  return (
    <div className="flex flex-col items-center w-full gap-6">
      <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground">
        Your Vault Tour
      </p>

      {/* Feature card */}
      <div
        key={index}
        className="animate-fade-in w-full rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-8 flex flex-col items-center gap-5"
      >
        <div
          className={cn(
            "h-20 w-20 rounded-2xl bg-gradient-to-br flex items-center justify-center",
            feature.color
          )}
        >
          <Icon className="h-10 w-10 text-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          {feature.title}
        </h3>
        <p className="text-base text-muted-foreground text-center leading-relaxed max-w-xs">
          {feature.description}
        </p>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-2">
        {FEATURES.map((_, i) => (
          <div
            key={i}
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

      <Button
        onClick={() => (isLast ? onComplete() : setIndex(index + 1))}
        className="w-full h-14 text-base font-semibold tracking-wide rounded-2xl"
      >
        {isLast ? "Continue" : "Next"}
      </Button>
    </div>
  );
}
