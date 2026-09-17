// Presentation only: retain the original lesson records and video URLs.
const bridgeTitles: Record<string,string> = {
 'TradingView Setup + Alerts (Install & Basics) PT.1':'TradingView setup · Part 1',
 'TradingView Setup + Alerts (Install & Basics) PT.2':'TradingView setup · Part 2',
 'Vault OS Supply and Demand Indicator: Setup (Only)':'Set up the Vault indicator',
 'How to Practice on TradingView (Paper / Replay Mode)':'Practice with paper trading & replay',
 'How to Pick Stocks to Trade (Starter Watchlist)':'Build your first watchlist',
 'Indicators: What to Use (and What to Ignore)':'Choose your indicators',
 'Options Basics (Optional for Options Traders)':'Options basics (optional)',
 'How To Mark Up Charts for Beginners (Simple Read) Make $5k+ monthly':'Mark up your first chart',
};
export function lessonDisplayTitle(title:string,moduleSlug?:string){
 return moduleSlug==='chapter-1-basic-bridge'?(bridgeTitles[title.trim()]||title):title;
}
