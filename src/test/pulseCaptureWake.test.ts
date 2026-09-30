import {afterEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({posts:1}));
vi.mock('../../supabase/functions/_shared/pulse/receiver.ts',()=>({createPulseReceiver:()=>async()=>Response.json({accepted:true,posts:state.posts},{status:202})}));
import receiver from '../../workers/pulse-spy/index.js';
function setup(fetch=vi.fn().mockResolvedValue(new Response(null,{status:202}))){
 const env={WORKER_TOKEN:'test-token',DELIVERY_HASH:'test-hash',SUPABASE_URL:'https://example.com',SUPABASE_PUBLISHABLE_KEY:'public-test',PULSE_CAPTURE:{fetch}};
 const pending:Promise<unknown>[]=[];const ctx={waitUntil:(p:Promise<unknown>)=>pending.push(p)};
 return {env,ctx,pending,fetch,request:new Request('https://example.com/webhook/'+'a'.repeat(64),{method:'POST'})};
}
afterEach(()=>{state.posts=1;vi.restoreAllMocks();});
describe('alert delivery stays ahead of chart work',()=>{
 it('returns the accepted alert while capture wake is still pending',async()=>{
  let release:()=>void=()=>{};const fetch=vi.fn(()=>new Promise<Response>(resolve=>{release=()=>resolve(new Response(null,{status:202}));}));
  const t=setup(fetch);expect((await receiver.fetch(t.request,t.env,t.ctx)).status).toBe(202);
  await new Promise(resolve=>setTimeout(resolve,0));expect(fetch).toHaveBeenCalledTimes(1);release();await Promise.all(t.pending);
 });
 it('does not add heartbeat-only snapshots to the capture queue',async()=>{state.posts=0;const t=setup();await receiver.fetch(t.request,t.env,t.ctx);await Promise.all(t.pending);expect(t.fetch).not.toHaveBeenCalled();});
 it('reports rejected wake status without logging a token or webhook URL',async()=>{
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});const t=setup(vi.fn().mockResolvedValue(new Response(null,{status:403})));
  await receiver.fetch(t.request,t.env,t.ctx);await Promise.all(t.pending);
  expect(warn).toHaveBeenCalledWith(JSON.stringify({event:'pulse-capture-wake-rejected',status:403}));
 });
});
