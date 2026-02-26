import { xp } from "./xp-styles";

interface XPStatusBadgeProps {
  label: string;
  pass: boolean;
}

export function XPStatusBadge({ label, pass }: XPStatusBadgeProps) {
  const color = pass ? xp.passGreen : xp.failRed;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-[2px]"
      style={{
        border: `1px solid ${color}`,
        color,
        background: pass ? "hsl(160 84% 39% / 0.08)" : "hsl(0 72% 51% / 0.08)",
      }}
    >
      {pass ? "✅" : "❌"} {label}
    </span>
  );
}
