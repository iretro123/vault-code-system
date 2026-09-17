import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight } from "lucide-react";

export function CommunityGuide({ onSwitchTab }: { onSwitchTab?: (tab: string) => void }) {
  return <aside className="community-guide" aria-label="Community guide">
    <section>
      <h2>Learn together.</h2>
      <p>Share a chart, explain what you see, and ask one clear question.</p>
      <small>Include the ticker + timeframe. Hide account details before sharing.</small>
    </section>
    <section>
      <h2>Before the open</h2>
      <Link to="/academy/trade">Set your daily risk limit <ChevronRight size={16}/></Link>
      <Link to="/academy/live">Find your next class <ChevronRight size={16}/></Link>
    </section>
    <section>
      <h2>A win worth sharing</h2>
      <p>Waited for confirmation? Stuck to your limit? Share what you learned, not just your P&L.</p>
      <button onClick={() => onSwitchTab?.("wins")}>Open Wins <ArrowUpRight size={16}/></button>
    </section>
    <section>
      <h2>Protect your account</h2>
      <p>No guaranteed returns. Never share passwords or send money to someone offering to trade for you.</p>
    </section>
  </aside>;
}
