import { useEffect, useState, useMemo } from "react";
import type { ChatEffectType } from "@/lib/chatEffects";

interface ChatEffectsProps {
  activeEffect: ChatEffectType;
  onComplete: () => void;
}

const DURATIONS: Record<string, number> = {
  shake: 500,
  snow: 4000,
  confetti: 3000,
  rocket: 2000,
  gg: 3000,
};

/* ── Snow particles ── */
function SnowEffect() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        size: 8 + Math.random() * 12,
        duration: 2.5 + Math.random() * 2,
      })),
    []
  );

  return (
    <>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${f.left}%`,
            top: -20,
            fontSize: f.size,
            animationName: "chat-snow-fall",
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            animationTimingFunction: "linear",
            animationFillMode: "forwards",
            opacity: 0,
          }}
        >
          ❄
        </span>
      ))}
    </>
  );
}

/* ── Confetti burst ── */
function ConfettiEffect({ gold }: { gold?: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const colors = gold
          ? ["#FFD700", "#FFA500", "#FFEC8B", "#DAA520", "#F5DEB3"]
          : ["#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444"];
        return {
          id: i,
          color: colors[i % colors.length],
          left: 30 + Math.random() * 40,
          delay: Math.random() * 0.4,
          angle: -70 + Math.random() * 140,
          distance: 200 + Math.random() * 300,
          rotation: Math.random() * 360,
          size: 4 + Math.random() * 6,
        };
      }),
    [gold]
  );

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: `${p.left}%`,
            bottom: 0,
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1 : 1.6),
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "1px",
            animationName: "chat-confetti-burst",
            animationDuration: "2.5s",
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.3, 1)",
            animationFillMode: "forwards",
            opacity: 0,
            ["--confetti-x" as string]: `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
            ["--confetti-y" as string]: `${-p.distance}px`,
            ["--confetti-r" as string]: `${p.rotation}deg`,
          }}
        />
      ))}
    </>
  );
}

/* ── Rocket ── */
function RocketEffect() {
  return (
    <span
      className="absolute pointer-events-none select-none"
      style={{
        left: "50%",
        bottom: 0,
        fontSize: 40,
        transform: "translateX(-50%)",
        animationName: "chat-rocket-fly",
        animationDuration: "1.8s",
        animationTimingFunction: "cubic-bezier(0.2, 0, 0.3, 1)",
        animationFillMode: "forwards",
      }}
    >
      🚀
    </span>
  );
}

export function ChatEffects({ activeEffect, onComplete }: ChatEffectsProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!activeEffect) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, DURATIONS[activeEffect] ?? 3000);
    return () => clearTimeout(timer);
  }, [activeEffect, onComplete]);

  if (!visible || !activeEffect || activeEffect === "shake") return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {activeEffect === "snow" && <SnowEffect />}
      {activeEffect === "confetti" && <ConfettiEffect />}
      {activeEffect === "rocket" && <RocketEffect />}
      {activeEffect === "gg" && <ConfettiEffect gold />}
    </div>
  );
}
