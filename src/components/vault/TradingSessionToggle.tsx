import { Switch } from "@/components/ui/switch";

interface TradingSessionToggleProps {
  paused: boolean;
  onToggle: () => void;
}

export function TradingSessionToggle({ paused, onToggle }: TradingSessionToggleProps) {
  return (
    <div className="vault-card p-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Trading Session: {paused ? "Paused" : "Active"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Pause your session to avoid overtrading.
        </p>
      </div>
      <Switch checked={!paused} onCheckedChange={onToggle} />
    </div>
  );
}
