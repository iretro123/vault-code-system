// Isolated typography checks. All backend responses are fixtures; no live writes.
const {chromium,webkit}=require('/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out='/tmp/vault-community-type';fs.mkdirSync(out,{recursive:true});
const env=['.env','.env.local'].filter(p=>fs.existsSync(path.join(root,p))).map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
const host=new URL(env.match(/VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/)[1]).hostname;
const id='00000000-0000-4000-a000-000000000001';
const user={id,email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const profile={id,user_id:id,display_name:'Alexandria Long Member Name',onboarding_completed:true,initialized_at:'2026-01-01',access_status:'active',role_level:'Member',academy_experience:'beginner',intro_posted:true,first_lesson_started:true};
const role={role:'vault_access',subscription_status:'active'};
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+86400})).toString('base64url')+'.synthetic';
const sizes=[['small',320,568],['iphone-se',375,667],['iphone-pro',393,852],['android',412,915],['tablet',768,1024],['desktop',1440,900],['landscape',852,393]];
const results=[];
(async()=>{
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(engine==='chromium'?{channel:'chrome'}:{})});
 try{for(const [device,width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:width<1024,serviceWorkers:'block'});
  await context.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());
   if(u.hostname===host){
    let body=[];
    if(u.pathname.includes('/auth/v1/user'))body=user;
    else if(u.pathname.includes('/rpc/get_community_profiles'))body=[profile];
    else if(u.pathname.includes('/rest/v1/profiles'))body=r.headers().accept?.includes('object')?profile:[profile];
    else if(u.pathname.includes('/rest/v1/user_roles'))body=[role];
    else if(u.pathname.includes('/rest/v1/academy_user_roles'))body=null;
    else if(u.pathname.includes('/rest/v1/academy_messages')){
     const room=(u.searchParams.get('room_slug')||'eq.trade-floor').replace('eq.','');
     body=[{id:'00000000-0000-4000-a000-000000000010',room_slug:room,user_id:id,user_name:profile.display_name,user_role:'Member',body:room==='wins-proof'?'Ticker: SPY\nEntry: 550.25\nExit: 551.20\nRisk: Planned before entry\nLesson: Waited for confirmation and followed my plan.': 'Practice example: I waited for price to return to the level before reviewing the setup. What would invalidate the idea?\nhttps://example.invalid/a-very-long-chart-reference-that-must-wrap-without-clipping-the-message-or-pushing-controls-away',attachments:room==='daily-setups'?[{type:'signal-watchlist',ticker:'AAPL',bias:'neutral',levels:'Previous high 230.50 · support 226.25',notes:'Illustrative example only. Wait for confirmation rather than chasing the first move.'}]:[],created_at:'2026-09-17T13:15:00Z',edited_at:'2026-09-17T13:17:00Z',edit_count:1,is_deleted:false,parent_message_id:null,reply_count:0}];
    }else if(r.headers().accept?.includes('object'))body=null;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   }
   if(u.hostname!=='127.0.0.1')return route.abort();
   return route.continue();
  });
  await context.addInitScript(({host,user,profile,role,token})=>{
   localStorage.setItem('sb-'+host.split('.')[0]+'-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,token_type:'bearer',user}));
   localStorage.setItem('va_cache_profile',JSON.stringify(profile));localStorage.setItem('va_cache_role',JSON.stringify(role));
  },{host,user,profile,role,token});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4175/academy/community');
  await page.locator('.community-message').first().waitFor();
  for(const tab of ['Chat','Signals','Wins']){
   await page.locator('.community-room-tabs').getByRole('button',{name:tab,exact:true}).click();
   await page.locator('.community-room:not([hidden]) .community-message').first().waitFor({state:'attached'});
   await page.waitForTimeout(350);
   const metrics=await page.evaluate(()=>{
    const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
    const selectors=['.community-message-body','.community-message-meta>button','.community-message-time','.community-message-edited','.vault-signal-card p','.community-trade-card p','.community-room-tabs button','textarea'];
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,rows:selectors.flatMap(s=>[...document.querySelectorAll(s)].filter(visible).map(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return {selector:s,font:c.fontSize,line:c.lineHeight,color:c.color,clipped:r.left<0||r.right>innerWidth+1};})),composer:[...document.querySelectorAll('textarea')].filter(visible).map(e=>({bottom:e.getBoundingClientRect().bottom,viewport:innerHeight}))};
   });
   const scrolling=await page.locator('.vault-chat-scroll').evaluateAll(nodes=>nodes.filter(e=>e.getBoundingClientRect().width>0).map(e=>{const max=e.scrollHeight-e.clientHeight;e.scrollTop=0;const top=e.scrollTop;e.scrollTop=max;const bottom=e.scrollTop;return {max,top,bottom,reachable:Math.abs(bottom-max)<2};}));
   metrics.scrolling=scrolling;
   await page.locator('.vault-chat-scroll').evaluateAll(nodes=>nodes.forEach(e=>{e.scrollTop=0;}));
   await page.screenshot({path:path.join(out,`${engine}-${device}-${tab}.png`)});
   results.push({engine,device,tab,...metrics,errors:[...errors]});
  }
  await context.close();
 }}finally{await browser.close();}
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
const failures=results.filter(r=>r.overflow||r.rows.some(x=>x.clipped)||r.scrolling.some(x=>!x.reachable)||r.errors.length||!r.rows.some(x=>['.community-message-body','.vault-signal-card p','.community-trade-card p'].includes(x.selector)));
console.log(JSON.stringify({cases:results.length,failures,output:out},null,2));
process.exitCode=failures.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
