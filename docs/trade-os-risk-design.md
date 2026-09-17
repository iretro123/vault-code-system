# TradeOS: daily risk planning

Research and local implementation: September 11, 2026.

## Current UI revision

The member-facing local route now uses `DailyLossCalculator`, superseding the detailed workbench below after user feedback that contract sizing forms were too complex. Two inputs: current balance (or remaining prop drawdown room after a user cushion) and a chosen daily risk percentage. Output is amount × percentage / 100, rounded down to cents. No market selector is needed because this is one daily account budget, not a per-position calculator. Percentage shortcuts are explicitly not recommendations. Prop users are warned that stricter firm daily limits still apply. Browser-only save is user-specific and dated; a new day clears the balance while retaining the percentage for review. The detailed workbench and its tests remain in the source for reference but are not displayed. Nothing is published or written to live accounts.

## Product decision

Replace the local TradeOS dashboard with a pre-trade sizing workbench, not a trade journal or profit-prediction screen. Retain the original production route and all stored records. Options, futures and forex have distinct inputs; futures includes a user-configured prop challenge mode. This is an educational estimate, not a broker-enforced control, personalized suitability assessment, loss prevention guarantee or profitability system.

The repeated-use proposition is: set the day's loss boundaries, size from the actual stop, keep aggregate exposure inside the entered budget, then return before the next position. There is no evidence yet that this increases MRR. Validate usefulness with members before claiming a retention impact. Do not use win streaks, bigger-size rewards, profit promises or a sales claim that users can no longer blow up accounts.

## Research translated into features

| Observed issue | Product response | Evidence |
| --- | --- | --- |
| Confusing nominal prop account size with real loss room | Budget from current equity minus current floor minus a user-entered buffer; no hard-coded firm profiles | [Trader discussion](https://www.reddit.com/r/Daytrading/comments/1pa9x68/position_sizing_risk/), [Topstep mechanics](https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit) |
| A stop-based estimate is mistaken for a guaranteed cap | Options default to entire premium loss; stop mode separately exposes the larger premium exposure | [OIC basics](https://www.optionseducation.org/optionsoverview/options-basics), [FINRA stop orders](https://www.finra.org/investors/insights/stop-orders-factors-consider-during-volatile-markets) |
| Mini/micro tick values confused with points or margin | Explicit CME contract selector, points converted to ticks, separate margin cap | [CME micro FAQ](https://www.cmegroup.com/articles/faqs/micro-e-mini-equity-index-futures-frequently-asked-questions.html), [CME equity specifications](https://www.cmegroup.com/content/dam/cmegroup/education/modules/files/EQ240_EQ_for_AIT.pdf) |
| Forex pip value assumed to always be $10 | Pair-specific pip size and explicit quote-to-USD conversion; lots and base units displayed together | [OANDA pips](https://www.oanda.com/ca-en/skills-and-insights/education/introduction-trading/basics/what-is-a-pip/), [BabyPips sizing calculator](https://www.babypips.com/tools/position-size-calculator), [BabyPips pip calculator](https://www.babypips.com/tools/pip-value-calculator) |
| Traders mistake modeled options profits for a reliable forecast | No Greek/IV price prediction or probability-of-profit badge; directly entered option premiums | [Options Profit Calculator](https://www.optionsprofitcalculator.com/calculator/long-call.html) uses pricing-model assumptions; [forum discussion of calculator confusion](https://www.reddit.com/r/options/comments/nj877e/) is qualitative context only |
| A popular percentage is treated as universally safe | Blank user-defined risk settings, conspicuously labeled examples, no optimal-risk prescription | [CME 2% rule](https://www.cmegroup.com/education/courses/trade-and-risk-management/the-2-percent-rule) explicitly calls its percentage arbitrary |

Forums identify language and usability problems; their anecdotes do not establish prevalence, causal claims about account failures, optimal sizing, or profitable strategies. Financial mechanics come from primary sources and explicit formulas, not Reddit recommendations.

## Mathematical scope

- User-chosen daily dollar limit is capped at the risk basis. Per-trade budget is the minimum of basis × risk percentage, daily ceiling ÷ allowed losing trades, and remaining daily room.
- Daily room deducts gross losing-trade costs and additional open-position risk. Profits never increase the day's budget. Reaching the dollar or losing-trade limit yields zero size.
- Prop basis is current marked-to-market equity minus current breach floor minus a strictly positive user buffer. Additional open risk is prospective from current prices, not already-incurred unrealized losses. Firm daily room and selected-instrument remaining contract allowance provide extra caps. Static/EOD/intraday selection explains the mechanics; it does not simulate a trailing floor. These values must be updated from the firm dashboard.
- Long standard options: multiplier 100; default risk is premium × 100 + round-trip fees. Optional stop mode uses min(entry premium, entry − stop + slippage allowance) × 100 + fees. Both cash and total premium commitment caps apply. Whole contracts round down. No option writing, spreads, adjusted contracts or exercise exposure.
- Futures: MES $1.25/tick, MNQ $0.50/tick, ES $12.50/tick, NQ $5/tick; all 0.25 index points/tick. Round stop distance up to a tick. Add entered slippage ticks and per-contract round-trip costs; round size down. Personal accounts also cap at free margin ÷ (margin requirement + fees).
- Forex: pip size 0.01 for JPY quote pairs, otherwise 0.0001. Pip value/standard lot = pip size × 100,000 × quote-to-USD rate. Loss/lot = (stop pips + extra spread/slippage pips) × pip value + fees/lot. Apply free-margin capacity, round down to broker lot increment, enforce broker minimum. USD accounts only; non-USD quote conversion is manual and must allow for adverse exchange-rate movement.

## Safety, data and daily use

All plans are device-local and keyed to signed-in user and market. No orders, live quote access, brokerage connections, AI claims, server saves or deletion of old trade records. Switching futures account type clears that calculation. Changing instrument clears instrument-dependent costs and limits. Plans require explicit verification before local saving. Old-date plans do not show an actionable size until reviewed. Different market tabs are not automatically consolidated; users must include all open risk in the shared account budget.

Risk controls only reduce modeled exposure. Stops can gap; currency conversion and margin may change; liquidation can precede a stop; option exercise creates additional exposure. Prop firm rules differ by account and may change. Broker eligibility, settlement rules, leverage restrictions, scaling/consistency/news limits, tax, and actual order acceptance are not verified.

## Before a production launch

1. Independent financial-model review and broker statement comparisons for every supported instrument, including severe slippage and drawdown scenarios.
2. Member usability testing: can a beginner produce the correct size from their broker's actual contract, price and fee information without assistance?
3. Confirm what local plans should sync across devices; implement a separate tested backend only with permission. No live writes in this preview.
4. Consider opt-in, read-only broker data as a later scope to reduce manual-entry errors, with explicit consent, credential protections and stale-data warnings. Do not market a manual plan as a trading lockout.
5. Evaluate whether members return voluntarily and understand the result. Price around education plus useful planning, not promises of earnings. Measure retention only with an approved analytics plan; no tracking added here.

## Validation

Dedicated tests cover all three sizing paths, invalid/empty numbers, fees, margin, option premium caps, zero sizes, whole tick/contract rounding, minimum forex lots, currency conversion, negative prop equity with a lower floor, exhausted firm limits and a range of generated boundary scenarios. Browser QA checks examples, market selection, warnings and responsive overflow. These checks are necessary but are not independent financial certification.
