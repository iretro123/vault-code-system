import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { GUIDES, answerGuide } from '../_shared/atlasFoundation.ts';
import { validateAtlasMessages, AtlasSource } from '../_shared/atlasTeachingContract.ts';
import { generateAtlas } from '../_shared/atlasModel.ts';

// New endpoint: never replaces the live coach-chat function implicitly.
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('Origin')||'';
  const allowed=(Deno.env.get('ATLAS_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean);
  const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(allowed.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!allowed.includes(origin))return json(403,{error:'Origin not allowed'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, content-type, apikey, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  if(req.method!=='POST')return json(405,{error:'Method not allowed'});
  if(Deno.env.get('ATLAS_ENABLED')!=='true')return json(503,{error:'Atlas is not enabled yet.'});
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return json(401,{error:'Sign in to use Atlas.'});
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return json(401,{error:'Sign in to use Atlas.'});
  // Reuse Vault's authoritative account access function, not client claims.
  const [{data:access,error:accessError},{data:roles,error:rolesError},{data:profile,error:profileError}]=await Promise.all([
    client.rpc('get_my_access_state'),
    client.from('user_roles').select('role').eq('user_id',user.id),
    client.from('profiles').select('access_status').eq('user_id',user.id).maybeSingle(),
  ]);
  const entitlement=Array.isArray(access)?access[0]:access;
  const staff=(roles||[]).some(r=>['operator','vault_os_owner'].includes(r.role));
  const paid=entitlement?.has_access===true&&['vault_os','vault_academy'].includes(entitlement.product_key);
  if(accessError||rolesError||profileError||profile?.access_status==='banned'||(!paid&&!staff))return json(403,{error:'An active Vault membership is required.'});
  const key=Deno.env.get('ATLAS_OPENAI_API_KEY');
  if(!key)return json(503,{error:'The Atlas model connection is not configured.'});
  let messages;let feedback:{question:string;answer:string;correction:string}|undefined;
  try{
    const reader=req.body?.getReader();if(!reader)throw new Error();let bytes=0;let body='';const decoder=new TextDecoder();
    while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>32000){await reader.cancel();return json(413,{error:'Conversation too large.'});}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();
    const payload=JSON.parse(body);
    if(payload.action==='feedback'){
      for(const [field,max] of [['question',1000],['answer',6000],['correction',2000]] as const){if(typeof payload[field]!=='string'||!payload[field].trim()||payload[field].length>max)throw new Error();}
      feedback={question:payload.question,answer:payload.answer,correction:payload.correction};
    }else messages=validateAtlasMessages(payload.messages);
  }catch{return json(400,{error:'Please send a valid question.'});}
  const {data:quota,error:quotaError}=await client.rpc('consume_atlas_request');
  if(quotaError)return json(503,{error:'Atlas usage controls are unavailable.'});
  if(quota!==true)return json(429,{error:'Your Atlas limit is reached. Please try later.'});
  if(feedback){
    const {error}=await client.from('atlas_feedback').insert({...feedback,user_id:user.id,status:'pending'});
    return error?json(503,{error:'Feedback could not be saved. Please retry.'}):json(200,{saved:true,status:'pending_review'});
  }
  const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const query=messages.filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' ');
  const topic=[...messages].reverse().filter(m=>m.role==='user').map(m=>answerGuide(m.content).topic).find(Boolean);
  const sources:AtlasSource[]=[];
  // Only approved documents enter the mentor's knowledge. No user notes/trades.
  const {data:docs,error:docError}=await service.rpc('search_atlas_documents',{query_text:query});
  if(docError)return json(503,{error:'Atlas teaching references are unavailable.'});
  for(const d of docs||[])sources.push({id:d.id,title:`${d.title} · v${d.version}`,text:d.body});
  const foundation=Object.entries(GUIDES).sort(([a],[b])=>a===topic?-1:b===topic?1:0);
  for(const [id,g] of foundation.slice(0,6-sources.length))sources.push({id,title:g.title,text:[g.text,g.example,g.caution,g.deeper].filter(Boolean).join('\n')});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),55000);
  req.signal.addEventListener('abort',()=>controller.abort(),{once:true});
  try{
    const answer=await generateAtlas({key,provider:'openai',model:'gpt-6-astra',messages,sources,actionIds:['learn','trade','setup','support'],signal:controller.signal});
    return json(200,answer);
  }catch{return json(502,{error:'Atlas could not verify a complete answer. Please retry.'});}
  finally{clearTimeout(timer);}
});
