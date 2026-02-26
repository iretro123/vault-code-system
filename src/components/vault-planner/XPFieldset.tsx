import { ReactNode } from "react";
import { xp } from "./xp-styles";

export function XPFieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset
      className="rounded-[3px] p-3 space-y-3"
      style={{ border: xp.fieldsetBorder }}
    >
      <legend className="text-xs font-semibold text-muted-foreground px-1">{legend}</legend>
      {children}
    </fieldset>
  );
}
