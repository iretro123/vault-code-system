import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface TradingSessionToggleProps {
  paused: boolean;
  onToggle: () => void;
}

export function TradingSessionToggle({ paused, onToggle }: TradingSessionToggleProps) {
  const active = !paused;

  return (
    <div className="vault-card p-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Trading Session: {active ? "Active" : "Paused"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {active ? "Pause your session to avoid overtrading." : "Trading is disabled while paused."}
        </p>
      </div>
      <Switch
        checked={active}
        onCheckedChange={onToggle}
        className={cn(
          active
            ? "data-[state=checked]:bg-emerald-500"
            : "data-[state=unchecked]:bg-muted-foreground/30"
        )}
        thumbClassName={cn(
          active ? "bg-white" : "bg-muted-foreground"
        )}
      />
    </div>
  );
}
