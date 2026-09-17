import {createScenario} from '@/components/academy/atlas/atlasScenarios';
export type StudyCandle={open:number;high:number;low:number;close:number};
export type StudyMark={kind:'zone'|'level';first:number;last:number;high:number;low:number;label:string};
export const STUDY_TIME_ZONE='America/New_York';
export function studyDay(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:STUDY_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const dayIndex=(day:string)=>Math.floor(Date.parse(`${day}T00:00:00Z`)/86400000);
const mod=(n:number,m:number)=>(n%m+m)%m;
const fromCloses=(closes:number[]):StudyCandle[]=>closes.map((close,i)=>{const open=i?closes[i-1]:close-.5;return {open,close,high:Math.max(open,close)+.2,low:Math.min(open,close)-.2};});
export function dailyChartStudy(day:string){
  const serial=dayIndex(day),slot=mod(serial,10),cycle=Math.floor(serial/10);
  let topic='',question='',hint='',answer='',candles:StudyCandle[]=[],marks:StudyMark[]=[];
  if(slot===0||slot===1||slot===9){
    const failed=slot===9,supply=slot===1;
    const s=createScenario('demand',Math.abs(cycle)*2+(failed?1:0));
    candles=s.candles;
    const b=s.base!;
    marks=[{kind:'zone',first:b.first,last:candles.length-1,high:b.high,low:b.low,label:failed?'Failed demand':supply?'Supply base':'Demand base'}];
    topic=failed?'Invalidation':supply?'Supply':'Demand';
    question=failed?'When does this demand idea fail?':supply?'Where would you look for supply?':'Where would you look for demand?';
    hint=failed?'Follow the return. Look for a close below the base.':'Find the small base before the strong move away.';
    answer=failed?'The return closes below the base. A drawn zone is not a guarantee; the original demand idea no longer holds in this example.':supply?'The marked base comes before the selloff. It is an area to watch on a return—not an automatic sell signal.':'The base is where the rally starts, not the rally itself. Price returns to it here, but demand zones can also fail.';
    if(supply){candles=candles.map(c=>({open:1000-c.open,close:1000-c.close,high:1000-c.low,low:1000-c.high}));marks=marks.map(m=>({...m,high:1000-m.low,low:1000-m.high}));}
  }else if(slot===2||slot===3){
    const bearish=slot===3,s=createScenario('structure',Math.abs(cycle)*2+(bearish?1:0));
    candles=s.candles;topic='Market structure';question=bearish?'Where does the swing low break?':'Which candle breaks the swing high?';hint='Follow the prior swing level to the first close beyond it.';
    answer=bearish?'The line connects the prior low to the first close below it. A wick below the level alone would not meet this close-based definition.':'The line starts at the prior swing high and ends at the first close above it. The pullback in between is not the break.';
    marks=[{kind:'level',first:s.swing!,last:s.breakIndex!,high:s.level!,low:s.level!,label:bearish?'Close below swing low':'Close above swing high'}];
  }else if(slot===4||slot===5){
    const below=slot===5;
    candles=fromCloses([100,102,104,105,103,101,103,105,103,102,104,105,104,102,100,99,100,98,97,98,96,95]);
    candles[3].high=105.4;candles[7].high=105.4;candles[11].high=106.4;
    topic='Liquidity';question=below?'Where does price sweep the lows?':'Where does price sweep the highs?';hint='Find the repeated level, then the wick beyond it and close back inside.';
    marks=[{kind:'level',first:3,last:11,high:105.4,low:105.4,label:below?'Lows swept · close back above':'Highs swept · close back below'}];
    if(below){candles=candles.map(c=>({open:210-c.open,close:210-c.close,high:210-c.low,low:210-c.high}));marks=marks.map(m=>({...m,high:210-m.low,low:210-m.high}));}
    answer='The wick crosses the repeated level, then closes back inside. Traders call this a liquidity sweep; candles alone cannot prove where stops sat or who traded.';
  }else if(slot===6||slot===7){
    const bearish=slot===7;
    candles=fromCloses([100,101,100.5,101,102,106,107,108,107.2,106,105,104.5,105.5,107,108.5,110,109,110,111,110.5,112,113]);
    // Three-candle FVG: candle 4 high is below candle 6 low, around displacement candle 5.
    const lower=candles[4].high,upper=candles[6].low;
    marks=[{kind:'zone',first:4,last:12,high:upper,low:lower,label:bearish?'Bearish FVG · 3 candles':'Bullish FVG · 3 candles'}];
    if(bearish){candles=candles.map(c=>({open:220-c.open,close:220-c.close,high:220-c.low,low:220-c.high}));marks=marks.map(m=>({...m,high:220-m.low,low:220-m.high}));}
    topic='Fair value gaps';question='Can you find the three-candle FVG?';hint='Compare the wicks of candles one and three around the strong middle candle.';
    answer=bearish?'The box spans candle one’s low to candle three’s high. Their wicks do not overlap. This pattern does not guarantee a return or a profitable entry.':'The box spans candle one’s high to candle three’s low. Their wicks do not overlap. An FVG is not proof of institutional orders or a guaranteed fill.';
  }else{
    const s=createScenario('confirmation',Math.abs(cycle)*2);candles=s.candles;const i=s.response!;
    topic='Confirmation';question='What makes this more than a touch?';hint='Compare the returning red candle with the next completed green candle.';
    answer='The highlighted green candle closes above the red candle’s open. That is the bullish response defined here—not a promise that the next move continues.';
    marks=[{kind:'zone',first:i-1,last:i,high:Math.max(candles[i-1].high,candles[i].high),low:Math.min(candles[i-1].low,candles[i].low),label:'Bullish response'}];
  }
  // Stable daily scaling preserves every annotated relationship. No random refresh changes.
  const factor=.7+mod(serial*37,113)/100,offset=mod(serial*19,73);
  const p=(value:number)=>offset+value*factor;
  candles=candles.map(c=>({open:p(c.open),close:p(c.close),high:p(c.high),low:p(c.low)}));
  marks=marks.map(m=>({...m,high:p(m.high),low:p(m.low)}));
  return {id:`daily-study-v1:${day}`,day,slot,topic,question,hint,answer,candles,marks,provenance:'Simulated teaching example'};
}
