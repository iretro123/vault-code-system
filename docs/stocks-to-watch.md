# Stocks to Watch — local implementation

## September 14 connection update (supersedes disconnected-state notes below)
The default dev collector now fetches Stock Analysis's public most-active table (premarket gainers table from 9:00–9:29 ET). Actual HTTP retrieval is enabled; no sample fallback remains. It runs once on server startup, then in 30-minute weekday slots from 9:00 through 16:00 ET while Vite is running. No production deployment was performed. Calendar-aware skipping for this public-page adapter remains a release task: it can check pages on weekday holidays/after early closes, but labels the source session rather than inventing new activity.

Terms checked: https://stockanalysis.com/terms-of-use/ allows attributed snippets; https://stockanalysis.com/robots.txt does not disallow these market routes. We expose five ticker/company names, attribution, and original factual summaries, not the copied source tables. Some source data can be delayed 15 minutes or more. The page exposes a session date, not a precise observation timestamp, so observedAt is null; checkedAt is strictly retrieval time. Do not market this as real-time quotes or an exchange-wide scanner. No undocumented APIs, login bypass or scraper evasion used.

The public adapter ranks the available public rows (not all listed stocks), filters price >= $1, absolute move >=1%, and volume >=1M regular / 100K premarket. Established firms first, then approximate dollar activity (last price times volume, not actual traded dollar volume). It does not infer news or abnormal volume versus average. Failed fetches retain the last list with a stale warning. Before commercial launch, reconfirm terms/data rights and add durable hosting, exchange calendar and monitoring.

## Current state
Community now has five simple ticker summaries instead of the iframe. In development only, the disconnected state shows explicitly dated September 14, 2026 research from https://stockanalysis.com/markets/active/ and https://stockanalysis.com/markets/gainers/. This is not an automatic collector or a current feed. Production never falls back to this research sample.

## Architecture
Approved source adapter → validated market facts and exchange calendar → deterministic filter/ranker → short templates → shared snapshot → member panel.

No GPT, fine-tuning, or new model is needed for version one. Templates prevent invented catalysts and have no AI usage charges. Optional later: GPT-4o mini via a server-side API to summarize verified news, with source links, constrained output and template fallback. Do not use the model's memory as market data. Never put API keys in VITE_ variables or the browser.

## Local adapter
`scripts/stocksToWatchDev.ts` registers GET `/api/stocks-to-watch`. Set server environment variable `VAULT_WATCH_FEED_URL` to an approved normalized JSON adapter and restart Vite. No source is configured by default. This is a local dev plugin, NOT a deployed production API.

The JSON contract is `watchFeedSchema` in `src/lib/stocksToWatch.ts`. The provider must supply sessionDate, observedAt, sourceUrl, closeAt (null on holidays), and candidates with symbol, name, changePercent, dollarVolume, marketCap, and session. Premarket change must compare against the prior regular close; dollarVolume must belong to the reported session. The source must report observation timestamps, not merely HTTP fetch time. Calendar must include holidays and early closes.

Local scheduler checks each minute, performs one successful retrieval per 30-minute slot from 9 a.m. through the exchange close (no later than 4 p.m. America/New_York), and retries failed retrievals at most once a minute. It requires the computer and Vite server to stay running. Snapshot cache is in memory and resets on restart. The browser reads the shared cache each minute only while the panel is open; it does not scrape sources or generate a separate list per user.

Candidate defaults: at least $10M session dollar volume and an absolute 1% move. Established companies ($2B+ market cap) sort first, then session dollar volume. Deduplicate and show at most five. These are product filters, not a validated trading strategy, unusual-volume claim, or prediction. No verified news integration yet.

## Before production
1. Select and implement a permitted source adapter; verify freshness, coverage and resulting-list display rights. The developer plugin does not scrape TradingView or any other site.
2. Port the job to the existing Vault backend scheduler with durable snapshot storage, distributed single-run lock, exchange calendar, rate limits and failure monitoring. Do not run one job per member/browser.
3. Protect reads with Vault membership authentication; keep credentials server-side. Preserve snapshots on failures but mark stale; never refresh observation timestamps for old data.
4. Test before-open, opening session, holidays, early closes, reconnects and provider outages with actual source data. Load-test shared delivery.
5. Obtain explicit authorization before deployment or live database changes. No hosted scheduler, Codex heartbeat, purchases, API calls to OpenAI, or production writes were enabled by this change.
