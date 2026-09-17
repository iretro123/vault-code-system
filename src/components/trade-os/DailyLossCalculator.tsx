import { useState } from "react";
import { ShieldCheck, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { localDay } from "@/lib/tradeRisk";
import { toast } from "sonner";
import "./daily-loss-calculator.css";

export function dailyLossLimit(amount: string, percent: string): number | null {
  if (!amount.trim() || !percent.trim()) return null;
  const a = Number(amount), p = Number(percent);
  if (!Number.isFinite(a) || !Number.isFinite(p) || a <= 0 || a > 1e12 || p < 0 || p > 100) return null;
  return Math.floor(a * p + 1e-8) / 100;
}
type Saved = { amount: string; percent: string; date: string; kind: string };
const dollars = (n: number) => n.toLocaleString("en-US", {style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
function Calculator({ userKey }: { userKey: string }) {
  const storageKey = `vault-daily-limit-v2:${userKey}`;
  const [initial] = useState<Saved | null>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey) || "null");
      return s && ["personal", "prop"].includes(s.kind) && typeof s.date === "string" && typeof s.amount === "string" && typeof s.percent === "string" && dailyLossLimit(s.amount, s.percent) !== null ? s : null;
    } catch { return null; }
  });
  const [kind, setKind] = useState(initial?.kind || "personal");
  const [amount, setAmount] = useState(initial?.date === localDay() ? initial.amount : "");
  const [percent, setPercent] = useState(initial?.percent || "");
  const [saved, setSaved] = useState(false);
  const limit = dailyLossLimit(amount, percent);
  const prop = kind === "prop";
  function save() {
    if (limit === null) return;
    try { localStorage.setItem(storageKey, JSON.stringify({amount,percent,kind,date:localDay()})); setSaved(true); }
    catch { toast.error("Could not save on this device. Your calculation is still available."); }
  }
  return <div className="daily-loss">
    <header><p className="daily-eyebrow">TRADE OS</p><h1>What’s your limit today?</h1><p>Set it before your first trade. Keep it for the day.</p></header>
    <Tabs value={kind} onValueChange={v=>{setKind(v);setAmount("");setPercent("");setSaved(false);}}><TabsList aria-label="Account type"><TabsTrigger value="personal">My own account</TabsTrigger><TabsTrigger value="prop">Prop account</TabsTrigger></TabsList></Tabs>
    <p className="daily-market-note">{prop ? "Use your loss room—not the advertised account size." : "For options, futures and forex. One limit for the whole account."}</p>
    <div className="daily-calculator">
      <section className="daily-inputs" aria-label="Daily risk inputs">
        <div className="daily-field"><label htmlFor="daily-balance">{prop ? "Remaining drawdown room" : "Current account balance"}<span>USD</span></label><Input id="daily-balance" type="number" min="0" step="0.01" placeholder={prop ? "e.g. 2,000" : "e.g. 5,000"} value={amount} onChange={e=>{setAmount(e.target.value);setSaved(false);}} />{prop && <small>Copy the loss room from your firm dashboard, then subtract the cushion you want to leave untouched.</small>}</div>
        <div className="daily-field"><label htmlFor="daily-percent">My daily risk percentage<span>%</span></label><Input id="daily-percent" type="number" min="0" max="100" step="0.01" placeholder="e.g. 0.5" value={percent} onChange={e=>{setPercent(e.target.value);setSaved(false);}} />
          <div className="daily-presets" aria-label="Fill risk percentage">{["0.25","0.5","1"].map(p=><Button key={p} variant="outline" aria-pressed={percent === p} onClick={()=>{setPercent(p);setSaved(false);}}>{p}%</Button>)}<Button variant="outline" className="daily-high-risk" aria-pressed={percent === "5"} onClick={()=>{setPercent("5");setSaved(false);}}>5% <span>· High risk</span></Button></div>
          <small>Your choice, not a recommendation.</small>
        </div>
        {amount && percent && limit === null && <p className="daily-warning" role="alert">Enter a positive balance and a percentage from 0 to 100.</p>}
        {initial && initial.date !== localDay() && <p className="daily-return-note">New day, fresh balance. Your last percentage is filled in for you to review.</p>}
      </section>
      <section className="daily-result" aria-label="Your planned daily stopping point">
        <div className="daily-result-label"><ShieldCheck size={19}/><span>TODAY’S STOPPING POINT</span></div>
        <output htmlFor="daily-balance daily-percent" aria-live="polite">{limit === null ? "$—" : dollars(limit)}</output>
        <p className="daily-result-description">Your planned loss limit for today—not your buying budget.</p>
        <p className="daily-formula">Stop sooner if needed. Actual losses can exceed this.</p>
        {prop && <p className="daily-warning">Your firm’s stricter limits still apply. Check its rules first.</p>}
        {limit !== null && Number(percent) > 2 && <p className={`daily-warning${Number(percent) >= 5 ? " daily-risk-warning" : ""}`}>{Number(percent) >= 5 ? "High risk. Losing days can shrink your account quickly." : "Above 2%. Make sure you accept the dollar risk."}</p>}
        {limit === 0 && <p className="daily-warning">Your chosen limit leaves no room for new trading risk today.</p>}
        <Button className="daily-save" disabled={limit === null} onClick={save}>{saved ? <><Check size={18}/> Today’s limit saved</> : "Set today’s limit"}</Button>
        <small>{saved ? "Saved on this device. You still need to stop trading yourself." : "Saves on this device only. It won’t stop trades for you."}</small>
      </section>
    </div>
    <div className="daily-bottom-rule"><p>Don’t raise your limit to win a loss back.</p></div>
    <details className="daily-how"><summary>What counts toward my limit?</summary><p>Count money lost on trades plus fees across your whole account. Trades you haven’t closed can lose money too. This is one plan for the whole day—not a new allowance for each trade.</p><p>Already lost money today? Count that too. Don’t start the allowance over or increase it because you had a win.</p><p>For example, a $500 account at 5% gives a $25 planned stopping point. That doesn’t mean you can only buy a $25 option. But buying a $100 option still puts that $100 at risk; planning to sell sooner doesn’t guarantee a smaller loss.</p><p>This tool does the math. It doesn’t choose trades, track your losses or sell for you. If a trade needs more risk than your plan allows, skip it or practice without real money.</p></details>
    <details className="daily-how"><summary>How to grow a small account</summary><p><strong>The truth: there’s no reliable shortcut.</strong> A small balance is not a reason to take bigger risks.</p><ul><li><strong>Practice first.</strong> If a trade doesn’t fit your loss budget, skip it or paper trade it.</li><li><strong>Don’t force daily income.</strong> Focus on learning a repeatable process, not doubling the account.</li><li><strong>Keep essential money out.</strong> Don’t trade with rent, emergency savings or borrowed money.</li></ul><a href="https://www.finra.org/investors/investing/investment-products/stocks/day-trading" target="_blank" rel="noopener noreferrer">Read FINRA’s day-trading risk guidance ↗</a></details>
    <details className="daily-how"><summary>How to grow a big account</summary><p><strong>More capital doesn’t mean you need more risk.</strong> Protect the money you already have while you develop your process.</p><ul><li><strong>Think in dollars.</strong> 1% of $100,000 is $1,000. Make sure the dollar loss is one you can accept.</li><li><strong>Keep one account-wide limit.</strong> Multiple positions can lose together; each trade doesn’t get a fresh budget.</li><li><strong>Don’t scale on excitement.</strong> Review your process before increasing size, not after a winning streak or to recover a loss.</li></ul><p>Neither account size nor a calculator guarantees growth. You can choose not to trade.</p></details>
    <details className="daily-how"><summary>Out-of-the-money trading strategy</summary>
      <p><strong>Use OTM contracts for a planned, fast move.</strong> A call’s strike is above the current price; a put’s is below it. Lower upfront cost can produce larger percentage gains—but not lower risk. This is an approach to practice, not a proven winning formula.</p>
      <ul>
        <li><strong>Wait for the setup.</strong> One example to test: price breaks above resistance and holds on a retest for calls; below support and fails to reclaim it for puts. Mark your profit target and where the setup fails before entering.</li>
        <li><strong>Match the contract to the move.</strong> Compare slightly OTM strikes near the current price with a small buy/sell price gap. Don’t buy a far-away strike just because it’s cheap. Skip it if losing the full purchase cost plus fees breaks your budget.</li>
        <li><strong>Trade the move, not the expiration.</strong> Sell at your target, when the setup fails or at a time limit chosen before entry. You can profit before the option reaches its strike. Don’t add to a loser.</li>
      </ul>
      <p><strong>For 0DTE:</strong> the contract expires today. If the move stalls, time decay can erode its value even when your direction is right. Know your broker’s expiration cutoff. Stops don’t guarantee protection; the full purchase price can be lost.</p>
      <p>Practice with realistic fees and fills. Judge all wins and losses together—not one big percentage gain.</p>
      <p><a href="https://syndication.finra.org/content/zeroing-options-trading-strategy-0dte" target="_blank" rel="noopener noreferrer">FINRA: understand 0DTE risks ↗</a></p>
    </details>
    <footer>A plan, not a guarantee of profits or protection.</footer>
  </div>;
}
export default function DailyLossCalculator() {
  const { user } = useAuth();
  return <Calculator key={user?.id || "local"} userKey={user?.id || "local"}/>;
}
