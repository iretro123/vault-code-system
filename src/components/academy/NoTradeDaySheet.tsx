import { useState } from "react";
import { CalendarOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const REASONS = [
  "No A+ setup",
  "Busy / work schedule",
  "Risk limit hit",
  "Market conditions unclear",
  "Discipline day",
  "Other",
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function NoTradeDaySheet({ open, onOpenChange, onComplete }: Props) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    setReason("");
    setNote("");
    onComplete();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-amber-400" />
            <SheetTitle>Mark No-Trade Day</SheetTitle>
          </div>
          <SheetDescription>
            No trades today? Track it anyway to keep your consistency accurate.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Reason
            </Label>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors duration-100 ${
                    reason === r
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:border-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Note (optional)
            </Label>
            <Textarea
              placeholder="Any additional context..."
              className="min-h-[60px] resize-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={!reason}>
            Mark No-Trade Day
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
