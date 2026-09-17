import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowUpRight, Check, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { blankPlan, calculateRisk, examplePlan, FUTURES, localDay, PAIRS, type Market, type Plan } from "@/lib/tradeRisk";
import "./risk-workbench.css";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
function Field({ label, value, change, hint, type = "number", step = "any" }: { label: string; value: string; change: (v: string) => void; hint?: string; type?: string; step?: string }) {
  const id = useId();
  return <div className="risk-field"><label htmlFor={id}>{label}</label><Input id={id} type={type} step={step} value={value} onChange={e => change(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} placeholder="Enter amount" />{hint && <small id={`${id}-hint`}>{hint}</small>}</div>;
}
function Choice({ label, value, change, options }: { label: string; value: string; change: (v: string) => void; options: [string, string][] }) {
  const id = useId();
  return <div className="risk-field"><label htmlFor={id}>{label}</label><Select value={value} onValueChange={change}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>{options.map(([v, text]) => <SelectItem value={v} key={v}>{text}</SelectItem>)}</SelectContent></Select></div>;
}
const sources = [
  ["CME · Contract sizes & ticks", "https://www.cmegroup.com/articles/faqs/micro-e-mini-equity-index-futures-frequently-asked-questions.html"],
  ["OIC · Options basics", "https://www.optionseducation.org/optionsoverview/options-basics"],
  ["OANDA · Understanding pips", "https://www.oanda.com/ca-en/skills-and-insights/education/introduction-trading/basics/what-is-a-pip/"],
  ["Topstep · Drawdown mechanics", "https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit"],
  ["FINRA · Stops are not guaranteed", "https://www.finra.org/investors/insights/stop-orders-factors-consider-during-volatile-markets"],
  ["CME · Risk percentages are a choice", "https://www.cmegroup.com/education/courses/trade-and-risk-management/the-2-percent-rule"],
];
export function MarketPlanner({ market, accountKey }: { market: Market; accountKey: string }) {
  const key = `vault-risk-v1:${accountKey}:${market}`;
  const [p, setPlan] = useState<Plan>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved && typeof saved === "object" && Object.keys(blankPlan()).every(k => typeof saved[k] === typeof blankPlan()[k as keyof Plan]) && Object.keys(FUTURES).includes(saved.future) && PAIRS.includes(saved.pair) && ["premium", "stop"].includes(saved.optionBasis)) return saved;
    } catch { /* A blocked or corrupt browser store must not block planning. */ }
    return blankPlan();
  });
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(false);
  const change = (key: keyof Plan, value: string | boolean) => { setPlan(prev => ({ ...prev, [key]: value })); setChecked(false); setSaved(false); };
  const field = (key: keyof Plan, label: string, hint?: string) => <Field label={label} value={String(p[key])} change={v => change(key, v)} hint={hint} />;
  const prop = market === "futures" && p.prop;
  const r = calculateRisk(market, p);
  const stale = p.date !== localDay();
  const valid = r.errors.length === 0 && !stale;
  const showSize = valid && r.quantity > 0;
  const setExample = () => { setPlan(examplePlan(market, prop)); setChecked(false); setSaved(false); };
  const save = () => {
    if (!valid || !checked) return;
    try { localStorage.setItem(key, JSON.stringify({ ...p, example: false })); setPlan(prev => ({...prev, example: false})); setSaved(true); toast.success("Plan saved on this device. No broker rules were changed."); }
    catch { toast.error("This browser could not save the plan. Your calculation is still available."); }
  };
  const quote = p.pair.split("/")[1];
  return <>
    <div className="risk-market-line"><div><strong>{market === "options" ? "Options · Personal account" : market === "forex" ? "Forex · Personal account" : "Futures · Choose your account"}</strong><p>{market === "options" ? "Size long calls and puts by premium risk—not the stock price." : market === "forex" ? "Turn your stop distance into lots, with currency conversion included." : "Use the right tick value. Buying power is not your risk budget."}</p></div><Button variant="ghost" onClick={setExample}>Try an example <ArrowUpRight size={16} /></Button></div>
    {market === "futures" && <div className="risk-account-choice"><Choice label="Account type" value={prop ? "prop" : "personal"} change={v => { setPlan({...blankPlan(), prop: v === "prop"}); setChecked(false); setSaved(false); }} options={[["personal", "My brokerage account"], ["prop", "Prop firm challenge"]]} /><p>Switching account type starts a fresh calculation. Nothing is connected to your broker.</p></div>}
    {p.example && <div className="risk-example">Example numbers—not a recommendation. Replace them with your account and broker details before saving.</div>}
    {stale && <div className="risk-example">This plan is dated {p.date || "another session"}. Update the date and recheck every account, loss and rule input for today.</div>}
    <div className="risk-workspace">
      <div className="risk-inputs">
        <section className="risk-step"><div className="risk-step-heading"><span>01</span><div><h2>Set today’s boundaries.</h2><p>Choose a loss you can accept. Money needed for bills does not belong here.</p></div></div>
          <div className="risk-fields">
            <Field label="Session date" type="date" value={p.date} change={v => change("date", v)} hint="Your device’s calendar date. Check your firm’s session reset separately." />
            {field("balance", prop ? "Current equity · USD" : "Morning account balance · USD", prop ? "Include open P&L. Use the firm dashboard’s current equity." : "Use this same starting balance all session; do not increase risk after a win.")}
            {prop && <>{field("floor", "Current liquidation floor · USD", "The actual breach balance—not the advertised account size.")}{field("buffer", "Leave untouched · USD", "A positive cushion above the firm floor. This is not a guaranteed safety margin.")}
              <Choice label="Drawdown type" value={p.trail} change={v => change("trail", v)} options={[["eod", "End-of-day trailing"], ["intraday", "Intraday trailing"], ["static", "Static floor"]]} />
              {field("firmRoom", "Firm daily room remaining · USD", "Copy from your dashboard. If no daily limit, enter your remaining drawdown room.")}
              <p className="risk-inline-note">{p.trail === "intraday" ? "Your floor may rise during an open trade. Recheck it after every new equity high." : p.trail === "eod" ? "The floor can move at session close, while equity breaches may still be checked intraday." : "Verify the floor after any reset, withdrawal or account change."} Firm-specific news, scaling and consistency rules are not modeled.</p></>}
            {field("daily", "My daily loss budget · USD", "A ceiling, not an amount to use up. No universal percentage is safe.")}
            {field("percent", prop ? "Per-trade risk · % of cushion" : "Per-trade risk · % of balance", prop ? "Applied to equity minus floor minus your buffer—not nominal account size." : "Your choice. The example is illustrative, not personalized advice.")}
            {field("maxLosses", "Stop after this many losing trades", "Splits your daily budget into equal loss allowances; whole numbers only.")}
          </div>
          <details className="risk-details"><summary>Already traded today? Include existing risk</summary><div className="risk-fields">
            {field("lost", "Losing trades + costs today · USD", "Sum of losses, not net P&L. Profits do not refill the budget.")}
            {field("losses", "Number of losing trades")}
            {field("reserved", "Risk still open · USD", "Additional possible loss from current prices across ALL positions in this account. Do not count unrealized losses twice in prop equity.")}
          </div><p>Manual estimates only. Correlated positions can lose together; this is one shared account budget, not a separate allowance for each market.</p></details>
        </section>
        <section className="risk-step"><div className="risk-step-heading"><span>02</span><div><h2>{market === "options" ? "Price the option risk." : market === "futures" ? "Match your contract & stop." : "Size your forex position."}</h2><p>Pick the stop your setup needs first. Then calculate size.</p></div></div>
          <div className="risk-fields">
            {market === "options" && <>
              <Choice label="Position" value={p.optionSide} change={v => change("optionSide", v)} options={[["call", "Buy a call"], ["put", "Buy a put"]]} />
              <Choice label="Size against" value={p.optionBasis} change={v => change("optionBasis", v)} options={[["premium", "Full premium loss"], ["stop", "Planned stop loss"]]} />
              {field("entry", "Entry premium · per share", "An option quoted at $1.20 costs $120 per standard contract.")}
              {p.optionBasis === "stop" && <>{field("stop", "Stop premium · per share", "The option’s exit price, not the underlying stock stop.")}{field("allowance", "Slippage allowance · per share", "Extra adverse premium movement; actual slippage may be larger.")}</>}
              {field("fees", "Round-trip fees · per contract", "Both entry and exit commissions/fees in USD; enter 0 only if verified.")}
              {field("cash", "Available settled cash · USD", "Not margin buying power. Check broker settlement and trading restrictions.")}
              {field("premiumCap", "Total premium + fee cap · USD", "The most you accept committing to this position, even with a tighter stop.")}
            </>}
            {market === "futures" && <>
              <Choice label="Contract" value={p.future} change={v => { change("future", v); change("margin", ""); change("fees", ""); change("firmCap", ""); }} options={Object.entries(FUTURES).map(([k,v]) => [k,v.name])} />
              {field("distance", "Stop distance · index points", "Distance from entry to stop, not price. Rounded up to a whole tick.")}
              {field("allowance", "Slippage allowance · ticks", "Whole ticks beyond your stop; not a worst-case guarantee.")}
              {field("fees", "Round-trip fees · per contract", "Commission, exchange and clearing fees in USD.")}
              {prop ? field("firmCap", `Remaining ${p.future} contract allowance`, "The exact allowance for this instrument after existing positions. Do not assume micros count the same as minis.") : <>{field("freeMargin", "Available margin · USD")}{field("margin", "Margin required · per contract", "Use the current broker requirement for your session. It may rise overnight.")}</>}
              <p className="risk-inline-note">{p.future}: 1 tick = {FUTURES[p.future].tick} points = {money(FUTURES[p.future].value)} per contract. {r.ticks !== null && r.ticks > 0 ? `Your stop rounds to ${r.ticks} ticks.` : ""}</p>
            </>}
            {market === "forex" && <>
              <Choice label="Currency pair" value={p.pair} change={v => { change("pair", v); change("conversion", ""); change("margin", ""); change("fees", ""); }} options={PAIRS.map(v=>[v,v])} />
              {field("distance", "Stop distance · pips", "Use pips, not fractional pipettes. JPY pairs use 0.01; others 0.0001.")}
              {quote !== "USD" && field("conversion", `1 ${quote} equals how many USD?`, "Use your broker’s loss-side conversion rate with an adverse-move allowance. Manual rate—not live.")}
              {field("allowance", "Spread + slippage allowance · pips", "Extra costs not already included in your entry-to-stop distance.")}
              {field("fees", "Round-trip fees · per standard lot", "USD per 100,000 base-currency units. Include expected financing if held overnight.")}
              {field("freeMargin", "Available margin · USD")}{field("margin", "Margin required · per standard lot", "Current broker requirement in USD; check tiered margin at the resulting size.")}
              {field("lotStep", "Broker lot increment", "Example: 0.01 standard lot = 1,000 units. Size always rounds down.")}{field("minLot", "Broker minimum lot")}
              <p className="risk-inline-note">{r.pipValue ? `At your conversion rate: ${money(r.pipValue)} per pip per standard lot.` : "USD account only. One standard lot = 100,000 base-currency units."}</p>
            </>}
          </div>
        </section>
      </div>
      <aside className="risk-summary" aria-label="Position sizing result">
        <div className="risk-summary-top"><ShieldCheck size={20} /><span>YOUR RISK PLAN</span><span className="risk-manual">Manual inputs</span></div>
        <p className="risk-result-label">{p.example ? "Example position size" : "Size within your inputs"}</p>
        <div className="risk-size"><strong>{valid ? r.quantity.toLocaleString("en-US", {maximumFractionDigits:5}) : "—"}</strong><span>{r.unit}</span></div>
        <p className="risk-result-message">{!valid ? "Complete your inputs to see a size." : !showSize ? "No new position fits these limits." : "A sizing estimate—not a signal to trade."}</p>
        {valid && !showSize && <div className="risk-danger"><AlertTriangle size={18}/><p>{r.warnings[0]}</p></div>}
        {market === "forex" && showSize && <p>{Math.round(r.quantity * 100000).toLocaleString()} base-currency units</p>}
        <dl className="risk-totals">
          <div><dt>{prop ? "Cushion after buffer" : "Account balance"}</dt><dd>{money(r.basis)}</dd></div>
          <div><dt>Daily loss ceiling</dt><dd>{money(r.daily)}</dd></div>
          <div><dt>Daily room remaining</dt><dd>{money(r.remaining)}</dd></div>
          <div className="risk-total-focus"><dt>This trade’s budget</dt><dd>{valid ? money(r.budget) : "—"}</dd></div>
          <div><dt>{market === "options" && p.optionBasis === "premium" ? "Full-premium risk + fees" : "Planned loss + costs"}</dt><dd>{valid ? money(r.planned) : "—"}</dd></div>
          {market === "options" && <div><dt>Entire premium + fees at risk</dt><dd>{valid ? money(r.fullPremium || 0) : "—"}</dd></div>}
          {market !== "options" && !prop && <div><dt>Estimated margin used</dt><dd>{valid ? money(r.capital) : "—"}</dd></div>}
        </dl>
        {valid && market === "options" && p.optionBasis === "stop" && (r.fullPremium || 0) > r.budget && <div className="risk-danger"><AlertTriangle size={18}/><p>Full-premium loss is larger than your trade budget. The stop estimate does not cap your loss.</p></div>}
        {r.errors.length > 0 && <details className="risk-details risk-errors"><summary>{r.errors.length} input{r.errors.length === 1 ? "" : "s"} to complete</summary><ul>{r.errors.map(e=><li key={e}>{e}</li>)}</ul></details>}
        <div className="risk-confirm"><Checkbox id={`${market}-verify`} checked={checked} onCheckedChange={v=>{setChecked(v === true); setSaved(false);}}/><label htmlFor={`${market}-verify`}>I checked these numbers against my account and broker rules today.</label></div>
        <Button className="risk-save" disabled={!valid || !checked} onClick={save}>{saved ? <><Check size={18}/> Saved on this device</> : "Save today’s plan"}</Button>
        <p className="risk-save-note">No broker connection. This saves a reminder, not an enforced trading limit. Recheck before each trade.</p>
        <div className="risk-rules"><h3>Three rules to take with you</h3><ol><li>Do not increase size to recover a loss.</li><li>Do not widen the stop after entry.</li><li>Stop at your dollar or losing-trade limit.</li></ol></div>
      </aside>
    </div>
    <div className="risk-footnotes"><details className="risk-details"><summary>How the calculation works & what it cannot protect against</summary>
      <p>Per-trade budget is the smallest of your percentage-based limit, daily ceiling divided by your losing-trade limit, and remaining daily room. Prop plans also respect the entered floor cushion and firm daily room. Profits never refill the personal daily budget.</p>
      <p>{market === "options" ? "Standard contracts use a 100 multiplier. Full-premium sizing divides budget by premium × 100 + fees. Stop sizing uses (entry premium − stop premium + allowance) × 100 + fees, capped at full premium + fees. Settled cash and your premium cap also limit size." : market === "futures" ? "Loss per contract = (stop ticks rounded up + slippage ticks) × tick value + round-trip fees. Divide trade budget by that loss; round contracts down. Brokerage margin or the entered prop contract ceiling can reduce size further." : "Pip value per standard lot = pip size × 100,000 × quote-to-USD conversion. Loss per lot = (stop pips + allowance) × pip value + round-trip fees. Divide budget by loss per lot, apply margin capacity, round down to the broker increment and enforce the minimum lot."}</p>
      <ul>{r.warnings.map(w=><li key={w}>{w}</li>)}</ul>
      <p>Results do not assess strategy expectancy, option Greeks, liquidity, portfolio stress, tax, news restrictions or all broker/prop rules. A small position can still lose. Only not taking a position avoids that position’s market risk.</p>
      <nav className="risk-sources" aria-label="Calculation sources">{sources.map(([name,url])=><a key={url} href={url} target="_blank" rel="noreferrer">{name} <ArrowUpRight size={14}/></a>)}</nav>
      <p>References reviewed September 11, 2026. Verify current contracts and account rules before use.</p>
    </details></div>
  </>;
}
export default function RiskWorkbench() {
  const { user } = useAuth();
  const [market, setMarket] = useState<Market>("options");
  return <div className="risk-workbench">
    <header className="risk-header"><div><p className="risk-eyebrow">TRADE OS / DAILY RISK PLANNER</p><h1>Know your limit.<br/><span>Then size your trade.</span></h1><p>One account. A clear loss budget. No guessing your size.</p></div><Link to="/academy/learn"><BookOpen size={17}/> Learn risk basics <ArrowUpRight size={15}/></Link></header>
    <Tabs value={market} onValueChange={v=>setMarket(v as Market)} className="risk-tabs"><TabsList aria-label="Trading market"><TabsTrigger value="options">Options</TabsTrigger><TabsTrigger value="futures">Futures</TabsTrigger><TabsTrigger value="forex">Forex</TabsTrigger></TabsList>
      {(["options","futures","forex"] as Market[]).map(m=><TabsContent forceMount value={m} key={m}><MarketPlanner key={`${user?.id}:${m}`} market={m} accountKey={user?.id || "local"}/></TabsContent>)}
    </Tabs>
    <footer className="risk-footer"><ShieldCheck size={17}/><p>Educational estimates, not financial advice. Risk management cannot guarantee profits or prevent losses. No trades are placed or blocked by Vault.</p><span>USD accounts · Device-only saving</span></footer>
  </div>;
}
