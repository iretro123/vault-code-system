import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  open: boolean;
  onSave: (balance: number) => void;
  onDismiss?: () => void;
  defaultValue?: number;
}

export function SetStartingBalanceModal({ open, onSave, onDismiss, defaultValue }: Props) {
  const [amount, setAmount] = useState(defaultValue ? String(defaultValue) : "");
  const [date, setDate] = useState<Date>(new Date());

  // Sync amount when modal opens with a new defaultValue
  useEffect(() => {
    if (open) {
      setAmount(defaultValue ? String(defaultValue) : "");
    }
  }, [open, defaultValue]);

  const handleSave = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onSave(num);
  };

  const isUpdate = defaultValue !== undefined && defaultValue > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && onDismiss) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-5 w-5 text-primary" />
            <DialogTitle>{isUpdate ? "Update Balance" : "Set Starting Balance"}</DialogTitle>
          </div>
          <DialogDescription>
            {isUpdate
              ? "Update your account balance. Vault will recalculate your risk limits immediately."
              : "What is your account balance right now? Vault will use this to track your progress from your logged trades."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{isUpdate ? "New Balance" : "Starting Balance"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
          </div>

          {!isUpdate && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
          )}

          <Button className="w-full" onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}>
            {isUpdate ? "Update Balance" : "Save Starting Balance"}
          </Button>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {isUpdate ? "Cancel" : "Skip for now — I'll set it later"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
