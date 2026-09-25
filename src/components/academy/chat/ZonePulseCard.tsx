import { pulseHeadline, type PulsePost } from "@/lib/spxPulse";
import { PulseChartPost } from "./PulseChartPost";
import "./zone-pulse.css";

export function PulseOrb({ active = false }: { active?: boolean }) {
  return <span aria-hidden="true" className={`pulse-orb ${active ? "pulse-orb-active" : ""}`}><span/><i/></span>;
}

export function ZonePulseCard({ post, featured = true, arriving = false, showIdentity = true }: { post: PulsePost; featured?: boolean; arriving?: boolean; showIdentity?: boolean }) {
  const imageOk = !!post.chartUrl && (/^\/api\/spx-pulse\/image\/[a-zA-Z0-9:_-]+$/.test(post.chartUrl) || /^https:\/\//.test(post.chartUrl));
  const hasLevels = post.source === "indicator" || post.levelsSource === "indicator-labels";
  const caughtUp = post.confirmed && post.closedAt !== undefined && post.at - post.closedAt > 90000;
  return <PulseChartPost
    symbol={post.symbol.split(":").at(-1)!}
    timeframe={post.timeframe}
    side={post.side}
    headline={pulseHeadline(post)}
    capturedAt={post.at}
    chartCapturedAt={post.capturedAt ?? post.at}
    captureStatus={post.captureStatus ?? (post.source === "indicator" ? "unavailable" : "pending")}
    chartUrl={imageOk ? post.chartUrl : undefined}
    lower={hasLevels ? post.lower : undefined}
    upper={hasLevels ? post.upper : undefined}
    note={caughtUp ? "Earlier move · Added after the feed caught up." : undefined}
    arriving={arriving}
    showIdentity={showIdentity}
    defaultShowChart={featured}
  />;
}
