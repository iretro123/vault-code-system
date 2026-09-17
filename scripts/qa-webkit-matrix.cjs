// Isolated browser QA: synthetic member + intercepted backend. Never sends live writes.
const { webkit } = require('/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = process.env.QA_OUT || '/tmp/vault-webkit-qa';
fs.mkdirSync(out, { recursive: true });
const env = ['.env','.env.local'].filter(p=>fs.existsSync(path.join(root,p))).map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
const host = new URL(env.match(/VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/)[1]).hostname;
const id = '00000000-0000-4000-a000-000000000001';
const user = { id, email:'qa@example.invalid', aud:'authenticated', role:'authenticated', app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z' };
const profile = {id,user_id:id,email:user.email,display_name:'QA Student',onboarding_completed:true,initialized_at:'2026-01-01',access_status:'active',timezone:'America/New_York',role_level:'Member',academy_experience:'beginner',intro_posted:true,first_lesson_started:true};
const role = {role:'vault_access',subscription_status:'active'};
const token = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+86400})).toString('base64url')+'.synthetic';
const routes = ['home','live','learn','setup','trade','support','settings?section=profile','settings?section=trading','settings?section=help','community'];
const sizes = [ ['iphone-se',375,667],['iphone-pro',393,852],['tablet',768,1024],['landscape',852,393] ];
(async()=>{
const browser=await webkit.launch({headless:true});
const results=[];
try {
for(const [device,width,height] of sizes){
 if(process.env.QA_DEVICE && process.env.QA_DEVICE!==device) continue;
 const context=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:width<1024,serviceWorkers:'block'});
 await context.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());
   if(u.hostname===host){
     let body=[];
     if(u.pathname.includes('/auth/v1/user')) body=user;
     else if(u.pathname.includes('/rest/v1/profiles')) body=r.headers().accept?.includes('object')?profile:[profile];
     else if(u.pathname.includes('/rest/v1/user_roles')) body=[role];
     else if(u.pathname.includes('/rest/v1/academy_user_roles')) body=null;
     else if(r.headers().accept?.includes('object')) body=null;
     await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'http://127.0.0.1:4175','access-control-allow-headers':r.headers()['access-control-request-headers']||'*','access-control-allow-methods':'GET,POST,OPTIONS'},body:JSON.stringify(body)});return;
   }
   if(!['GET','HEAD','OPTIONS'].includes(r.method())) return route.abort();
   await route.continue();
 });
 await context.addInitScript(({host,user,profile,role,token})=>{
   localStorage.setItem('sb-'+host.split('.')[0]+'-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,token_type:'bearer',user}));
   localStorage.setItem('va_cache_profile',JSON.stringify(profile));localStorage.setItem('va_cache_role',JSON.stringify(role));
 },{host,user,profile,role,token});
 const page=await context.newPage();
 for(const route of routes){
   if(process.env.QA_ROUTE && process.env.QA_ROUTE!==route) continue;
   const errors=[];const listener=e=>errors.push(e.message);page.on('pageerror',listener);
   await page.goto('http://127.0.0.1:4175/academy/'+route,{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(1100);
   const details=await page.evaluate(()=>({url:location.pathname+location.search,title:document.querySelector('h1')?.textContent,
     overflow:document.documentElement.scrollWidth>innerWidth+1,
     clipped:[...document.querySelectorAll('main button,main a,main input,main h1,main h2,main p')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&(r.left < -2 || r.right>innerWidth+2)}).slice(0,8).map(e=>({text:e.textContent?.slice(0,70),tag:e.tagName,width:e.getBoundingClientRect().width})),
     missingNames:[...document.querySelectorAll('button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.textContent?.trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('title')}).length,
     body:document.body.innerText.slice(0,160),
   }));
   const name=device+'-'+route.replace(/[^a-z0-9]/gi,'-');
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});
   results.push({device,width,height,route,...details,errors});page.off('pageerror',listener);
   console.log(JSON.stringify({device,route,title:details.title,overflow:details.overflow,clipped:details.clipped,errors}));
 }
 await context.close();
}
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
})();
