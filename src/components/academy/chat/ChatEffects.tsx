import { useEffect, useState, useMemo } from "react";
import type { ChatEffectType } from "@/lib/chatEffects";

interface ChatEffectsProps {
  activeEffect: ChatEffectType;
  onComplete: () => void;
}

const DURATIONS: Record<string, number> = {
  shake: 400,
  snow: 4000,
  confetti: 3500,
  rocket: 3000,
  gg: 3500,
};

/* ── Snow — Blizzard with depth layers & sway ── */
function SnowEffect() {
  const flakes = useMemo(() => {
    const symbols = ["❄", "✦", "●"];
    return Array.from({ length: 50 }, (_, i) => {
      // 3 depth layers
      const layer = i % 3; // 0=far(small/fast), 1=mid, 2=near(large/slow)
      const size = layer === 0 ? 6 + Math.random() * 4 : layer === 1 ? 10 + Math.random() * 6 : 16 + Math.random() * 8;
      const duration = layer === 0 ? 2 + Math.random() * 1 : layer === 1 ? 2.5 + Math.random() * 1.5 : 3 + Math.random() * 2;
      const opacity = layer === 0 ? 0.3 + Math.random() * 0.2 : layer === 1 ? 0.5 + Math.random() * 0.2 : 0.7 + Math.random() * 0.3;
      return {
        id: i,
        symbol: symbols[layer],
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        size,
        duration,
        maxOpacity: opacity,
        swayAmount: 15 + Math.random() * 30,
      };
    });
  }, []);

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
            color: f.symbol === "●" ? "rgba(255,255,255,0.6)" : undefined,
            animationName: "chat-snow-fall, chat-snow-sway",
            animationDuration: `${f.duration}s, ${f.duration * 0.8}s`,
            animationDelay: `${f.delay}s, ${f.delay}s`,
            animationTimingFunction: "linear, ease-in-out",
            animationFillMode: "forwards, forwards",
            animationIterationCount: "1, infinite",
            opacity: 0,
            ["--snow-max-opacity" as string]: f.maxOpacity,
            ["--snow-sway" as string]: `${f.swayAmount}px`,
          }}
        >
          {f.symbol}
        </span>
      ))}
    </>
  );
}

/* ── Confetti — Multi-wave explosion with ribbons ── */
function ConfettiEffect({ gold }: { gold?: boolean }) {
  const particles = useMemo(() => {
    const colors = gold
      ? ["#FFD700", "#FFA500", "#FFEC8B", "#DAA520", "#F5DEB3"]
      : ["#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444"];
    return Array.from({ length: 60 }, (_, i) => {
      const isRibbon = Math.random() > 0.5;
      const wave = i < 35 ? 0 : 1; // first 35 = wave 1, rest = wave 2
      return {
        id: i,
        color: colors[i % colors.length],
        left: 10 + Math.random() * 80,
        delay: wave * 0.3 + Math.random() * 0.3,
        angle: -80 + Math.random() * 160,
        distance: 250 + Math.random() * 350,
        rotation: Math.random() * 720 - 360,
        width: isRibbon ? 3 + Math.random() * 2 : 4 + Math.random() * 5,
        height: isRibbon ? 12 + Math.random() * 8 : 4 + Math.random() * 5,
        borderRadius: isRibbon ? "1px" : "50%",
      };
    });
  }, [gold]);

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: `${p.left}%`,
            bottom: 0,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: p.borderRadius,
            animationName: "chat-confetti-burst",
            animationDuration: "3s",
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "cubic-bezier(0.2, 0.6, 0.4, 1)",
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

/* ── GG — Gold celebration with floating text + sparkles ── */
function GGEffect() {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 15 + Math.random() * 70,
        top: 20 + Math.random() * 60,
        delay: 0.2 + Math.random() * 1.5,
        size: 16 + Math.random() * 16,
      })),
    []
  );

  const ggTexts = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        left: 20 + Math.random() * 60,
        delay: Math.random() * 0.8,
        size: 20 + Math.random() * 14,
      })),
    []
  );

  return (
    <>
      <ConfettiEffect gold />
      {/* Floating GG text */}
      {ggTexts.map((g) => (
        <span
          key={`gg-${g.id}`}
          className="absolute pointer-events-none select-none font-bold"
          style={{
            left: `${g.left}%`,
            bottom: "10%",
            fontSize: g.size,
            color: "#FFD700",
            textShadow: "0 0 8px rgba(255,215,0,0.5)",
            animationName: "chat-gg-float",
            animationDuration: "2.5s",
            animationDelay: `${g.delay}s`,
            animationTimingFunction: "ease-out",
            animationFillMode: "forwards",
            opacity: 0,
          }}
        >
          GG
        </span>
      ))}
      {/* Sparkle emojis */}
      {sparkles.map((s) => (
        <span
          key={`spark-${s.id}`}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: s.size,
            animationName: "chat-spark-pop",
            animationDuration: "0.8s",
            animationDelay: `${s.delay}s`,
            animationTimingFunction: "ease-out",
            animationFillMode: "both",
            opacity: 0,
          }}
        >
          ✨
        </span>
      ))}
    </>
  );
}

/* ── Rocket Swarm ("moon") ── */
function RocketEffect() {
  const rockets = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        size: 28 + Math.random() * 20,
        duration: 1.5 + Math.random() * 1,
        delay: Math.random() * 0.6,
        rotation: -15 + Math.random() * 30,
      })),
    []
  );

  const exhaust = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const colors = ["#FF6B35", "#FFA500", "#FFD700", "#FF4500"];
        return {
          id: i,
          left: 10 + Math.random() * 80,
          delay: Math.random() * 1,
          size: 3 + Math.random() * 4,
          color: colors[i % colors.length],
          duration: 0.8 + Math.random() * 0.6,
        };
      }),
    []
  );

  return (
    <>
      {/* Screen flash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          animationName: "chat-flash",
          animationDuration: "0.3s",
          animationTimingFunction: "ease-out",
          animationFillMode: "forwards",
        }}
      />
      {/* Exhaust particles */}
      {exhaust.map((e) => (
        <span
          key={`exhaust-${e.id}`}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${e.left}%`,
            bottom: 0,
            width: e.size,
            height: e.size,
            backgroundColor: e.color,
            animationName: "chat-rocket-exhaust",
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
            animationTimingFunction: "ease-out",
            animationFillMode: "forwards",
            opacity: 0,
          }}
        />
      ))}
      {/* Rockets */}
      {rockets.map((r) => (
        <span
          key={`rocket-${r.id}`}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${r.left}%`,
            bottom: 0,
            fontSize: r.size,
            transform: `rotate(${r.rotation}deg)`,
            animationName: "chat-rocket-fly",
            animationDuration: `${r.duration}s`,
            animationDelay: `${r.delay}s`,
            animationTimingFunction: "cubic-bezier(0.2, 0, 0.3, 1)",
            animationFillMode: "forwards",
          }}
        >
          🚀
        </span>
      ))}
    </>
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
      {activeEffect === "gg" && <GGEffect />}
    </div>
  );
}
