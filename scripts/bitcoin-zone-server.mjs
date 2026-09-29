import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { appendBitcoinZone } from '../src/lib/bitcoinZones.ts';

const root = fileURLToPath(new URL('../.vault-zones-state/', import.meta.url));
mkdirSync(root,{recursive:true,mode:0o700});
const secretFile = root+'credentials.json';
if (!existsSync(secretFile)) writeFileSync(secretFile,JSON.stringify({hook:randomBytes(32).toString('hex'),admin:randomBytes(32).toString('hex')}),{mode:0o600});
const keys=JSON.parse(readFileSync(secretFile,'utf8'));
const db=new DatabaseSync(root+'zones.sqlite');
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, zone_id TEXT NOT NULL, at INTEGER NOT NULL, body TEXT NOT NULL, capture TEXT NOT NULL DEFAULT \'pending\', image BLOB, captured_at INTEGER); CREATE INDEX IF NOT EXISTS zone_events ON events(zone_id,at);');
const equal=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const reply=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
async function body(req,max=8192){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>max)throw new Error('Too large');chunks.push(c);}return Buffer.concat(chunks);}
// Public listener exposes ONLY the authenticated webhook. Never tunnel port 4181.
const ingress=createServer(async(req,res)=>{
  if(req.method!=='POST'||!equal(req.url,'/webhook/'+keys.hook)){reply(res,404,{error:'Not found'});return;}
  try{
    const event=JSON.parse(await body(req));
    if(Math.abs(Date.now()-event.at)>300000)throw new Error('Stale');
    db.exec('BEGIN IMMEDIATE');
    try{
      const history=db.prepare('SELECT body FROM events WHERE zone_id=? ORDER BY at,rowid').all(event.zoneId).map(r=>JSON.parse(r.body));
      const next=appendBitcoinZone(history,event);
      if(next!==history)db.prepare('INSERT OR IGNORE INTO events(id,zone_id,at,body) VALUES(?,?,?,?)').run(event.id,event.zoneId,event.at,JSON.stringify(next.at(-1)));
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    reply(res,202,{accepted:true});
  }catch{reply(res,400,{error:'Rejected event'});}
});
ingress.requestTimeout=5000; ingress.headersTimeout=5000;
const admin=createServer(async(req,res)=>{
  if(!equal(req.headers.authorization,'Bearer '+keys.admin)){reply(res,401,{error:'Unauthorized'});return;}
  try{
    // Local authenticated visual-review test. No prices inferred from screenshot pixels.
    if(req.method==='POST'&&req.url==='/observation'){
      const e=JSON.parse(await body(req,6*1024*1024));
      if(e.symbol!=='COINBASE:BTCUSD'||![5,15].includes(e.timeframe)||!["demand","supply"].includes(e.side)||typeof e.summary!=='string'||e.summary.length>300||!Number.isFinite(e.at)||Math.abs(Date.now()-e.at)>300000||!/^visual-[a-z0-9-]{1,100}$/.test(e.id))throw new Error('Invalid observation');
      const png=Buffer.from(e.image,'base64');
      if(png.length>4*1024*1024||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Invalid image');
      let zoneId=e.id;
      if(e.zoneId){
        const anchor=db.prepare('SELECT body FROM events WHERE id=?').get(e.zoneId);
        if(!anchor)throw new Error('Missing original chart');
        const original=JSON.parse(anchor.body);
        if(original.symbol!==e.symbol||original.timeframe!==e.timeframe||original.side!==e.side)throw new Error('Wrong setup');
        zoneId=original.zoneId;
      }
      const post={id:e.id,zoneId,symbol:e.symbol,timeframe:e.timeframe,side:e.side,kind:'observed',source:'visual-review',summary:e.summary,at:e.at,confirmed:false,trend:'unknown'};
      const result=db.prepare("INSERT OR IGNORE INTO events(id,zone_id,at,body,capture,image,captured_at) VALUES(?,?,?,?,'ready',?,?)").run(e.id,zoneId,e.at,JSON.stringify(post),png,e.at);
      reply(res,200,{saved:!!result.changes});return;
    }
    if(req.method==='GET'&&req.url==='/feed'){
      const rows=db.prepare('SELECT id,body,capture,captured_at FROM events ORDER BY at DESC,rowid DESC LIMIT 200').all().reverse();
      reply(res,200,{connected:rows.length>0,receiverConfigured:true,posts:rows.map(r=>({...JSON.parse(r.body),captureStatus:r.capture,capturedAt:r.captured_at,...(r.capture==='ready'?{chartUrl:'/api/bitcoin-zones/image/'+encodeURIComponent(r.id)}:{})}))});return;
    }
    if(req.method==='GET'&&req.url==='/jobs'){
      reply(res,200,db.prepare("SELECT body FROM events WHERE capture='pending' ORDER BY at LIMIT 10").all().map(r=>JSON.parse(r.body)));return;
    }
    if(req.method==='GET'&&req.url?.startsWith('/image/')){
      const row=db.prepare('SELECT image FROM events WHERE id=?').get(decodeURIComponent(req.url.slice(7)));
      if(!row?.image){reply(res,404,{error:'Missing capture'});return;}
      res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'});res.end(row.image);return;
    }
    if(req.method==='POST'&&req.url?.startsWith('/capture/')){
      const id=decodeURIComponent(req.url.slice(9));
      const image=await body(req,4*1024*1024);
      if(image.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Not PNG');
      const changed=db.prepare("UPDATE events SET image=?,capture='ready',captured_at=? WHERE id=? AND capture='pending'").run(image,Date.now(),id);
      reply(res,changed.changes?200:404,{saved:!!changed.changes});return;
    }
    if(req.method==='POST'&&req.url?.startsWith('/failed/')){
      db.prepare("UPDATE events SET capture='failed' WHERE id=? AND capture='pending'").run(decodeURIComponent(req.url.slice(8)));
      reply(res,200,{saved:true});return;
    }
    reply(res,404,{error:'Not found'});
  }catch{reply(res,400,{error:'Request failed'});}
});
admin.requestTimeout=10000; admin.headersTimeout=5000;
ingress.listen(4180,'127.0.0.1',()=>console.log('Bitcoin webhook listening on 4180; production posting disabled'));
admin.listen(4181,'127.0.0.1',()=>console.log('Private feed/capture API listening on 4181'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{ingress.close();admin.close();db.close();process.exit(0);});
