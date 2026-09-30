import { PulseCandleChart } from "./PulseCandleChart";
import { pulseHeadline, type PulsePost } from "@/lib/spxPulse";
import { type PulseChartPostProps } from "./PulseChartPost";
import { PulseLiquidityChart } from "./PulseLiquidityChart";
import type { PulseChartFocus } from "@/lib/pulseChartFocus";
import "./zone-pulse.css";

export function PulseOrb({ active = false }: { active?: boolean }) {
  return <span aria-hidden="true" className={`pulse-orb ${active ? "pulse-orb-active" : ""}`}><span/><i/></span>;
}

export function ZonePulseCard({ post, earlierChart, featured = true, arriving = false, showIdentity = true, reactions, onReact, reactionsDisabled }: { post: PulsePost & { chartFocus?: PulseChartFocus }; earlierChart?: PulsePost; featured?: boolean; arriving?: boolean; showIdentity?: boolean } & Pick<PulseLiquidityChartProps, "reactions" | "onReact" | "reactionsDisabled">) {
  const prior = !post.chartUrl && earlierChart?.zoneId === post.zoneId && earlierChart?.symbol === post.symbol
    && earlierChart?.timeframe === post.timeframe && earlierChart?.side === post.side
    && earlierChart?.lower === post.lower && earlierChart?.upper === post.upper
    && (earlierChart.capturedAt ?? earlierChart.at) <= post.at ? earlierChart : undefined;
  const chart = prior ?? post;
  const imageOk = !!chart.chartUrl && (/^\/api\/spx-pulse\/image\/[a-zA-Z0-9:_-]+$/.test(chart.chartUrl) || /^https:\/\//.test(chart.chartUrl));
  const hasLevels = post.source === "indicator" || post.levelsSource === "indicator-labels";
  const caughtUp = post.confirmed && post.closedAt !== undefined && post.at - post.closedAt > 90000;
  return <PulseLiquidityChart
    symbol={post.symbol.split(":").at(-1)!}
    timeframe={post.timeframe}
    side={post.side}
    headline={pulseHeadline(post)}
    directionCue={["observed", "entered", "holding", "returned"].includes(post.kind)}
    capturedAt={post.at}
    chartCapturedAt={chart.capturedAt ?? chart.at}
    captureContext={prior ? "earlier" : post.captureContext}
    captureStatus={post.captureStatus ?? (post.source === "indicator" ? "unavailable" : "pending")}
    chartUrl={imageOk ? chart.chartUrl : undefined}
    fallbackChart={post.source === "indicator" && post.bars?.length ? <PulseCandleChart post={post}/> : undefined}
    chartFocus={prior ? undefined : post.chartFocus}
    liquidityChart={chart.liquidityChart}
    lower={hasLevels ? post.lower : undefined}
    upper={hasLevels ? post.upper : undefined}
    note={caughtUp ? "Earlier move · Added after the feed caught up." : undefined}
    arriving={arriving}
    showIdentity={showIdentity}
    defaultShowChart={featured}
    reactions={reactions}
    onReact={onReact}
    reactionsDisabled={reactionsDisabled}
  />;
}
