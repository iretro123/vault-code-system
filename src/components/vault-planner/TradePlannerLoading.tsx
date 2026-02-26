import { useEffect, useState } from "react";
import { XPWindow } from "./XPWindow";
import { XPButton } from "./XPButton";
import { XPProgressBar } from "./XPProgressBar";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export function TradePlannerLoading({ onComplete, onCancel }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 1000; // ms
    const interval = 50;
    const step = (100 / duration) * interval;
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 100);
          return 100;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <XPWindow title="VAULT OS (Elite v1)" onClose={onCancel} className="w-full max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-lg">📊</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">Generating your trade plan...</p>
            <p className="text-[11px] text-muted-foreground">Loading results (contracts • risk • targets)</p>
          </div>
        </div>
        <XPProgressBar percent={progress} />
        <div className="flex justify-end">
          <XPButton onClick={onCancel}>Cancel</XPButton>
        </div>
      </XPWindow>
    </div>
  );
}
