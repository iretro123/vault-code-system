import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Lock } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const TRADING_STYLES = [
  { value: "day", label: "Day Trader" },
  { value: "swing", label: "Swing Trader" },
  { value: "0dte", label: "0DTE" },
];

const AUTOPAUSE_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "0", label: "Never" },
];

export function SettingsTradingPrefs() {
  const { prefs, loading, updatePrefs } = useUserPreferences();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [market, setMarket] = useState(prefs?.default_market || "options");
  const [style, setStyle] = useState(prefs?.trading_style || "");
  const [autopause, setAutopause] = useState(String(prefs?.session_autopause_minutes ?? 60));

  useEffect(() => {
    if (prefs) {
      setMarket(prefs.default_market);
      setStyle(prefs.trading_style || "");
      setAutopause(String(prefs.session_autopause_minutes));
    }
  }, [prefs]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const ok = await updatePrefs({
      default_market: market,
      trading_style: style || null,
      session_autopause_minutes: parseInt(autopause) || 0,
    });
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  if (loading) {
    return <Card className="vault-card p-5 animate-pulse h-48" />;
  }

  return (
    <Card className="vault-card p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Trading Preferences</h3>
        <p className="text-xs text-muted-foreground">These settings personalize reminders and the Vault experience.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Default Market</Label>
        <Select value={market} onValueChange={setMarket}>
          <SelectTrigger className="vault-input"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="options">Options</SelectItem>
            <SelectItem value="stocks">Stocks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Trading Style <span className="text-muted-foreground/50">(optional)</span></Label>
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="vault-input"><SelectValue placeholder="Select style" /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {TRADING_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Session Auto-Pause</Label>
        <Select value={autopause} onValueChange={setAutopause}>
          <SelectTrigger className="vault-input"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {AUTOPAUSE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground/60">If you're inactive, Vault auto-pauses to prevent overtrading.</p>
      </div>

      {/* Locked time format */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/20 border border-border/50">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <div>
          <p className="text-xs font-medium text-foreground">Time format: 12-hour (AM/PM)</p>
          <p className="text-[10px] text-muted-foreground/60">Vault uses standard time. No military time.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Preferences
        </Button>
        {saved && <span className="text-xs text-emerald-500 font-medium">Saved</span>}
      </div>
    </Card>
  );
}
