import { Shield, Clock, Crosshair } from "lucide-react";

interface FocusReminderCardsProps {
  direction: string;
  maxLoss: number;
  maxTrades: number;
  sessionStart?: string;
  sessionCutoff?: string;
  sessionClose?: string;
}

export function FocusReminderCards({
  direction,
  maxLoss,
  maxTrades,
  sessionStart,
  sessionCutoff,
  sessionClose,
}: FocusReminderCardsProps) {
  const cards = [
    {
      icon: Shield,
      title: "Today's Rules",
      items: [
        `Direction: ${direction === "calls" ? "Calls" : "Puts"}`,
        `Max loss: $${maxLoss.toFixed(0)}`,
        `Max trades: ${maxTrades}`,
      ],
    },
    {
      icon: Clock,
      title: "Session Rules",
      items: [
        sessionStart ? `Start: ${sessionStart}` : "No start set",
        sessionCutoff ? `Cutoff: ${sessionCutoff}` : "No cutoff set",
        sessionClose ? `Hard close: ${sessionClose}` : "No close set",
      ],
    },
    {
      icon: Crosshair,
      title: "Focus",
      items: [
        "Follow the plan. That's it.",
        "One trade at a time.",
        "If in doubt, sit out.",
      ],
    },
  ];

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 border border-primary/15">
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-[11px] font-semibold text-foreground">{card.title}</p>
            </div>
            <ul className="space-y-1">
              {card.items.map((item, i) => (
                <li key={i} className="text-[10px] text-foreground/60 font-medium leading-snug">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
