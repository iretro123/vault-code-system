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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  userId?: string;
}

export function QuickCheckInSheet({ open, onOpenChange, onComplete, userId }: Props) {
  const [followedRules, setFollowedRules] = useState(true);
  const [didWell, setDidWell] = useState("");
  const [mistake, setMistake] = useState("");
  const [lesson, setLesson] = useState("");
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!userId) { onComplete(); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("journal_entries").insert({
        user_id: userId,
        entry_date: format(new Date(), "yyyy-MM-dd"),
        what_happened: didWell || "Check-in completed",
        biggest_mistake: mistake || "None noted",
        lesson: lesson || "No specific focus",
        followed_rules: followedRules,
      });
      if (error) throw error;
      setFollowedRules(true);
      setDidWell("");
      setMistake("");
      setLesson("");
      onComplete();
    } catch (err) {
      console.error("Failed to save check-in:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <SheetTitle>Session Review (30 sec)</SheetTitle>
          </div>
          <SheetDescription>
            Close out your trading day. Lock in the lesson.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-1">
          {/* Step 1: Rules */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Did you follow your rules?</p>
              <p className="text-[10px] text-muted-foreground/60">Honest answer helps AI grade your discipline.</p>
            </div>
            <Switch checked={followedRules} onCheckedChange={setFollowedRules} />
          </div>

          {/* Step 2: What went well */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              What did you do well?
            </Label>
            <Textarea
              placeholder="e.g. Waited for confirmation before entering"
              className="min-h-[56px] resize-none text-sm"
              value={didWell}
              onChange={(e) => setDidWell(e.target.value)}
            />
          </div>

          {/* Step 3: Biggest mistake */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Biggest mistake
            </Label>
            <Textarea
              placeholder="e.g. Moved stop too early"
              className="min-h-[56px] resize-none text-sm"
              value={mistake}
              onChange={(e) => setMistake(e.target.value)}
            />
          </div>

          {/* Step 4: Lesson learned */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Lesson learned
            </Label>
            <Textarea
              placeholder="e.g. Only take A+ setups"
              className="min-h-[56px] resize-none text-sm"
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
            />
          </div>

          {/* Step 5: Submit */}
          <Button className="w-full h-10 text-sm font-semibold" onClick={handleComplete} disabled={saving}>
            {saving ? "Saving..." : "Complete Review"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
