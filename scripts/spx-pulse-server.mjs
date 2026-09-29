import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { validatePulsePost, appendPulsePost, pulseWindowOpen, PULSE_SYMBOL } from '../src/lib/spxPulse.ts';
import { validatePulseSnapshot, postsFromSnapshot } from '../src/lib/pulseSnapshots.ts';

const root = fileURLToPath(new URL('../.vault-zones-state/spx-pulse/', import.meta.url));
mkdirSync(root, {recursive:true, mode:0o700});
if (!existsSync(root+'credentials.json')) writeFileSync(root+'credentials.json', JSON.stringify({admin:randomBytes(32).toString('hex'),hook:randomBytes(32).toString('hex')}), {mode:0o600});
const keys = JSON.parse(readFileSync(root+'credentials.json','utf8'));
const afterHoursUntil = Date.parse(process.env.PULSE_AFTER_HOURS_UNTIL || '');
const afterHoursTest = () => Number.isFinite(afterHoursUntil) && Date.now() < afterHoursUntil;
const db = new DatabaseSync(root+'pulse.sqlite');
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY, zone_id TEXT NOT NULL, at INTEGER NOT NULL, body TEXT NOT NULL, image BLOB); CREATE TABLE IF NOT EXISTS health(tf INTEGER PRIMARY KEY, at INTEGER NOT NULL);');
db.exec('CREATE TABLE IF NOT EXISTS snapshots(tf INTEGER PRIMARY KEY, at INTEGER NOT NULL, body TEXT NOT NULL);');
const clients = new Set();
const equal = (a,b) => typeof a==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
const json = (res,status,data) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const allPosts = () => db.prepare('SELECT body FROM posts ORDER BY at,rowid').all().map(r=>JSON.parse(r.body));
const snapshot = () => ({posts:allPosts().slice(-100),receivedAt:db.prepare('SELECT MAX(at) AS at FROM posts').get().at,indicatorAt:Object.fromEntries(db.prepare('SELECT tf,at FROM health').all().map(r=>[r.tf,r.at])),sessionOpen:pulseWindowOpen(Date.now()),afterHoursTestUntil:Number.isFinite(afterHoursUntil)?afterHoursUntil:null,quotes:Object.fromEntries(db.prepare('SELECT tf,body FROM snapshots').all().map(r=>{const s=JSON.parse(r.body);return [r.tf,{price:s.price,at:s.at,zones:s.zones}];}))});
const broadcast = () => {const data='event: feed\ndata: '+JSON.stringify(snapshot())+'\n\n'; for(const res of clients)res.write(data);};
async function body(req,max=6*1024*1024) {let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw new Error('Payload too large');chunks.push(chunk);}return Buffer.concat(chunks);}
function insert(input, review=false, image, verifiedBars, verifiedClosedAt) {
  const now=Date.now();
  const p=validatePulsePost(input,now,review);
  const old=allPosts();
  const next=appendPulsePost(old,p);
  if(next===old)return false;
  const validImage = image && (image.subarray(0,8).toString('hex')==='89504e470d0a1a0a' || image.subarray(0,3).toString('hex')==='ffd8ff');
  if(review && !verifiedBars && (!validImage || image.length>4*1024*1024))throw new Error('Original PNG or JPEG required');
  if(verifiedBars)p.bars=verifiedBars;
  if(verifiedClosedAt)p.closedAt=verifiedClosedAt;
  if(image){p.chartUrl='/api/spx-pulse/image/'+p.id;p.capturedAt=p.at;}
  db.prepare('INSERT INTO posts(id,zone_id,at,body,image) VALUES(?,?,?,?,?)').run(p.id,p.zoneId,p.at,JSON.stringify(p),image||null);
  if(p.source==='indicator')db.prepare('INSERT INTO health(tf,at) VALUES(?,?) ON CONFLICT(tf) DO UPDATE SET at=excluded.at WHERE excluded.at>at').run(p.timeframe,p.at);
  broadcast();return true;
}
const admin=createServer(async(req,res)=>{
  if(!equal(req.headers.authorization,'Bearer '+keys.admin)){json(res,401,{error:'Unauthorized'});return;}
  try{
    if(req.method==='GET'&&req.url==='/feed'){json(res,200,snapshot());return;}
    if(req.method==='GET'&&req.url==='/stream'){
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});
      res.write('event: feed\ndata: '+JSON.stringify(snapshot())+'\n\n');clients.add(res);
      req.on('close',()=>clients.delete(res));return;
    }
    if(req.method==='GET'&&/^\/image\/[a-zA-Z0-9:_-]{1,160}$/.test(req.url||'')){
      const row=db.prepare('SELECT image FROM posts WHERE id=?').get(req.url.slice(7));
      if(!row?.image){json(res,404,{error:'Missing capture'});return;}
      res.writeHead(200,{'Content-Type':Buffer.from(row.image).subarray(0,3).toString('hex')==='ffd8ff'?'image/jpeg':'image/png','Cache-Control':'private,max-age=3600','X-Content-Type-Options':'nosniff'});res.end(row.image);return;
    }
    if(req.method==='POST'&&req.url==='/observation'){
      const input=JSON.parse(await body(req));
      if(input.source!=='chart-review')throw new Error('Use chart-review source');
      if(input.useLatestSnapshot){
        const row=db.prepare('SELECT body FROM snapshots WHERE tf=?').get(input.timeframe);
        if(!row)throw new Error('Indicator snapshot missing');
        const s=validatePulseSnapshot(JSON.parse(row.body),Date.now(),afterHoursTest());
        if(input.kind!=='broken')throw new Error('Only verified catch-up breaks are supported');
        const original=allPosts().filter(p=>p.zoneId===input.zoneId && p.source==='chart-review' && p.levelsSource==='indicator-labels').at(-1);
        if(!original || original.timeframe!==s.timeframe)throw new Error('Reviewed zone missing');
        const closed=s.bars.find(b=>b.t<s.barAt && b.t+s.timeframe*60000>original.at && (original.side==='supply' ? b.c>original.upper : b.c<original.lower));
        if(!closed)throw new Error('Confirmed break missing');
        const post={...original,id:input.id,kind:'broken',at:s.at,confirmed:true,price:closed.c,summary:`${s.timeframe}m ${original.side} broke. Closed ${original.side==='supply'?'above':'below'} ${(original.side==='supply'?original.upper:original.lower).toLocaleString('en-US')}.`};
        json(res,200,{saved:insert(post,true,undefined,s.bars,closed.t+s.timeframe*60000)});return;
      }
      json(res,200,{saved:insert(input,true,Buffer.from(input.image||'','base64'))});return;
    }
    json(res,404,{error:'Not found'});
  }catch(error){json(res,400,{error:error.message});}
});
function ingestSnapshot(input) {
  const now=Date.now();
  const s=validatePulseSnapshot(input,now,afterHoursTest());
  const last=db.prepare('SELECT at FROM snapshots WHERE tf=?').get(s.timeframe);
  if(last && s.at<=last.at)return {accepted:false,posts:0};
  const previous=allPosts();
  const next=postsFromSnapshot(previous,s,now,afterHoursTest());
  const additions=next.slice(previous.length);
  db.exec('BEGIN');
  try {
    for(const p of additions)db.prepare('INSERT INTO posts(id,zone_id,at,body) VALUES(?,?,?,?)').run(p.id,p.zoneId,p.at,JSON.stringify(p));
    db.prepare('INSERT INTO snapshots(tf,at,body) VALUES(?,?,?) ON CONFLICT(tf) DO UPDATE SET at=excluded.at,body=excluded.body').run(s.timeframe,s.at,JSON.stringify(s));
    db.prepare('INSERT INTO health(tf,at) VALUES(?,?) ON CONFLICT(tf) DO UPDATE SET at=excluded.at').run(s.timeframe,s.at);
    db.exec('COMMIT');
  } catch(error) {db.exec('ROLLBACK');throw error;}
  broadcast();
  return {accepted:true,posts:additions.length};
}
// A tunnel may expose this authenticated ingestion port only. Administration stays local.
const ingress=createServer(async(req,res)=>{
  if(req.method!=='POST'||!equal(req.url,'/webhook/'+keys.hook)){json(res,404,{error:'Not found'});return;}
  try{
    const input=JSON.parse(await body(req,32768));
    if(input.source!=='indicator')throw new Error('Indicator source required');
    if(input.kind==='snapshot'){json(res,202,ingestSnapshot(input));return;}
    if(input.kind==='heartbeat'){
      const now=Date.now();
      if(input.symbol!==PULSE_SYMBOL || ![5,15].includes(input.timeframe) || !Number.isFinite(input.at) || now-input.at>60000 || input.at>now+5000 || !pulseWindowOpen(now) || !pulseWindowOpen(input.at))throw new Error('Invalid heartbeat');
      db.prepare('INSERT INTO health(tf,at) VALUES(?,?) ON CONFLICT(tf) DO UPDATE SET at=excluded.at WHERE excluded.at>at').run(input.timeframe,input.at);broadcast();json(res,202,{accepted:true});return;
    }
    json(res,202,{accepted:insert(input)});
  }catch(error){json(res,400,{error:error.message});}
});
const heartbeat=setInterval(()=>{for(const res of clients)res.write(': receiver '+Date.now()+'\n\n');},15000);
for(const server of [admin,ingress]){server.requestTimeout=10000;server.headersTimeout=5000;server.maxConnections=30;}
admin.listen(4191,'127.0.0.1',()=>console.log('SPX500 private feed ready on loopback:4191'));
ingress.listen(4192,'127.0.0.1',()=>console.log('SPX500 local indicator ingress ready on loopback:4192'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(heartbeat);for(const res of clients)res.end();admin.close();ingress.close();db.close();process.exit(0);});
