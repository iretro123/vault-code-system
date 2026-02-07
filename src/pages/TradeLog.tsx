import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle, Lock, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTradeLog } from "@/hooks/useTradeLog";
import { useVaultState } from "@/contexts/VaultStateContext";
import { PreTradeExecutionGate } from "@/components/PreTradeExecutionGate";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";


const TradeLog = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { entries, loading: entriesLoading, addEntry, deleteEntry } = useTradeLog();
  const { state: vaultState, loading: vaultLoading } = useVaultState();
  const navigate = useNavigate();
  
  const [submitting, setSubmitting] = useState(false);
  const [showGate, setShowGate] = useState(false);
  
  const [trade, setTrade] = useState({
    riskUsed: "",
    rr: "",
    followedRules: null as boolean | null,
  });

  const canTrade = vaultState.vault_status !== "RED" && vaultState.trades_remaining_today > 0 && vaultState.risk_remaining_today > 0;
  
  // Step 1: Validate form and open the execution gate
  const handleInitiateSubmit = () => {
    if (!trade.riskUsed || !trade.rr || trade.followedRules === null) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    setShowGate(true);
  };

  // Step 2: Execute trade after gate clearance
  const handleGateCleared = useCallback(async (emotionalState: number) => {
    setShowGate(false);
    setSubmitting(true);
    
    const { error } = await addEntry({
      risk_used: parseFloat(trade.riskUsed),
      risk_reward: parseFloat(trade.rr),
      followed_rules: trade.followedRules!,
      emotional_state: emotionalState,
    });
    
    if (!error) {
      toast({
        title: "Trade logged",
        description: "Your trade has been recorded successfully.",
      });
      setTrade({
        riskUsed: "",
        rr: "",
        followedRules: null,
      });
    } else {
      toast({
        title: "Trade blocked",
        description: error.message || "Failed to log trade",
        variant: "destructive",
      });
    }
    
    setSubmitting(false);
  }, [addEntry, trade, toast]);

  // Step 3: Handle gate cancellation
  const handleGateCancelled = useCallback(() => {
    setShowGate(false);
  }, []);
  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  
  if (authLoading || vaultLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  const isNearTradeLimit = vaultState.trades_remaining_today <= 1 && vaultState.trades_remaining_today > 0;
  const isNearLossLimit = vaultState.risk_remaining_today < 2;
  const plannedRisk = parseFloat(trade.riskUsed) || 0;
  
  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-4">
        <Link to="/cockpit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
      <PageHeader 
        title="Trade Log" 
        subtitle={today}
      />
      
      <div className="px-4 md:px-6 space-y-6 pb-24">
        {/* Pre-Trade Execution Gate Modal */}
        <Dialog open={showGate} onOpenChange={setShowGate}>
          <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none">
            <PreTradeExecutionGate
              plannedRisk={plannedRisk}
              onCleared={handleGateCleared}
              onCancel={handleGateCancelled}
            />
          </DialogContent>
        </Dialog>

        {/* Trading Status Warning */}
        {!canTrade && (
          <Card className="vault-card p-4 border-rose-500/20">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-rose-400">Trading Blocked</p>
                <p className="text-sm text-muted-foreground">
                  {vaultState.vault_status === "RED" ? "Vault discipline lock active" : 
                   vaultState.trades_remaining_today <= 0 ? "Max trades reached for today" :
                   "Daily loss limit reached"}
                </p>
              </div>
            </div>
          </Card>
        )}
        
        {/* Limit Warnings */}
        {canTrade && (isNearTradeLimit || isNearLossLimit) && (
          <Card className="vault-card p-4 border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-400">Approaching Limits</p>
                <p className="text-sm text-muted-foreground">
                  {isNearTradeLimit && `${vaultState.trades_remaining_today} trade${vaultState.trades_remaining_today === 1 ? '' : 's'} remaining. `}
                  {isNearLossLimit && `${vaultState.risk_remaining_today.toFixed(1)}% daily loss remaining.`}
                </p>
              </div>
            </div>
          </Card>
        )}
        
        <Card className="vault-card p-5">
          <h3 className="font-medium text-foreground mb-4">Quick Entry</h3>
          
          <div className="space-y-5">
            {/* Risk Used */}
            <div>
              <Label htmlFor="risk" className="text-sm text-muted-foreground">
                Risk Used (%)
              </Label>
              <Input
                id="risk"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="1.0"
                value={trade.riskUsed}
                onChange={(e) => setTrade(prev => ({ ...prev, riskUsed: e.target.value }))}
                className="vault-input mt-1.5 h-14 text-xl font-mono"
                disabled={!canTrade}
              />
            </div>
            
            {/* Risk to Reward */}
            <div>
              <Label htmlFor="rr" className="text-sm text-muted-foreground">
                Risk-to-Reward
              </Label>
              <Input
                id="rr"
                type="number"
                min="0"
                max="20"
                step="0.1"
                placeholder="2.0"
                value={trade.rr}
                onChange={(e) => setTrade(prev => ({ ...prev, rr: e.target.value }))}
                className="vault-input mt-1.5 h-14 text-xl font-mono"
                disabled={!canTrade}
              />
            </div>
            
            {/* Followed Rules */}
            <div>
              <Label className="text-sm text-muted-foreground mb-3 block">
                Followed Rules?
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTrade(prev => ({ ...prev, followedRules: true }))}
                  disabled={!canTrade}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all disabled:opacity-50",
                    trade.followedRules === true 
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
                      : "border-white/10 hover:border-white/20 text-foreground"
                  )}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrade(prev => ({ ...prev, followedRules: false }))}
                  disabled={!canTrade}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all disabled:opacity-50",
                    trade.followedRules === false 
                      ? "border-rose-500 bg-rose-500/10 text-rose-400" 
                      : "border-white/10 hover:border-white/20 text-foreground"
                  )}
                >
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">No</span>
                </button>
              </div>
            </div>
            
            {/* Emotional State - Now captured in the PreTradeExecutionGate */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Emotional state will be confirmed in pre-trade gate</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Submit Button */}
        <Button 
          size="lg" 
          className="vault-cta w-full h-14 text-base font-semibold gap-2"
          onClick={handleInitiateSubmit}
          disabled={submitting || !canTrade}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !canTrade ? (
            <Lock className="w-5 h-5" />
          ) : (
            <Shield className="w-5 h-5" />
          )}
          {submitting ? "Logging..." : !canTrade ? "Trading Blocked" : "Pre-Trade Check"}
        </Button>
        
        {/* Recent Trades */}
        <div className="pt-4">
          <p className="section-title">Recent Entries</p>
          {entriesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No trades logged yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 10).map((entry) => (
                <Card key={entry.id} className="vault-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {entry.followed_rules ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <div>
                        <p className="font-mono text-sm text-foreground">
                          {entry.risk_used}% risk · {entry.risk_reward}R
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.trade_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 text-muted-foreground hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default TradeLog;
