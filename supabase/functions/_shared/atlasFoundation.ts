/** Authored education shared by preview and server, NOT generated model responses.
 * No personal records, orders, live prices, or remote calls are used here. */
export type Topic = 'demand' | 'structure' | 'confirmation' | 'options' | 'risk' | 'futures' | 'forex' | 'stocks' | 'mindset' | 'setup';
export type GuideAnswer = { title: string; text: string; example?: string; caution?: string; topic?: Topic; chart?: boolean; generated?: boolean; references?: string[]; check?: {question:string;choices:[string,string];correctIndex:number;explanation:string}; link?: { label: string; path: string }; source?: { label: string; url: string } };
export type AtlasWorkedExample = {inputs:{market:string;entry:number;exit:number;quantity:number;unitValue:number;fees:number};net:number;formula:string;assumption:string;caution:string};
const basics = { label: 'OIC · Options basics', url: 'https://www.optionseducation.org/optionsoverview/options-basics' };
const stops = { label: 'FINRA · How stop orders work', url: 'https://www.finra.org/investors/insights/stop-orders-factors-consider-during-volatile-markets' };

export const GUIDES: Record<Topic, GuideAnswer & { simple: string; deeper: string; question: string; choices: [string,string]; correct: number; feedback: [string,string] }> = {
  stocks:{topic:'stocks',title:'Think in shares and price movement.',text:'For a long stock position, price movement per share multiplied by shares gives the price profit or loss. Subtract fees to estimate the net result.',example:'Hypothetical example: buy 10 shares at $50 and sell at $49.50. The price loss is $5 before fees.',caution:'Stops do not guarantee a fill at the planned price. Short selling has different mechanics and can lose more than the initial proceeds.',simple:'If each share loses 50 cents and you own 10 shares, the loss is $5 before fees.',deeper:'Separate position value from price risk. The example costs $500 to open, but a 50-cent adverse move loses $5. Larger moves, gaps, fees, and slippage can make the loss larger. Broker rules and order availability vary.',question:'Ten shares fall by $0.50 each. What is the price loss?',choices:['$5','$50'],correct:0,feedback:['Correct. Ten times fifty cents is five dollars, before fees.','Multiply shares by price change: 10 × $0.50 = $5 before fees.'],link:{label:'Open Trade OS',path:'/academy/trade'}},
  demand: {
    topic:'demand', title:'Start with where the move began.',
    text:'A demand zone is an area traders mark around the base before a strong upward move. The important part is the origin—not every green candle in the rally.',
    example:'Find the small cluster of candles. Follow the move away. Then watch how price behaves if it returns to that same area.',
    caution:'A return can fail. A zone is an area to study, not an instruction to buy.', chart:true,
    simple:'Find the pause before price jumped up. That little base is the area to study—not the top of the jump.',
    deeper:'A strong departure makes a base worth examining, but candles cannot prove that unfilled buy orders remain. Compare the surrounding swings, the return, and the response. Zone boundaries are an interpretation, not an exact universal rule.',
    question:'Where would you look for demand in this example?', choices:['The base before the rally','The highest green candle'], correct:0,
    feedback:['That’s the distinction. You chose the origin of the move. Next, study what happens on the return—not just the initial rally.','You found the result of the move. Work backward to the small base where it began. That is the demand area shown here.'],
    link:{label:'Explore the chart classroom',path:'/academy/learn'},
  },
  structure:{
    topic:'structure',title:'Follow the swings, not every candle.',
    text:'An uptrend has higher swing highs and higher swing lows. In this teaching approach, a bullish structure break is a candle closing above a prior swing high.',
    example:'Mark the previous high. Mark the low that follows. Then look for a close above that high—not just a wick through it.',
    caution:'The timeframe matters. A break can fail and does not guarantee continuation.',
    simple:'Price makes a high, pulls back, then closes above that high. That close is the break we are studying.',
    deeper:'Use the same timeframe for the swing and its break. A small internal high is not necessarily the major swing high. State which swing you are using and why; do not change it afterward to make the example look cleaner.',
    question:'Which matches this close-based definition of a structure break?',choices:['A wick briefly pokes above the high','A candle closes above the prior high'],correct:1,
    feedback:['A wick shows price visited that level. In this example, wait for the completed close above it.','Exactly. You are using a completed close, with a clearly identified prior swing. That still does not promise the next move.'],
    link:{label:'See structure in Learn',path:'/academy/learn'},
  },
  confirmation:{
    topic:'confirmation',title:'The touch is not the response.',
    text:'Price reaching demand is only the location. Confirmation is the response you decide to look for there—such as a completed bullish candle after the pullback.',
    example:'In our classroom illustration, a green candle closes above the previous red candle’s open inside demand. That is one defined example, not a universal entry rule.',
    caution:'Define your condition before the move. Even a completed confirmation can fail.',
    simple:'First: price reaches your area. Then: it does the thing you decided to wait for. Those are two different steps.',
    deeper:'Separate location, response, and invalidation. A bullish candle elsewhere on the chart is not the same setup. Avoid choosing a confirmation only after seeing a winning outcome; compare examples where the same condition failed.',
    question:'Price touches demand. Is that automatically confirmation?',choices:['Yes, the touch is enough','No, I still need my defined response'],correct:1,
    feedback:['The touch tells you where price is. It does not establish the response you were waiting for.','Right. Location first, response second. Keep the failure condition in your plan too.'],
    link:{label:'Open the confirmation example',path:'/academy/learn'},
  },
  options:{
    topic:'options',title:'Separate the contract cost from its risk.',
    text:'An option is a contract with an expiration date. A standard stock-option contract usually represents 100 shares, so a quoted premium of $1.00 usually costs $100 before fees.',
    example:'Buy for $100 and sell for $85: that is a $15 loss before fees. The amount you spend and the loss you plan to take are different numbers.',
    caution:'A planned exit is not guaranteed. A purchased option can lose its entire premium. Adjusted contracts can have different terms.',source:basics,
    simple:'A $100 purchase does not mean you must lose $100. Selling for $85 loses $15 before fees—but you might not get that exit price.',
    deeper:'The option price changes with the underlying price, time remaining, and implied volatility. Being right about direction is not enough. Before expiration, a contract can gain value while still out of the money; that does not make it low-risk.',
    question:'A contract costs $100 and you sell it for $85. What did you lose before fees?',choices:['$15','$100'],correct:0,
    feedback:['Correct: $100 minus $85 is $15. Fees and a worse fill would increase that loss.','You spent $100 but recovered $85. The difference is $15 before fees. Losing the full $100 is still possible if the option becomes worthless.'],
    link:{label:'Open the daily risk calculator',path:'/academy/trade'},
  },
  risk:{
    topic:'risk',title:'Your limit is a stopping point. Not a spending target.',
    text:'Your daily loss budget is your account balance multiplied by the percentage you choose. It is the loss you plan not to exceed—not how much you can spend on contracts.',
    example:'For illustration: $1,000 × 1% = $10 for the day. You do not have to use it all, and it is not $10 for every trade.',
    caution:'No percentage prevents losses. Stops, gaps, fees, and fast markets can take you beyond the plan. If a trade cannot fit, skipping or practicing is valid.',source:stops,
    simple:'Pick a loss limit before trading. Stop sooner if needed. It is your budget for losses across the day, not your buying budget.',
    deeper:'Count realized losses, fees, and risk still open. Several positions can move against you together. A prop account adds firm-specific daily and trailing drawdown rules; its advertised size is not your available loss budget.',
    question:'A $10 daily loss budget means…',choices:['I can lose $10 on each trade','I plan around $10 of losses across the day'],correct:1,
    feedback:['That would multiply the daily limit. The budget covers the day, not each individual trade.','That’s it. And a plan does not mechanically cap what the market can take—you still need execution discipline and realistic sizing.'],
    link:{label:'Set a daily stopping point',path:'/academy/trade'},
  },
  futures:{
    topic:'futures',title:'Start with dollars per tick.',
    text:'For futures, planned price risk is stop distance in ticks × dollars per tick × contracts. Use the specifications for the exact contract; a micro and a full-size contract are not interchangeable.',
    example:'Hypothetical contract: 8 ticks × $1.25 per tick × 1 contract = $10 of planned price risk, before fees and slippage.',
    caution:'Margin is not maximum loss. For prop accounts, check the firm’s actual daily-loss and drawdown rules.',
    simple:'Find what one tick costs. Multiply it by the ticks to your exit and the number of contracts.',
    deeper:'Check the exchange contract specification and your broker’s fees. Model the exit in the same contract you will trade, and include slippage. A challenge account’s headline balance can be much larger than its permitted drawdown.',
    question:'Is the margin required to open a futures position your maximum possible loss?',choices:['No','Yes'],correct:0,
    feedback:['Correct. Margin is a requirement to hold the position; it is not a loss cap.','No—margin is not a loss cap. Price movement can create losses beyond the margin posted.'],
    link:{label:'Open Trade OS',path:'/academy/trade'},
  },
  forex:{
    topic:'forex',title:'Know what a pip is worth in your account.',
    text:'Forex risk depends on the pair, position size, stop distance, and your account currency. A pip does not have one universal dollar value.',
    example:'Hypothetical position: 20 pips × $0.50 per pip = $10 of planned price risk, before spread, fees, and slippage.',
    caution:'Verify the pip value with your broker. Leverage does not reduce the loss from a price move.',
    simple:'How far is your exit? How much does each pip cost at your size? Multiply those two numbers.',
    deeper:'If the quote currency differs from your account currency, conversion affects pip value. Check position units and the pair’s pip convention before using a calculator.',
    question:'Does every currency pair and position size have the same pip value?',choices:['Yes','No'],correct:1,
    feedback:['The pair, units, and account currency matter. Use the exact position details.','Correct. That is why a generic pip assumption can produce the wrong size.'],
    link:{label:'Open Trade OS',path:'/academy/trade'},
  },
  mindset:{
    topic:'mindset',title:'You do not have to solve a loss with another trade.',
    text:'After a frustrating trade, pause before opening another position. Review whether you followed your original plan—not whether the next trade could win the money back.',
    example:'One useful question: “Would I take this setup if I had not just lost?” If the answer changes, step back and review it away from live execution.',
    caution:'This is a reflection exercise, not a diagnosis or a promise of profitability.',
    simple:'A loss does not create a new opportunity. Pause. Look at the next setup on its own.',
    deeper:'Separate process from outcome. A planned trade can lose; an impulsive trade can win. Judge the decision using what you knew before entering, and bring recurring difficulties to a human coach.',
    question:'Which is more useful to review after a loss?',choices:['Whether I followed my plan','How quickly I can make it back'],correct:0,
    feedback:['Yes. Review the decision you controlled, without pretending you could know the outcome in advance.','Trying to recover quickly can push you into a different, riskier decision. Review your process before another trade.'],
    link:{label:'Talk it through with RZ',path:'/academy/support'},
  },
  setup:{
    topic:'setup',title:'Get comfortable before you go live.',
    text:'Start with TradingView, add the Vault indicator, and use a practice setup while you learn. Then test Zoom and find the class schedule. A funded account is not required just to learn.',
    example:'Your Trading Setup page keeps the official indicator, TradingView, Zoom, and app links in one place.',
    simple:'Set up your chart. Practice first. Test Zoom. You can learn alongside the class without placing a live trade.',
    deeper:'Make sure you are signed into the correct TradingView account before adding the indicator. If you cannot find it, use the official link on Trading Setup. Do not assume an indicator removes the need to understand a chart.',
    question:'Do you need to place a live trade to learn during class?',choices:['No, I can observe and practice','Yes'],correct:0,
    feedback:['Exactly. Focus on understanding the reasoning first.','No. Observing, asking questions, and paper practice are valid ways to learn.'],
    link:{label:'Open your trading setup',path:'/academy/setup'},
  },
};

export function answerGuide(input: string, previous?: Topic): GuideAnswer {
  const text=input.trim().toLowerCase();
  if(/\b(instagram|insta|youtube|socials?|channel|ig)\b/.test(text))return {title:'Learn with RZ outside the app.',text:'RZ is Ruben Zamora, founder of Vault Trading Academy. His public YouTube channel is @rubenzamora__, with trading education and chart walkthroughs. His Instagram uses the same handle. Use the verified link below to explore; these resources are education, not trade signals.'};
  if(/(?:how|where).*(?:use|find|open|navigate).*(?:vault|app|lesson|profile|message)|what (?:is|does) (?:vault|this app)/.test(text))return {title:'Find your next step in Vault.',text:'Learn holds chapters and video lessons: open a chapter, then select a lesson. Trading Setup helps you prepare your charts. Trade OS has risk-planning tools. Community is for discussions and member messages. Edit your bio and social links in Settings → My profile. For personal help, open Support.',link:{label:'Explore the lessons',path:'/academy/learn'}};
  if (/guarantee|can.?t lose|cannot lose|risk.?free|sure win|double my|what (?:should|do) i buy|buy (?:calls|puts) (?:now|today)/.test(text)) return {title:'I can help you learn—not promise a winning trade.',text:'No setup or calculator can guarantee a profit. This preview has no live prices and does not give buy or sell instructions. We can work through how a setup could fail and what risk means.',topic:'risk',link:GUIDES.risk.link};
  if (previous && /^(simpler|make it simpler|explain simply)/.test(text)) return {...GUIDES[previous],title:'Let’s strip it back.',text:GUIDES[previous].simple,example:undefined,chart:false};
  if (previous && /^(go deeper|more detail|explain more)/.test(text)) return {...GUIDES[previous],title:'Here’s the distinction that matters.',text:GUIDES[previous].deeper,example:undefined,chart:false};
  const topic:Topic|undefined = /0.?dte|out.of.the.money|\botm\b|option|premium|contract cost/.test(text)?'options':/future|prop firm|drawdown|\btick\b/.test(text)?'futures':/forex|\bpip\b|currency/.test(text)?'forex':/revenge|frustrat|emotion|mindset|keep losing|scared|afraid/.test(text)?'mindset':/risk|stop loss|budget|account|siz(e|ing)|loss limit/.test(text)?'risk':/confirm|engulf|entry/.test(text)?'confirmation':/structure|swing|higher high|higher low|\bbos\b/.test(text)?'structure':/demand|chart|zone/.test(text)?'demand':/setup|set up|install|zoom|indicator|start|learn|study|beginner/.test(text)?'setup':undefined;
  if (topic) return GUIDES[topic];
  if(/\b(stocks?|shares|equities)\b/.test(text))return GUIDES.stocks;
  return {title:'That needs an open-ended answer.',text:'This local preview uses a small set of authored teaching examples. The generative AI connection is not enabled yet, so I won’t pretend to have understood this question. Try demand, structure, confirmation, options, risk, futures, forex, or trading setup.',link:{label:'Bring your question to RZ',path:'/academy/support'}};
}
