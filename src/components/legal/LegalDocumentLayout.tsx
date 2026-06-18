import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type LegalDocumentLayoutProps = {
  title: string;
  updatedOn: string;
  children: ReactNode;
};

export function LegalDocumentLayout({ title, updatedOn, children }: LegalDocumentLayoutProps) {
  const navigate = useNavigate();

  return (
    <div
      className="academy-main-safe min-h-[100dvh] overflow-y-auto overflow-x-hidden px-4 py-8 text-foreground"
      style={{
        background: `
          radial-gradient(ellipse 80% 55% at 50% 10%, rgba(59,130,246,0.16) 0%, transparent 55%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        overscrollBehaviorY: "contain",
        paddingTop: "max(env(safe-area-inset-top, 0px), 2rem)",
        paddingBottom: "calc(max(env(safe-area-inset-bottom, 0px), 1rem) + 1.5rem)",
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <Button
          type="button"
          variant="ghost"
          className="mb-5 -ml-2 gap-2 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="rounded-[28px] border border-border/40 bg-card/85 p-7 shadow-[0_14px_50px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Vault OS Legal</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {updatedOn}</p>

          <div className="prose prose-invert mt-8 max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
