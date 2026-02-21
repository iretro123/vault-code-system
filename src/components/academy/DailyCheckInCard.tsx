import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function DailyCheckInCard() {
  const { toast } = useToast();
  const [followedRules, setFollowedRules] = useState<boolean | null>(null);
  const [tradesTaken, setTradesTaken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = followedRules !== null && tradesTaken !== null;

  const handleSubmit = () => {
    setSubmitted(true);
    toast({ title: "Check-in logged", description: "Your daily check-in has been recorded." });
  };

  if (submitted) {
    return (
      <div
        className="rounded-2xl p-6 flex items-center gap-3 border border-white/[0.10]"
        style={{
          background: "rgba(255,255,255,0.07)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(160,84%,39%)" }} />
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.92)" }}>
          Daily check-in complete.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-5 border border-white/[0.10]"
      style={{
        background: "rgba(255,255,255,0.07)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <h3 className="text-base font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
        Daily Check-In <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.55)" }}>(30s)</span>
      </h3>

      {/* Followed rules */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>Followed rules today?</p>
        <div className="flex gap-2">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => setFollowedRules(val)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: followedRules === val ? "hsl(217,91%,60%)" : "rgba(255,255,255,0.06)",
                color: followedRules === val ? "#fff" : "rgba(255,255,255,0.75)",
                border: followedRules === val ? "none" : "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      {/* Trades taken */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>Trades taken today</p>
        <div className="flex gap-2">
          {["0", "1", "2+"].map((val) => (
            <button
              key={val}
              onClick={() => setTradesTaken(val)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: tradesTaken === val ? "hsl(217,91%,60%)" : "rgba(255,255,255,0.06)",
                color: tradesTaken === val ? "#fff" : "rgba(255,255,255,0.75)",
                border: tradesTaken === val ? "none" : "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="rounded-xl font-semibold"
      >
        Submit
      </Button>
    </div>
  );
}
