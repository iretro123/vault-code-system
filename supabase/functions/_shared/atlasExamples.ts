export type WorkedExample={market:'stocks'|'options'|'futures'|'forex';entry:number;exit:number;quantity:number;unitValue:number;fees:number};
/** Educational long positions only. Never substitutes real contract specifications. */
export function calculateExample(value:unknown){
  if(!value||typeof value!=='object')throw new Error('Invalid example');
  const v=value as WorkedExample;
  if(!['stocks','options','futures','forex'].includes(v.market))throw new Error('Unknown market');
  for(const k of ['entry','exit','quantity','unitValue','fees'] as const){if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<0||v[k]>1e6)throw new Error('Invalid example input');}
  if(!v.entry||!v.quantity||!v.unitValue)throw new Error('Positive inputs required');
  if((v.market==='stocks'||v.market==='forex')&&v.unitValue!==1)throw new Error('Use per-share or USD-quoted per-unit prices');
  if(v.market==='options'&&v.unitValue!==100)throw new Error('This example supports standard 100-share equity options only');
  if((v.market==='options'||v.market==='futures')&&!Number.isInteger(v.quantity))throw new Error('Whole contracts required');
  const gross=(v.exit-v.entry)*v.quantity*v.unitValue;
  if(Math.abs(gross)>1e9)throw new Error('Example exceeds allowed scale');
  const net=Math.round((gross-v.fees)*100)/100;
  return {inputs:v,net,formula:`(${v.exit} − ${v.entry}) × ${v.quantity} × ${v.unitValue} − ${v.fees}`,assumption:v.market==='options'?'Hypothetical long standard equity option; 100 shares per contract.':v.market==='futures'?'Hypothetical long futures position. Dollar value per point is illustrative, not a verified exchange specification.':v.market==='forex'?'Hypothetical long USD-quoted currency pair; quantity is units, not lots.':'Hypothetical long stock position; quantity is shares.',caution:'Illustration, not a suggested trade. Actual fills and fees can differ.'};
}
