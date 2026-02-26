import { InputHTMLAttributes } from "react";
import { xp } from "./xp-styles";
import { XPTooltip } from "./XPTooltip";

interface XPInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  tooltip?: string;
}

export function XPInput({ label, error, tooltip, className = "", style, ...props }: XPInputProps) {
  return (
    <div className="space-y-0.5">
      {label && (
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider inline-flex items-center">
          {label}
          {tooltip && <XPTooltip text={tooltip} />}
        </label>
      )}
      <input
        className={`w-full px-2.5 py-1.5 text-sm font-mono text-foreground rounded-[2px] outline-none
          focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50
          ${error ? "ring-1 ring-red-500/50" : ""}
          ${className}`}
        style={{
          background: xp.inputBg,
          border: xp.inputBorder,
          boxShadow: xp.inputBorderInset,
          ...style,
        }}
        {...props}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
