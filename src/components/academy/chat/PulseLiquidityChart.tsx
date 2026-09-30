import { useEffect, useState } from "react";
import { PulseChartPost, type PulseChartPostProps } from "./PulseChartPost";

export interface PulseLiquidityImage {
  url: string;
  capturedAt: number;
  /** Identifies the matching zone-only view; never reuse on a new capture. */
  baseCapturedAt: number;
}

export function PulseLiquidityChart({ liquidityChart, ...props }: PulseChartPostProps & { liquidityChart?: PulseLiquidityImage }) {
  const [show, setShow] = useState(false);
  const baseAt = props.chartCapturedAt ?? props.capturedAt;
  const available = !!props.chartUrl && !!liquidityChart
    && /^https:\/\//.test(liquidityChart.url)
    && liquidityChart.url !== props.chartUrl
    && liquidityChart.baseCapturedAt === baseAt
    && Number.isFinite(liquidityChart.capturedAt)
    && Math.abs(liquidityChart.capturedAt - baseAt) <= 90000;
  const showing = show && available;
  useEffect(() => { setShow(false); }, [props.symbol, props.timeframe, baseAt]);
  return <div className="pcp-liquidity-view">
    {available && <div className="pcp-liquidity-controls">
      <button type="button" role="switch" aria-checked={showing} onClick={() => setShow(value => !value)}>
        <span>Show liquidity</span><span className="pcp-liquidity-switch" aria-hidden="true"><i/></span>
      </button>
      {showing && <details className="pcp-liquidity-help"><summary>How to read the lines</summary>
        <p>Lines mark previous candle highs and lows.</p>
        <p><strong>Crosses, then closes back:</strong> price may turn.</p>
        <p><strong>Closes past the line:</strong> price may keep going.</p>
        <p className="pcp-liquidity-caution">Watch for a reaction—not a guaranteed move.</p>
      </details>}
    </div>}
    <PulseChartPost {...props}
      chartUrl={showing ? liquidityChart.url : props.chartUrl}
      chartCapturedAt={showing ? liquidityChart.capturedAt : props.chartCapturedAt}
      chartFocus={showing ? undefined : props.chartFocus}
      entryMarkup={showing ? undefined : props.entryMarkup}/>
  </div>;
}
