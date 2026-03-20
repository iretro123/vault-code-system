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
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-card border-white/[0.08] overflow-hidden">
        <DialogTitle className="sr-only">Update Balance</DialogTitle>
        <BalanceAdjustmentCard
          balance={balance}
          onAddFunds={onAddFunds}
          onWithdraw={onWithdraw}
          onReset={onReset}
          onDeleteAdjustment={onDeleteAdjustment}
          adjustments={adjustments}
          resetting={resetting}
        />
      </DialogContent>
    </Dialog>
  );
}
