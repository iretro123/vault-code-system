import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, TrendingDown, ShieldAlert, Brain } from "lucide-react";
import type { NudgeTrigger } from "@/hooks/useCoachingNudge";

const NUDGE_CONTENT: Record<NudgeTrigger, {
  icon: typeof Heart;
  headline: string;
  body: string;
}> = {
  streak: {
    icon: TrendingDown,
    headline: "Rough stretch. Let's fix this together.",
    body: "Losing streaks are part of the game — but they don't have to define your next chapter. A 1:1 session can help you spot the pattern and reset.",
  },
  drawdown: {
    icon: ShieldAlert,
    headline: "Your account needs attention.",
    body: "You've taken a meaningful hit. Before the next trade, let's talk through what's happening and build a recovery plan together.",
  },
  compliance: {
    icon: ShieldAlert,
    headline: "Rules keep breaking. Let's talk about why.",
    body: "Knowing the rules and following them are two different skills. A quick 1:1 can help close that gap and protect your capital.",
  },
  emotional: {
    icon: Brain,
    headline: "Trading on tilt? A fresh perspective helps.",
    body: "When emotions drive decisions, losses compound. Let's get you grounded and back to executing with clarity.",
  },
};

interface Props {
  open: boolean;
  triggerType: NudgeTrigger | null;
  onDismiss: () => void;
}

export function CoachingNudgeModal({ open, triggerType, onDismiss }: Props) {
  const navigate = useNavigate();
  if (!triggerType) return null;

  const content = NUDGE_CONTENT[triggerType];
  const Icon = content.icon;

  const handleSchedule = () => {
    onDismiss();
    navigate("/academy/support");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="sm:max-w-md border-border/60 bg-card">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg font-semibold text-foreground">
            {content.headline}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
            {content.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
          <Button onClick={handleSchedule} className="w-full">
            Schedule Your 1:1
          </Button>
          <Button variant="ghost" onClick={onDismiss} className="w-full text-muted-foreground">
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
