import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Props {
  hasJournaledThisWeek: boolean;
}

export function TodayChecklistCard({ hasJournaledThisWeek }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkedIn, setCheckedIn] = useState(false);

  const items = [
    {
      label: "Daily check-in",
      done: checkedIn,
      action: () => {
        setCheckedIn(true);
        toast({ title: "Check-in logged", description: "Your daily check-in has been recorded." });
      },
      actionLabel: "Check in",
    },
    {
      label: "Journal 1 trade",
      done: hasJournaledThisWeek,
      action: () => navigate("/academy/trade"),
      actionLabel: "Log trade",
    },
  ];

  const remaining = items.filter((i) => !i.done).length;

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">Today</h3>
        <span className="text-xs font-medium text-[rgba(255,255,255,0.45)]">
          {remaining === 0 ? "All done" : `${remaining} remaining`}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{
              background: item.done ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-[rgba(255,255,255,0.30)]" />
              )}
              <span
                className="text-sm font-medium"
                style={{ color: item.done ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.85)" }}
              >
                {item.label}
              </span>
            </div>
            {!item.done && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg text-xs font-semibold h-8 px-3 text-primary hover:text-primary"
                onClick={item.action}
              >
                {item.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
