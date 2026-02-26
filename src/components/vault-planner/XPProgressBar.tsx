import { xp } from "./xp-styles";

export function XPProgressBar({ percent }: { percent: number }) {
  const segments = 12;
  const filled = Math.round((percent / 100) * segments);

  return (
    <div
      className="flex gap-[2px] h-5 rounded-[2px] p-[3px]"
      style={{ background: xp.progressBg, border: xp.inputBorder }}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] transition-colors"
          style={{ background: i < filled ? xp.progressFill : "transparent" }}
        />
      ))}
    </div>
  );
}
