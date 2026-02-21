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
        className="rounded-2xl p-6 flex items-center gap-3"
        style={{
          background: "rgba(247,249,252,0.94)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(160,84%,39%)" }} />
        <p className="text-sm font-medium" style={{ color: "hsl(220,25%,10%)" }}>
          Daily check-in complete.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{
        background: "rgba(247,249,252,0.94)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <h3 className="text-base font-bold" style={{ color: "hsl(220,25%,10%)" }}>
        Daily Check-In <span className="text-sm font-normal" style={{ color: "hsl(220,14%,45%)" }}>(30s)</span>
      </h3>

      {/* Followed rules */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: "hsl(220,15%,25%)" }}>Followed rules today?</p>
        <div className="flex gap-2">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => setFollowedRules(val)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: followedRules === val ? "hsl(217,91%,60%)" : "rgba(0,0,0,0.04)",
                color: followedRules === val ? "#fff" : "hsl(220,15%,25%)",
                border: followedRules === val ? "none" : "1px solid rgba(0,0,0,0.08)",
              }}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      {/* Trades taken */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: "hsl(220,15%,25%)" }}>Trades taken today</p>
        <div className="flex gap-2">
          {["0", "1", "2+"].map((val) => (
            <button
              key={val}
              onClick={() => setTradesTaken(val)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: tradesTaken === val ? "hsl(217,91%,60%)" : "rgba(0,0,0,0.04)",
                color: tradesTaken === val ? "#fff" : "hsl(220,15%,25%)",
                border: tradesTaken === val ? "none" : "1px solid rgba(0,0,0,0.08)",
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
