import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { GUIDES, answerGuide } from '../src/components/academy/atlas/atlasGuide';
import { validateAtlasMessages } from '../supabase/functions/_shared/atlasTeachingContract';
import { generateAtlas } from '../supabase/functions/_shared/atlasModel';

/** Development-only AI proxy. No shared database, no production function calls.
 * ATLAS_API_KEY must be a dedicated test Lovable gateway key, never VITE_ prefixed.
 * The plugin is inert in production builds and fail-closed without a key. */
export function atlasDevMentor():Plugin {
  let key='';let model='';let provider:'openai'|'lovable'='openai';let active=0;let windowStart=0;let requests=0;
  return {
    name:'vault-atlas-local-mentor',apply:'serve',
    configResolved(config){const env=loadEnv(config.mode,config.root,'ATLAS_');const openAIKey=process.env.ATLAS_OPENAI_API_KEY||env.ATLAS_OPENAI_API_KEY;provider=openAIKey?'openai':'lovable';key=openAIKey||process.env.ATLAS_API_KEY||env.ATLAS_API_KEY||'';model=provider==='openai'?'gpt-6-astra':process.env.ATLAS_MODEL||env.ATLAS_MODEL||'google/gemini-2.5-flash';},
    configureServer(server){
      server.middlewares.use('/__atlas',async(req,res)=>{
        const json=(status:number,value:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
        const host=req.headers.host||'';
        if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)){json(403,{error:'Local requests only'});return;}
        if(req.headers.origin && req.headers.origin!==`http://${host}`){json(403,{error:'Origin not allowed'});return;}
        if(req.method==='GET'){json(200,{configured:Boolean(key),model:key?model:null});return;}
        if(req.method!=='POST'){json(405,{error:'Method not allowed'});return;}
        if(!key){json(503,{error:'The test AI connection is not configured. Guided examples are still available.'});return;}
        if(!req.headers.origin || !req.headers['content-type']?.startsWith('application/json')){json(403,{error:'Same-origin JSON requests required'});return;}
        if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;}
        if(requests>=20 || active>=2){json(429,{error:'Please pause a moment, then try again.'});return;}
        requests++;active++;
        const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),55000);
        res.on('close',()=>controller.abort());
        try{
          let body='';for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>32000){json(413,{error:'Conversation is too large'});return;}}
          let messages;try{messages=validateAtlasMessages(JSON.parse(body).messages);}catch{json(400,{error:'Please send a valid question of at most 4,000 characters.'});return;}
          const latestTopic=[...messages].reverse().filter(m=>m.role==='user').map(m=>answerGuide(m.content).topic).find(Boolean);
          const all=Object.entries(GUIDES);
          const selected=(latestTopic?[all.find(([id])=>id===latestTopic)!,...all.filter(([id])=>id!==latestTopic)]:all).slice(0,6);
          const sources=selected.map(([id,g])=>({id,title:g.title,text:[g.text,g.example,g.caution,g.deeper].filter(Boolean).join('\n')}));
          const actionIds=['learn','trade','setup','support'];
          const answer=await generateAtlas({key,provider,model,messages,sources,actionIds,signal:controller.signal});
          json(200,answer);
        }catch{if(!res.writableEnded)json(502,{error:'The answer was interrupted or could not be verified. Please try again.'});}
        finally{clearTimeout(timeout);active--;}
      });
    },
  };
}
