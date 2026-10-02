import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({handler:undefined as undefined|((req:Request)=>Promise<Response>),inventoryFailure:'',deleteFailure:'',deleteAuth:vi.fn(),deleted:[] as string[]}));
vi.mock('https://esm.sh/@supabase/supabase-js@2',()=>({createClient:()=>({
 auth:{getClaims:async()=>({data:{claims:{sub:'00000000-0000-4000-a000-000000000001'}},error:null}),admin:{deleteUser:state.deleteAuth}},
 rpc:async()=>({data:[],error:null}),storage:{from:()=>({remove:async()=>({error:null})})},
 from:(table:string)=>{
  let operation='select';const query={
   select:()=>query,delete:()=>{operation='delete';return query;},update:()=>{operation='update';return query;},eq:()=>query,in:()=>query,
   maybeSingle:async()=>({data:null,error:state.inventoryFailure===table?{message:'offline'}:null}),
   then:(resolve:(v:unknown)=>unknown)=>{if(operation!=='select')state.deleted.push(table);return Promise.resolve({data:[],error:(operation==='select'?state.inventoryFailure:state.deleteFailure)===table?{message:'offline'}:null}).then(resolve);},
  };return query;
 },
})}));
beforeEach(async()=>{
 vi.resetModules();state.inventoryFailure='';state.deleteFailure='';state.deleted=[];state.deleteAuth.mockReset().mockResolvedValue({error:null});
 vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(console,'log').mockImplementation(()=>{});
 vi.stubGlobal('Deno',{env:{get:()=> 'test'},serve:(handler:typeof state.handler)=>{state.handler=handler;}});
 const edgeFunctionPath='../../supabase/functions/delete-account/index';
 await import(edgeFunctionPath);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const request=()=>new Request('https://example.com/delete-account',{method:'POST',headers:{Authorization:'Bearer test'}});
it('does not delete identity or rows when account inventory fails',async()=>{
 state.inventoryFailure='academy_messages';const response=await state.handler!(request());expect(response.status).toBe(500);expect(state.deleteAuth).not.toHaveBeenCalled();expect(state.deleted).toEqual([]);
});
it('stops before auth deletion when row cleanup fails',async()=>{
 state.deleteFailure='trade_entries';const response=await state.handler!(request());expect(response.status).toBe(500);expect(state.deleteAuth).not.toHaveBeenCalled();expect(state.deleted).not.toContain('profiles');
});
it('allows auth deletion only after successful cleanup',async()=>{
 const response=await state.handler!(request());expect(response.status).toBe(200);expect(state.deleteAuth).toHaveBeenCalledWith('00000000-0000-4000-a000-000000000001');expect(await response.json()).toEqual({deleted:true,warnings:[]});
});
