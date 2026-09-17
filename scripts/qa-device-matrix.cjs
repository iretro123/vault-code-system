// Isolated browser QA: synthetic member + intercepted backend. Never sends live writes.
const { chromium } = require('/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = process.env.QA_OUT || '/tmp/vault-device-qa';
fs.mkdirSync(out, { recursive: true });
const env = ['.env','.env.local'].filter(p=>fs.existsSync(path.join(root,p))).map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
const host = new URL(env.match(/VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/)[1]).hostname;
const id = '00000000-0000-4000-a000-000000000001';
const user = { id, email:'qa@example.invalid', aud:'authenticated', role:'authenticated', app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z' };
const profile = {id,user_id:id,email:user.email,display_name:'QA Student',onboarding_completed:true,initialized_at:'2026-01-01',access_status:'active',timezone:'America/New_York',role_level:'Member',academy_experience:'beginner',intro_posted:true,first_lesson_started:true};
const role = {role:'vault_access',subscription_status:'active'};
const token = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+86400})).toString('base64url')+'.synthetic';
const routes = ['home','live','learn','setup','trade','support','settings?section=profile','settings?section=trading','settings?section=help','community', ...(process.env.QA_NAV==='1'?['bootcamp','resources','profile','my-questions','journal','progress','playbook','learn/missing-qa-course','room/missing-qa-room','settings?section=account','settings?section=notifications','settings?section=privacy','settings?section=security','settings?section=missing']:[])];
const sizes = [ ['iphone-se',375,667],['iphone-small',320,568],['iphone-pro',393,852],['android',412,915],['tablet',768,1024],['desktop',1440,900] ];
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
for(const [device,width,height] of sizes){
 if(process.env.QA_DEVICE && device!==process.env.QA_DEVICE) continue;
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
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});return;
   }
   if(!['GET','HEAD','OPTIONS'].includes(r.method())) return route.abort();
   await route.continue();
 });
 await context.addInitScript(({host,user,profile,role,token})=>{
   localStorage.setItem('sb-'+host.split('.')[0]+'-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,token_type:'bearer',user}));
   localStorage.setItem('va_cache_profile',JSON.stringify(profile));localStorage.setItem('va_cache_role',JSON.stringify(role));
 },{host,user,profile,role,token});
 const page=await context.newPage();
 page.setDefaultTimeout(5000);
 if(process.env.QA_ROUTE && !routes.includes(process.env.QA_ROUTE)) routes.push(process.env.QA_ROUTE);
 for(const route of routes){
   if(process.env.QA_ROUTE && route!==process.env.QA_ROUTE) continue;
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
   const interactions=[];
   if(process.env.QA_SCROLL==='1'){
     const scroller=page.locator('main.academy-main-safe').first();
     const dimensions=await scroller.evaluate(el=>({height:el.clientHeight,max:el.scrollHeight-el.clientHeight}));
     if(dimensions.max>5){
       await scroller.hover();await page.mouse.wheel(0,500);
       await page.waitForTimeout(250);
       const moved=await scroller.evaluate(el=>el.scrollTop);
       if(moved<=0)errors.push('Wheel failed to scroll main content');
       await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight;});
       const bottom=await scroller.evaluate(el=>Math.abs(el.scrollTop-(el.scrollHeight-el.clientHeight))<2);
       if(!bottom)errors.push('Cannot reach main content bottom');
       await page.mouse.wheel(0,-500);await page.waitForTimeout(250);
       const returned=await scroller.evaluate(el=>el.scrollTop<el.scrollHeight-el.clientHeight);
       if(!returned)errors.push('Cannot scroll back up');
       interactions.push(`Wheel moved ${Math.round(moved)}px; bottom reachable: ${bottom}; reverse works: ${returned}`);
     }
   }
   if(process.env.QA_NAV==='1'){
     try{
       const home=page.getByRole('link',{name:'VaultAcademy',exact:true});
       await home.click();
       await page.waitForURL('**/academy/home');
       if(route!=='home') await page.goBack();
       await page.waitForTimeout(300);
       if(!page.url().includes('/academy/')) throw Error('Back left Academy');
       interactions.push('Visible home exit and browser Back');
       const menu=page.getByRole('button',{name:'Menu',exact:true});
       if(await menu.isVisible()){
         await menu.click();
         await page.waitForTimeout(300);
         await page.keyboard.press('Escape');
         await page.getByRole('dialog').waitFor({state:'hidden'});
         interactions.push('Mobile menu opens and Escape releases it');
       }
       if(route==='community'){
         const composer=page.getByRole('textbox',{name:'Message this room'});
         await composer.fill('Backspace test');await composer.press('Backspace');
         if(await composer.inputValue()!=='Backspace tes')throw Error('Backspace did not edit draft');
         await composer.fill('');
         for(const label of ['Signals','Wins','Chat'])await page.getByRole('button',{name:label,exact:true}).first().click();
         await page.getByRole('button',{name:'Stocks to watch',exact:true}).click();
         await page.waitForTimeout(300);
         await page.keyboard.press('Escape');
         await page.getByRole('dialog').waitFor({state:'hidden'});
         interactions.push('Backspace edits only; all tabs return; stock dialog Escape closes');
       }
       if(route==='live'){
         await page.getByRole('button',{name:'Open trading room',exact:true}).click();
         await page.waitForTimeout(300);
         await page.keyboard.press('Escape');
         await page.getByRole('dialog').waitFor({state:'hidden'});
         interactions.push('Classroom Escape closes');
       }
     }catch(e){errors.push('Navigation: '+e.message);}
   }
   if(process.env.QA_FLOWS==='1'){
     try {
       if(route==='live'){
         await page.getByRole('button',{name:'Open trading room',exact:true}).click();
         await page.getByRole('button',{name:'Back to Vault Live',exact:true}).click();
         await page.getByRole('tab',{name:'Wednesday Class',exact:true}).click();
         await page.getByRole('button',{name:'Open training room',exact:true}).click();
         if(!await page.getByRole('button',{name:'Invite friends',exact:true}).isVisible()) throw Error('Wednesday invite missing');
         await page.waitForTimeout(300);
         await page.screenshot({path:path.join(out,name+'-room.png')});
         await page.getByRole('button',{name:'Back to Vault Live',exact:true}).click();
         interactions.push('Both classrooms open and return; Wednesday invite visible');
       }
       if(route==='trade'){
         await page.locator('#daily-balance').fill('1000');
         await page.locator('#daily-percent').fill('1');
         if(!(await page.getByRole('region',{name:'Your planned daily stopping point'}).innerText()).includes('$10')) throw Error('Incorrect $1000 / 1% result');
         await page.getByRole('tab',{name:'Prop account',exact:true}).click();
         if(await page.locator('#daily-balance').inputValue()!=='') throw Error('Account switch retained previous balance');
         interactions.push('Daily limit $1000 at 1% = $10; switching account clears amount');
       }
       if(route==='community'){
         for(const name of ['Signals','Wins','Chat']) await page.getByRole('button',{name,exact:true}).first().click();
         const composer=page.getByRole('textbox',{name:'Message this room'});
         await composer.fill('Local QA draft only. Never submitted. '.repeat(10));
         await page.screenshot({path:path.join(out,name+'-draft.png')});
         await composer.fill('');
         interactions.push('Three community tabs; long multiline draft typed and cleared without submission');
       }
       await page.evaluate(()=>{document.querySelectorAll('main, [data-radix-scroll-area-viewport]').forEach(e=>{if(e.scrollHeight>e.clientHeight)e.scrollTop=e.scrollHeight;});window.scrollTo(0,document.body.scrollHeight);});
       await page.screenshot({path:path.join(out,name+'-bottom.png')});
     } catch(e) { errors.push('Interaction: '+e.message); }
   }
   results.push({device,width,height,route,...details,interactions,errors});page.off('pageerror',listener);
   console.log(JSON.stringify({device,route,title:details.title,overflow:details.overflow,clipped:details.clipped,errors}));
 }
 await context.close();
}
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
})();
