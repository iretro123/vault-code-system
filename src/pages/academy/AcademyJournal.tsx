import { useState } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";

const MISTAKES = [
  { value: "none", label: "None" },
  { value: "oversized", label: "Oversized position" },
  { value: "revenge", label: "Revenge trade" },
  { value: "fomo", label: "FOMO entry" },
  { value: "no-stop", label: "No stop-loss" },
];

const AcademyJournal = () => {
  const { user } = useAuth();
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const [date, setDate] = useState<Date>(new Date());
  const [ticker, setTicker] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [followedRules, setFollowedRules] = useState<boolean | null>(null);
  const [mistake, setMistake] = useState("none");
  const [lesson, setLesson] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSave = whatHappened.trim().length > 0 && followedRules !== null && lesson.trim().length > 0;

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);

    const { error } = await (supabase as any).from("journal_entries").insert({
      user_id: user.id,
      entry_date: format(date, "yyyy-MM-dd"),
      ticker: ticker.trim() || null,
      what_happened: whatHappened.trim(),
      followed_rules: followedRules,
      biggest_mistake: mistake,
      lesson: lesson.trim(),
    });

    setSaving(false);
    if (error) {
      toast.error("Failed to save entry");
      return;
    }

    toast.success("Journal entry saved");
    setSaved(true);
  };

  const handleReset = () => {
    setDate(new Date());
    setTicker("");
    setWhatHappened("");
    setFollowedRules(null);
    setMistake("none");
    setLesson("");
    setSaved(false);
  };

  if (!hasAccess && !accessLoading) {
    return (
      <AcademyLayout>
        <PremiumGate status={status} pageName="Trade Journal" />
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
      <PageHeader title="Trade Journal" subtitle="Log one trade. Stay honest." />
      <div className="px-4 md:px-6 pb-6">
        <Card className="p-6 max-w-lg space-y-5">
          {saved ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Entry saved</h3>
                <p className="text-xs text-muted-foreground mt-1">One step closer to consistency.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Log another trade
              </Button>
            </div>
          ) : (
            <>
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {format(date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Ticker */}
              <div className="space-y-1.5">
                <Label className="text-xs">Ticker <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  placeholder="e.g. SPY, AAPL, ES"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>

              {/* What happened */}
              <div className="space-y-1.5">
                <Label className="text-xs">What happened?</Label>
                <Textarea
                  placeholder="Describe the trade in 2-3 sentences..."
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Followed rules */}
              <div className="space-y-1.5">
                <Label className="text-xs">Did you follow your rules?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={followedRules === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFollowedRules(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={followedRules === false ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setFollowedRules(false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              {/* Biggest mistake */}
              <div className="space-y-1.5">
                <Label className="text-xs">Biggest mistake</Label>
                <Select value={mistake} onValueChange={setMistake}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MISTAKES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lesson */}
              <div className="space-y-1.5">
                <Label className="text-xs">Lesson learned</Label>
                <Input
                  placeholder="One sentence takeaway..."
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                />
              </div>

              {/* Save */}
              <Button onClick={handleSave} disabled={!canSave || saving} className="w-full gap-2">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Entry
              </Button>
            </>
          )}
        </Card>
      </div>
    </AcademyLayout>
  );
};

export default AcademyJournal;
