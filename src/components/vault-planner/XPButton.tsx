import { ButtonHTMLAttributes, ReactNode } from "react";
import { xp } from "./xp-styles";

interface XPButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: "default" | "primary" | "danger";
  children: ReactNode;
}

export function XPButton({ active, variant = "default", children, className = "", style, ...props }: XPButtonProps) {
  const isPrimary = variant === "primary" || active;

  return (
    <button
      className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] transition-all
        ${isPrimary ? "text-white" : "text-foreground"}
        ${variant === "danger" ? "text-red-400 hover:text-red-300" : ""}
        disabled:opacity-40 disabled:cursor-not-allowed
        hover:brightness-110 active:brightness-90
        ${className}`}
      style={{
        background: isPrimary ? xp.btnActiveBg : xp.btnBg,
        border: isPrimary ? xp.btnActiveBorder : xp.btnBorder,
        boxShadow: "0 1px 2px hsl(0 0% 0% / 0.3)",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
