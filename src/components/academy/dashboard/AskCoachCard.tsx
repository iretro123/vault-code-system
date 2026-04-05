import { useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";

export function AskCoachCard() {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const detail: Record<string, string> = { tab: "instant" };
    if (value.trim()) detail.question = value.trim();
    window.dispatchEvent(new CustomEvent("toggle-coach-drawer", { detail }));
    setValue("");
  };

  return (
    <div className="vault-luxury-card p-6">
      <div className="flex items-center gap-3 mb-2">
        <MessageCircleQuestion className="h-5 w-5 text-primary" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
          Ask Coach
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Got a question about trading, setups, or your progress? Ask anything.
      </p>

      <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-muted/30 border border-border/50">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Type your question…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        <button
          onClick={handleSubmit}
          className="shrink-0 rounded-lg p-2 transition-colors hover:bg-primary/10"
        >
          <Send className="h-4 w-4 text-primary" />
        </button>
      </div>
    </div>
  );
}
