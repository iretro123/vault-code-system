import { describe,expect,it,vi } from 'vitest';
import { calculateExample } from '../../supabase/functions/_shared/atlasExamples';
import { generateAtlas } from '../../supabase/functions/_shared/atlasModel';

describe('Atlas code-checked examples',()=>{
  it.each([
    [{market:'stocks',entry:50,exit:49.5,quantity:10,unitValue:1,fees:0},-5],
    [{market:'options',entry:1,exit:.85,quantity:1,unitValue:100,fees:1.3},-16.3],
    [{market:'futures',entry:100,exit:98,quantity:1,unitValue:5,fees:2},-12],
    [{market:'forex',entry:1.1,exit:1.099,quantity:10000,unitValue:1,fees:0},-10],
  ])('calculates the hypothetical result without trusting model arithmetic', (input,result)=>expect(calculateExample(input).net).toBe(result));
  it.each([
    {market:'options',entry:1,exit:.85,quantity:1,unitValue:1,fees:0},
    {market:'futures',entry:1,exit:2,quantity:.5,unitValue:1,fees:0},
    {market:'forex',entry:1,exit:2,quantity:1,unitValue:100,fees:0},
    {market:'stocks',entry:NaN,exit:2,quantity:1,unitValue:1,fees:0},
  ])('rejects incompatible units or invalid numbers',input=>expect(()=>calculateExample(input)).toThrow());
});

describe('Atlas Astra adapter with mocked API',()=>{
  const answer={answer:'A hypothetical example.',sourceIds:['risk'],actionId:'trade',check:null,workedExample:{market:'stocks',entry:50,exit:49.5,quantity:10,unitValue:1,fees:0}};
  const response=(value:unknown,status='completed')=>new Response(JSON.stringify({status,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]}),{status:200});
  const options={key:'synthetic-test-key',provider:'openai' as const,messages:[{role:'user' as const,content:'Explain risk'}],sources:[{id:'risk',title:'Risk reference',text:'A daily limit is not guaranteed.'}],actionIds:['trade'],signal:new AbortController().signal};
  it('targets the requested Astra model, disables response storage, and checks math',async()=>{
    const fetcher=vi.fn().mockResolvedValue(response(answer));
    const result=await generateAtlas({...options,fetcher});
    const [url,request]=fetcher.mock.calls[0];const body=JSON.parse(request.body);
    expect(url).toBe('https://api.openai.com/v1/responses');expect(body.model).toBe('gpt-6-astra');expect(body.reasoning.effort).toBe('high');expect(body.store).toBe(false);
    expect(result.workedExample?.net).toBe(-5);expect(result.sourceLabels).toEqual(['Risk reference']);
  });
  it('rejects unfinished answers',async()=>{await expect(generateAtlas({...options,fetcher:vi.fn().mockResolvedValue(response(answer,'incomplete'))})).rejects.toThrow('did not finish');});
  it('rejects invented references',async()=>{await expect(generateAtlas({...options,fetcher:vi.fn().mockResolvedValue(response({...answer,sourceIds:['made-up']}))})).rejects.toThrow('verified');});
  it('rejects mathematically incompatible examples',async()=>{await expect(generateAtlas({...options,fetcher:vi.fn().mockResolvedValue(response({...answer,workedExample:{...answer.workedExample,market:'options',unitValue:1}}))})).rejects.toThrow('calculation');});
  it.each([null, {status:'completed',output:{}}, {status:'completed',output:[null,{type:'message',content:[null,{type:'output_text',text:42}]}]}])('rejects malformed provider envelopes safely',async(payload)=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(payload),{status:200}));
    await expect(generateAtlas({...options,fetcher})).rejects.toThrow('verified');
  });
});
