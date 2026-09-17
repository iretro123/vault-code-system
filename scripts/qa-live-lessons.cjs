// Read-only authenticated course/player inspection. Credentials stay in env.
const fs = require('node:fs');
const {chromium} = require('/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const env = fs.readFileSync('.env', 'utf8');
  const val = key => env.match(new RegExp(key + '\\s*=\\s*["\']?([^\\s"\']+)'))?.[1];
  const base = val('VITE_SUPABASE_URL'), key = val('VITE_SUPABASE_PUBLISHABLE_KEY');
  const response = await fetch(base+'/auth/v1/token?grant_type=password', {method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:process.env.QA_EMAIL,password:process.env.QA_PASSWORD})});
  if(!response.ok) throw Error('Test login failed: '+response.status);
  const session = await response.json();
  const lessons = await (await fetch(base+'/rest/v1/academy_lessons?select=id,module_slug,lesson_title,video_url&visible=eq.true&order=module_slug,sort_order', {headers:{apikey:key,Authorization:'Bearer '+session.access_token}})).json();
  if(!Array.isArray(lessons))throw Error('Lesson read failed');
  console.log(JSON.stringify({lessonCount:lessons.length,linked:lessons.filter(l=>l.video_url).length}));
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const context = await browser.newContext({viewport:process.env.QA_MOBILE?{width:390,height:844}:{width:1440,height:900}});
    await context.addInitScript(({base,session}) => localStorage.setItem('sb-'+new URL(base).hostname.split('.')[0]+'-auth-token',JSON.stringify(session)),{base,session});
    const targets=process.env.QA_IDS?lessons.filter(l=>process.env.QA_IDS.split(',').includes(l.id)):process.env.QA_ALL?lessons.filter(l=>l.video_url):['chapter-1-vault-install-start-march-21st-release','chapter-1-basic-bridge','risk-management','trading-psychology'].map(slug=>lessons.find(l=>l.module_slug===slug&&l.video_url)).filter(Boolean);
    for(let start=0;start<targets.length;start+=3)await Promise.all(targets.slice(start,start+3).map(async lesson=>{
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      const slug=lesson.module_slug;
      try {
      await page.goto('http://127.0.0.1:4175/academy/learn/'+slug+'?lesson='+lesson.id,{waitUntil:'domcontentloaded'});
      await page.locator('iframe').first().waitFor({state:'visible',timeout:20000}).catch(()=>{});
      await page.waitForTimeout(1500);
      const frame=page.frames().find(f=>f.url().includes('youtube-nocookie'));
      if(frame){
        const play=frame.getByRole('button',{name:/^Play( video)?$/}).first();
        await play.click({timeout:3000}).catch(e=>console.log(JSON.stringify({clickError:e.message.slice(0,300),buttons:'play unavailable'})));
        await frame.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>!v.paused&&v.currentTime>0&&v.readyState>=2),null,{timeout:12000}).catch(()=>{});
        console.log(JSON.stringify({slug,id:lesson.id,lesson:lesson.lesson_title,playerText:(await frame.locator('body').innerText().catch(()=>'')).slice(0,500),video:await frame.locator('video').evaluateAll(vs=>vs.map(v=>({paused:v.paused,time:v.currentTime,ready:v.readyState,error:v.error?.code}))),bounds:await page.locator('iframe').first().boundingBox()}));
      } else console.log(JSON.stringify({slug,id:lesson.id,error:'No YouTube frame',body:(await page.locator('body').innerText()).slice(-400)}));
      } catch(e){console.log(JSON.stringify({slug,id:lesson.id,error:e.message.slice(0,300)}));} finally{await page.close();}
    }));
  } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
