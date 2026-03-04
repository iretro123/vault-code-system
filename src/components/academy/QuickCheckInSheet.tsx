import { useState } from "react";
import { CheckCircle } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function QuickCheckInSheet({ open, onOpenChange, onComplete }: Props) {
  const [didWell, setDidWell] = useState("");
  const [hurt, setHurt] = useState("");
  const [focus, setFocus] = useState("");

  const handleComplete = () => {
    setDidWell("");
    setHurt("");
    setFocus("");
    onComplete();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <SheetTitle>Trade Check-In (30 sec)</SheetTitle>
          </div>
          <SheetDescription>
            Quick reflection to lock in the lesson from this trade.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              What did you do well?
            </Label>
            <Textarea
              placeholder="e.g. Waited for confirmation before entering"
              className="min-h-[60px] resize-none"
              value={didWell}
              onChange={(e) => setDidWell(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              What hurt this trade most?
            </Label>
            <Textarea
              placeholder="e.g. Moved stop too early"
              className="min-h-[60px] resize-none"
              value={hurt}
              onChange={(e) => setHurt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Next trade focus (one thing)
            </Label>
            <Textarea
              placeholder="e.g. Only take A+ setups"
              className="min-h-[60px] resize-none"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleComplete}>
            Complete Check-In
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
