import { useEffect, useState } from "react";

/** One calm startup state; never adds a minimum display delay. */
export function AppLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="flex min-h-[240px] flex-1 items-center justify-center bg-background px-6 py-10">
      <div className="text-center" role="status" aria-live="polite">
        <div className="text-2xl font-medium tracking-tight text-foreground">Vault <span className="text-primary">OS</span></div>
        <p className="mt-3 text-sm text-muted-foreground">{slow ? "Taking longer than usual. Check your connection." : "Opening your workspace…"}</p>
        {slow && <button className="mt-4 min-h-[44px] rounded-xl border border-white/15 px-5 text-sm text-foreground" onClick={() => window.location.reload()}>Try again</button>}
      </div>
    </div>
  );
}
