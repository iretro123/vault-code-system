import { describe, expect, it } from 'vitest';
import { validReturnCheckout, returnAccessValid, subscriptionEnd } from '../../supabase/functions/_shared/returnOffer';
const config={paymentLinkId:'plink_return',monthlyPriceId:'price_99',introPriceId:'price_199'};
const session={payment_link:'plink_return',mode:'subscription',payment_status:'paid',currency:'usd',amount_total:199};
const lines=[{quantity:1,price:{id:'price_99',unit_amount:9900,currency:'usd',recurring:{interval:'month',interval_count:1}}},{quantity:1,price:{id:'price_199',unit_amount:199,currency:'usd',recurring:null}}];
describe('paid return offer validation',()=>{
  it('accepts only the approved paid subscription offer, regardless of line order',()=>{expect(validReturnCheckout(session,lines,config)).toBe(true);expect(validReturnCheckout(session,[...lines].reverse(),config)).toBe(true)});
  it.each([{payment_status:'unpaid'},{payment_status:'no_payment_required'},{payment_link:'plink_other'},{amount_total:0},{amount_total:9900},{mode:'payment'},{currency:'eur'}])('rejects payment/offer mismatch %j',patch=>expect(validReturnCheckout({...session,...patch},lines,config)).toBe(false));
  it('rejects missing configuration and extra or duplicate items',()=>{expect(validReturnCheckout(session,lines,{...config,paymentLinkId:''})).toBe(false);expect(validReturnCheckout(session,[...lines,lines[1]],config)).toBe(false)});
  it('rejects annual subscriptions and recurring introduction charges',()=>{expect(validReturnCheckout(session,[{...lines[0],price:{...lines[0].price,recurring:{interval:'year',interval_count:1}}},lines[1]],config)).toBe(false);expect(validReturnCheckout(session,[lines[0],{...lines[1],price:{...lines[1].price,recurring:{interval:'month'}}}],config)).toBe(false)});
});
describe('bounded paid introduction access',()=>{
  const now=Date.parse('2026-10-02T12:00:00Z');const row={paid_at:'2026-10-01',status:'trialing',access_until:'2026-11-01T12:00:00Z'};
  it('allows a verified paid intro before its expiry',()=>expect(returnAccessValid(row,now)).toBe(true));
  it.each([{paid_at:null},{status:'past_due'},{status:'canceled'},{access_until:'invalid'},{access_until:'2026-10-02T12:00:00Z'}])('fails closed %j',patch=>expect(returnAccessValid({...row,...patch},now)).toBe(false));
  it('uses trial expiry and supports Stripe item-level billing periods',()=>{expect(subscriptionEnd({status:'trialing',trial_end:123,items:{data:[{current_period_end:456}]}})).toBe(123);expect(subscriptionEnd({status:'active',items:{data:[{current_period_end:456}]}})).toBe(456)});
});
