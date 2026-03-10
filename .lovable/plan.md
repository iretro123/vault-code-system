

## Auto-Fill Account Balance in Vault Trade Planner

Pre-populate the Account Size field with the trader's live calculated balance (starting balance + all trade P/L), while keeping it fully editable.

### How it works

1. On mount, if there's no saved `accountSize` in localStorage, fetch the user's `profiles.account_balance` and all trade entries to compute `startingBalance + totalPnl`
2. Round to nearest dollar and populate the field
3. The field remains fully editable — user can clear it and type any number
4. Once the user types a custom value, it saves to localStorage as before (so it persists across sessions until Reset All)

### Changes — `src/components/vault-planner/VaultTradePlanner.tsx`

**Add** inside `VaultTradePlanner()` (after line 198):
- Import `useAuth` and fetch profile + trade log data on mount
- If no saved accountSize exists in localStorage, compute `profile.account_balance + SUM(trade P/L)` and set as initial value
- Use the same P/L computation logic from `useTradeLog` (risk_reward * risk_used)

```tsx
// After existing state declarations, add:
const { user } = useAuth();

useEffect(() => {
  if (saved.accountSize || !user) return; // skip if already has saved value
  
  (async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (!profile || profile.account_balance <= 0) return;
    
    const { data: trades } = await supabase
      .from("trade_log")
      .select("risk_reward, risk_used")
      .eq("user_id", user.id);
    
    const totalPnl = (trades || []).reduce(
      (sum, t) => sum + (t.risk_reward ?? 0) * (t.risk_used ?? 0), 0
    );
    
    const liveBalance = Math.round(profile.account_balance + totalPnl);
    if (liveBalance > 0) {
      setAccountSize(liveBalance.toString());
    }
  })();
}, [user]); // runs once on mount
```

**Add import**: `useAuth` from `@/hooks/useAuth`

One file changed, ~20 lines added. No database changes needed.

