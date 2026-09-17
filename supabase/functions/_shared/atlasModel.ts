import { AtlasMessage, AtlasSource, buildAtlasPrompt, validateAtlasResponse } from './atlasTeachingContract.ts';
import { calculateExample } from './atlasExamples.ts';

const string={type:'string'};
export const ATLAS_SCHEMA={type:'object',additionalProperties:false,required:['answer','sourceIds','actionId','check','workedExample'],properties:{
  answer:string,sourceIds:{type:'array',items:string},actionId:{type:['string','null']},
  check:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['question','choices','correctIndex','explanation'],properties:{question:string,choices:{type:'array',items:string,minItems:2,maxItems:2},correctIndex:{type:'integer',enum:[0,1]},explanation:string}}]},
  workedExample:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['market','entry','exit','quantity','unitValue','fees'],properties:{market:{type:'string',enum:['stocks','options','futures','forex']},entry:{type:'number'},exit:{type:'number'},quantity:{type:'number'},unitValue:{type:'number'},fees:{type:'number'}}}]},
}};

export async function generateAtlas({key,provider,model,messages,sources,actionIds,signal,fetcher=fetch}:{key:string;provider:'openai'|'lovable';model?:string;messages:AtlasMessage[];sources:AtlasSource[];actionIds:string[];signal:AbortSignal;fetcher?:typeof fetch}){
  const instructions=buildAtlasPrompt(sources,actionIds)+`\nADDITIONAL OUTPUT: Include workedExample, either null or {market,entry,exit,quantity,unitValue,fees}. Use only hypothetical LONG positions. For stocks unitValue=1, standard stock options=100, USD-quoted forex=1 (quantity in units), futures use an explicitly hypothetical dollar value per point. Never claim these are live prices or recommended positions. The application computes the P/L; do not invent a result. Choose a downside example when useful, not just a spectacular win. Explain assumptions and limitations. For questions outside your sources, distinguish general background from sourced Vault teaching. You are not restricted to copying the reference wording.`;
  const isOpenAI=provider==='openai';
  const body=isOpenAI?{model:model||'gpt-6-astra',instructions,input:messages,reasoning:{effort:'high'},text:{format:{type:'json_schema',name:'atlas_teaching',strict:true,schema:ATLAS_SCHEMA}},max_output_tokens:5000,store:false}:{model:model||'google/gemini-2.5-flash',messages:[{role:'system',content:instructions},...messages],stream:false,max_tokens:1600,response_format:{type:'json_object'}};
  const response=await fetcher(isOpenAI?'https://api.openai.com/v1/responses':'https://ai.gateway.lovable.dev/v1/chat/completions',{method:'POST',signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok)throw new Error(response.status===429?'The AI service is busy. Try again shortly.':'The AI service could not answer.');
  const payload:unknown=await response.json();
  if(!payload || typeof payload!=='object')throw new Error('The answer could not be verified. Please try again.');
  const result=payload as Record<string,unknown>;
  if(isOpenAI&&result.status!=='completed')throw new Error('The answer did not finish. Please retry.');
  const isRecord=(value:unknown):value is Record<string,unknown>=>!!value && typeof value==='object';
  const output=Array.isArray(result.output)?result.output:[];
  const choices=Array.isArray(result.choices)?result.choices:[];
  const choice=choices[0];
  const message=isRecord(choice)&&isRecord(choice.message)?choice.message:null;
  const raw=isOpenAI?output.filter(item=>isRecord(item)&&item.type==='message').flatMap(item=>Array.isArray(item.content)?item.content:[]).filter(part=>isRecord(part)&&part.type==='output_text'&&typeof part.text==='string').map(part=>part.text).join(''):typeof message?.content==='string'?message.content:'';
  let answer;try{answer=validateAtlasResponse(JSON.parse(raw||''),sources.map(s=>s.id),actionIds);}catch{throw new Error('The answer could not be verified. Please try again.');}
  let workedExample;try{if(!('workedExample' in answer))throw new Error();workedExample=answer.workedExample===null?null:calculateExample(answer.workedExample);}catch{throw new Error('The worked example failed its calculation checks. Please retry.');}
  return {...answer,workedExample,sourceLabels:(answer.sourceIds as string[]).map(id=>sources.find(s=>s.id===id)!.title)};
}
