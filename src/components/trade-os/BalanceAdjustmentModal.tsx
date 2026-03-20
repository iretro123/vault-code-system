import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BalanceAdjustmentCard } from "./BalanceAdjustmentCard";
import type { BalanceAdjustment } from "@/hooks/useBalanceAdjustments";

interface BalanceAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number | null;
  onAddFunds: (amount: number, note: string) => Promise<boolean>;
  onWithdraw: (amount: number, note: string) => Promise<boolean>;
  onReset: () => Promise<void>;
  onDeleteAdjustment: (id: string) => Promise<boolean>;
  adjustments: BalanceAdjustment[];
  resetting: boolean;
}

export function BalanceAdjustmentModal({
  open, onOpenChange, balance, onAddFunds, onWithdraw, onReset, onDeleteAdjustment, adjustments, resetting,
}: BalanceAdjustmentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl border-white/[0.12] bg-[hsl(var(--card))]/95 backdrop-blur-xl shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25),0_0_0_1px_hsl(var(--primary)/0.08)] overflow-hidden pt-8 [&>button:last-child]:top-2 [&>button:last-child]:right-2.5 [&>button:last-child]:z-50">
        <DialogTitle className="sr-only">Update Balance</DialogTitle>
        <BalanceAdjustmentCard
          balance={balance}
          onAddFunds={onAddFunds}
          onWithdraw={onWithdraw}
          onReset={onReset}
          onDeleteAdjustment={onDeleteAdjustment}
          adjustments={adjustments}
          resetting={resetting}
          isModal
        />
      </DialogContent>
    </Dialog>
  );
}