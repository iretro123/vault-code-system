import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
export interface LiquiditySnapshot { capturedAt:number|null; quoteAt:number|null; above:number|null; below:number|null; available:boolean; chartUrl:string|null }
export function usePulseLiquidity(enabled:boolean,symbol:'AMEX:SPY'|'NASDAQ:QQQ'='AMEX:SPY') {
 const [snapshots,setSnapshots]=useState<Partial<Record<5|15,LiquiditySnapshot>>>({});
 useEffect(()=>{
  if(!enabled){setSnapshots({});return;}
  let stopped=false,busy=false,generation=0;
  const refresh=async()=>{
   if(busy||document.visibilityState==='hidden')return;
   busy=true;const requestGeneration=generation;
   try{const {data,error}=await supabase.rpc('pulse_market_liquidity_feed' as never,{p_symbol:symbol} as never);if(!stopped && requestGeneration===generation)setSnapshots(error?{}:(data as unknown as Partial<Record<5|15,LiquiditySnapshot>>)||{});}catch{if(!stopped && requestGeneration===generation)setSnapshots({});}finally{busy=false;}
  };
  void refresh();const timer=setInterval(()=>void refresh(),15000);
  const visible=()=>void refresh();document.addEventListener('visibilitychange',visible);
  const {data:auth}=supabase.auth.onAuthStateChange(()=>{generation++;setSnapshots({});queueMicrotask(()=>void refresh());});
  return()=>{stopped=true;clearInterval(timer);auth.subscription.unsubscribe();document.removeEventListener('visibilitychange',visible);};
 },[enabled,symbol]);
 return snapshots;
}
