export type VisualTopic='demand'|'structure'|'confirmation';
type Candle={open:number;high:number;low:number;close:number};
type Template={id:string;topic:VisualTopic;title:string;prompt:string;explanation:string;closes:number[];base?:[number,number];swing?:number;response?:number;mirror?:boolean;wick?:{index:number;high:number;low:number}};
const templates:Template[]=[
  {id:'base-retest',topic:'demand',title:'The origin of the rally',prompt:'Where did buyers first change the direction?',explanation:'The zone covers the small base before the strong departure. Price returns there and bounces in this example. The rally itself is not the demand zone.',closes:[108,107,105.8,104,102.4,101.2,101.5,101.1,101.6,103.5,106,108.5,110,109,107.6,105.8,104,102.5,101.7,103,105,107,108.8,110],base:[5,8]},
  {id:'base-fails',topic:'demand',title:'A good-looking zone can fail',prompt:'Would you buy just because price touches the zone?',explanation:'The base caused a strong rally, but the return closes below its lower edge. A zone identifies an area to study; it cannot guarantee buyers will defend it.',closes:[103,102.6,103.1,102.8,103.2,105,108,110,111,110.2,109,107.4,106,104.5,103.5,103,101.8,100.5,99.8,100.5,99.3,98.4],base:[1,4]},
  {id:'higher-high',topic:'structure',title:'A close above the swing high',prompt:'Which candle actually breaks the previous high?',explanation:'Follow the dashed line from the prior swing high to the first candle that closes above it. The pullback low forms before that break. A wick alone would not qualify.',closes:[100,102,104,106,108,109,107.5,106,104.8,105.5,107,108.6,110.4,111.7,110.8,109.8,111,113,114,113,114.6,115],swing:5},
  {id:'lower-low',topic:'structure',title:'The same idea, to the downside',prompt:'Where does price close below its earlier swing low?',explanation:'The dashed line starts at the prior swing low. The highlighted candle is the first close below it—not the bounce in the middle. This is a bearish structure break.',closes:[100,102,104,106,108,109,107.5,106,104.8,105.5,107,108.6,110.4,111.7,110.8,109.8,111,113,114,113,114.6,115],swing:5,mirror:true},
  {id:'rejection',topic:'confirmation',title:'The response—not just the touch',prompt:'What changes after price tests the base?',explanation:'The test dips into the base. Then a green candle closes above the previous red candle’s open. That is the specific bullish response shown here—not proof the next trade will win.',closes:[103,102,101,101.3,101.1,101.5,103.5,106,108,109,108.3,107,105.6,104.2,102.8,101.8,101.2,103.2,104.5,106,108,109],base:[2,5],response:17,wick:{index:16,high:102.05,low:100.85}},
  {id:'wick-trap',topic:'confirmation',title:'A bounce that does not follow through',prompt:'Is one green candle enough to trust the bounce?',explanation:'The green candle briefly lifts from demand, but the following red candle closes below the base. Wait for the close you defined; a momentary bounce is not a reliable promise.',closes:[103,102,101,101.3,101.1,101.5,103.5,106,108,109,108.3,107,105.6,104.2,102.8,101.4,102.1,100.1,99,98.5,99.2,98],base:[2,5],response:17},
];

// Seeded price/shape variation within authored scenarios; never represented as historical data.
export function createScenario(topic:VisualTopic,serial:number){
  const choices=templates.filter(t=>t.topic===topic);
  const template=choices[((serial%choices.length)+choices.length)%choices.length];
  let seed=(serial+31)*2654435761>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const scale=.65+random()*1.8,offset=40+random()*250;
  const values=template.closes.map((c,i)=>c+(i%3===0?0:(random()-.5)*.12));
  const raw:Candle[]=values.map((close,i)=>{const open=i?values[i-1]:close+.7;return {open,close,high:Math.max(open,close)+.16+random()*.18,low:Math.min(open,close)-.16-random()*.18};});
  if(template.wick){raw[template.wick.index].high=Math.max(template.wick.high,raw[template.wick.index].high);raw[template.wick.index].low=template.wick.low;}
  const transform=(p:number)=>offset+(template.mirror?220-p:p)*scale;
  const candles=raw.map(c=>({open:transform(c.open),close:transform(c.close),high:transform(template.mirror?c.low:c.high),low:transform(template.mirror?c.high:c.low)}));
  const base=template.base?{first:template.base[0],last:template.base[1],high:Math.max(...candles.slice(template.base[0],template.base[1]+1).map(c=>c.high)),low:Math.min(...candles.slice(template.base[0],template.base[1]+1).map(c=>c.low))}:undefined;
  const level=template.swing!==undefined?(template.mirror?candles[template.swing].low:candles[template.swing].high):undefined;
  const breakIndex=level===undefined?undefined:candles.findIndex((c,i)=>i>template.swing!&&(template.mirror?c.close<level:c.close>level));
  return {...template,candles,base,level,breakIndex};
}
