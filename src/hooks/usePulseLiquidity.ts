import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
export interface LiquiditySnapshot { capturedAt:number|null; quoteAt:number|null; above:number|null; below:number|null; available:boolean; chartUrl:string|null }
type Symbol = 'AMEX:SPY' | 'NASDAQ:QQQ';
type Snapshots = Partial<Record<5 | 15, LiquiditySnapshot>>;
export function usePulseLiquidity(enabled: boolean, symbol: Symbol = 'AMEX:SPY') {
 const [state, setState] = useState<{symbol: Symbol; snapshots: Snapshots}>({symbol, snapshots: {}});
 useEffect(() => {
  const clear = () => setState({symbol, snapshots: {}});
  if (!enabled) { clear(); return; }
  let stopped = false, busy = false, requested = false, generation = 0;
  let currentUser: string | null | undefined;
  const refresh = async () => {
   if (stopped || document.visibilityState === 'hidden') return;
   if (busy) { requested = true; return; }
   busy = true;
   const requestGeneration = generation;
   try {
    const {data, error} = await supabase.rpc('pulse_market_liquidity_feed' as never, {p_symbol: symbol} as never);
    if (stopped || requestGeneration !== generation) return;
    // Keep the dated last capture during transport failures. Access failures must clear it.
    if (error) { if (['42501', 'PGRST301', 'PGRST302'].includes(error.code)) clear(); }
    else setState({symbol, snapshots: (data as unknown as Snapshots) || {}});
   } catch { /* A transient connection failure must not erase a saved capture. */ }
   finally {
    busy = false;
    if (requested && !stopped) { requested = false; void refresh(); }
   }
  };
  void refresh();
  const timer = setInterval(() => void refresh(), 15000);
  const visible = () => void refresh();
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('online', visible);
  const {data: auth} = supabase.auth.onAuthStateChange((_event, session) => {
   const nextUser = session?.user.id ?? null;
   if (nextUser !== currentUser) { currentUser = nextUser; generation++; clear(); }
   queueMicrotask(() => void refresh());
  });
  return () => {
   stopped = true; clearInterval(timer); auth.subscription.unsubscribe();
   document.removeEventListener('visibilitychange', visible);
   window.removeEventListener('online', visible);
  };
 }, [enabled, symbol]);
 // Never render a SPY screenshot under QQQ while its first request is pending.
 return enabled && state.symbol === symbol ? state.snapshots : {};
}
