import { readFileSync } from 'node:fs';
const manifest=process.argv[2];
if(!manifest)throw new Error('Provide the path to a reviewed capture manifest.');
const {admin}=JSON.parse(readFileSync(new URL('../.vault-zones-state/spx-pulse/credentials.json',import.meta.url),'utf8'));
for(const entry of JSON.parse(readFileSync(manifest,'utf8'))){
  const {imagePath,...post}=entry;
  const response=await fetch('http://127.0.0.1:4191/observation',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'application/json'},body:JSON.stringify({...post,image:readFileSync(imagePath).toString('base64')})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error);
  console.log(JSON.stringify({id:post.id,timeframe:post.timeframe,...result}));
}
