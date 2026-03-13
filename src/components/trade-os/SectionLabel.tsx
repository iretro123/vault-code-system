import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 font-semibold pl-1">
      {children}
    </p>
  );
}
