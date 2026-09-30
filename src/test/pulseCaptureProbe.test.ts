import { timingSafeEqual } from 'node:crypto';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const check=vi.hoisted(()=>vi.fn());
vi.mock('../../workers/pulse-spy/capture-check.js',async importOriginal=>({...await importOriginal(),checkChartConnection:check}));
vi.mock('../../workers/pulse-spy/capture.js',()=>({runCapture:vi.fn(),drainCaptures:vi.fn()}));
import worker from '../../workers/pulse-spy/capture-worker.js';
const env={WORKER_TOKEN:'test',SUPABASE_URL:'https://db.test',SUPABASE_PUBLISHABLE_KEY:'public'};
const request=()=>new Request('https://capture.internal/check',{method:'POST',headers:{Authorization:'Bearer test'}});
beforeEach(()=>{vi.clearAllMocks();Object.defineProperty(crypto.subtle,'timingSafeEqual',{value:timingSafeEqual,configurable:true});});
afterEach(()=>vi.unstubAllGlobals());
describe('operator probe serialization',()=>{
 it('does not touch the chart when a live job holds the lock',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({busy:true})));
  expect((await worker.fetch(request(),env,{})).status).toBe(409);expect(check).not.toHaveBeenCalled();
 });
 it('finishes its own lease without changing an event',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(Response.json({lease:'probe'})).mockResolvedValueOnce(Response.json(true));vi.stubGlobal('fetch',fetch);check.mockResolvedValue({ok:true});
  expect((await worker.fetch(request(),env,{})).status).toBe(200);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({p_lease:'probe',p_event_id:null,p_result:{ok:true}});
 });
 it('does not return a successful image if its lock was lost',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({lease:'probe'})).mockResolvedValueOnce(Response.json(false)));check.mockResolvedValue({ok:true,imageId:'test-image'});
  const result=await worker.fetch(request(),env,{});expect(result.status).toBe(409);expect(await result.json()).toEqual({ok:false,failure:'capture-lease-lost'});
 });
});
