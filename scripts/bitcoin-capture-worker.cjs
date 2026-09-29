// One dedicated authenticated chart browser; no reuse/copy of personal browser cookies.
// This process never posts to the member database or sends push notifications.
const {chromium}=require('/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const state=path.resolve(__dirname,'../.vault-zones-state');
const {admin}=JSON.parse(fs.readFileSync(path.join(state,'credentials.json'),'utf8'));
const headers={Authorization:'Bearer '+admin};
const api=async(route,options={})=>{
  const r=await fetch('http://127.0.0.1:4181'+route,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('Capture service HTTP '+r.status);
  return r;
};
(async()=>{
  const browser=await chromium.launchPersistentContext(path.join(state,'capture-browser'),{channel:'chrome',headless:false,viewport:{width:1440,height:1000}});
  let page=browser.pages()[0]||await browser.newPage();
  await page.goto('https://www.tradingview.com/chart/Uvf4q57J/',{waitUntil:'domcontentloaded'});
  console.log('Capture browser open. Sign in and apply Vault Bitcoin Zones TEST to BTCUSD 5m and 15m charts.');
  while(true){
    try{
      const jobs=await (await api('/jobs')).json();
      for(const job of jobs){
        try{
          if(Date.now()-job.at>60000)throw new Error('Event too old for an honest current-chart capture');
          // Select a chart that is already configured. Never screenshot a wrong symbol or timeframe.
          let selected;
          for(const candidate of browser.pages()){
            const chart=candidate.getByRole('img',{name:'Chart for COINBASE:BTCUSD, '+job.timeframe+' minutes',exact:true});
            if(await chart.count()===1 && await candidate.getByText('Vault Bitcoin Zones TEST',{exact:true}).count()>0){selected=chart;break;}
          }
          if(!selected)throw new Error('Matching authenticated indicator chart not available');
          const png=await selected.screenshot({type:'png',timeout:10000});
          await api('/capture/'+encodeURIComponent(job.id),{method:'POST',headers:{'Content-Type':'image/png'},body:png});
          console.log('Captured event '+job.id);
        }catch(error){
          console.log('Capture held: '+error.message);
          // Leave fresh jobs pending for chart setup/retry, then explicitly fail stale captures.
          if(Date.now()-job.at>60000)await api('/failed/'+encodeURIComponent(job.id),{method:'POST'});
        }
      }
    }catch(error){console.log('Capture service unavailable: '+error.message);}
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
