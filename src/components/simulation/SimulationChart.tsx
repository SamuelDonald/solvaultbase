import { useEffect, useMemo, useState } from "react";
import { getSimulation } from "@/services/simulationStore";

const START_CAP = 15000;

export function SimulationChart({ mintAddress, height = 420 }: { mintAddress: string; height?: number }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion((value) => value + 1);
    window.addEventListener("solbase-simulation-updated", handler);
    return () => window.removeEventListener("solbase-simulation-updated", handler);
  }, []);

  const state = useMemo(() => getSimulation(mintAddress), [mintAddress, version]);
  const points = state.candles
    .slice(-90)
    .map((c) => ({ time: c.time, value: Number.isFinite(c.close) ? c.close : 0 }))
    .filter((p) => Number.isFinite(p.value));

  if (!points.length) return null;

  const width = 1000;
  const top = 18;
  const left = 18;
  const right = 78;
  const bottom = 42;
  const chartHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const maxValue = Math.max(START_CAP, ...points.map((p) => p.value)) * 1.08;
  const minValue = 0;
  const range = Math.max(1, maxValue - minValue);
  const x = (i: number) => left + (i / Math.max(1, points.length - 1)) * plotWidth;
  const y = (value: number) => top + ((maxValue - Math.max(0, value)) / range) * chartHeight;

  const formatCap = (value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : START_CAP;
    if (safe >= 1000000) return "$" + (safe / 1000000).toFixed(2) + "M";
    return "$" + Math.round(safe / 1000) + "K";
  };

  const splitIndex = points.reduce((last, point, index) => point.value === 0 ? index : last, -1);
  const lineSegments: { d: string; rising: boolean }[] = [];
  const risingEnd = splitIndex > 0 ? splitIndex - 1 : points.length - 1;

  if (risingEnd >= 0) {
    const risingPoints = points.slice(0, risingEnd + 1);
    if (risingPoints.length > 1) {
      lineSegments.push({
        rising: true,
        d: risingPoints.map((p, i) => (i === 0 ? "M " : "L ") + x(i) + " " + y(p.value)).join(" "),
      });
    }
  }

  if (splitIndex > 0) {
    const dumpPoints = points.slice(splitIndex - 1);
    lineSegments.push({
      rising: false,
      d: dumpPoints.map((p, i) => (i === 0 ? "M " : "L ") + x(splitIndex - 1 + i) + " " + y(p.value)).join(" "),
    });
  }

  const ticks = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-[#080b10]">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Market Cap</p>
          <p className="font-display text-2xl">{formatCap(state.currentMarketCap)}</p>
        </div>
        <div className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
          <div>Vol</div>
          <div className="mt-1 text-foreground">
            {"$" + Math.round(points.length ? state.candles[state.candles.length - 1]?.volume || 0 : 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={"0 0 " + width + " " + height} className="min-w-[760px] w-full" role="img" aria-label="Market cap chart">
          {ticks.map((tick, index) => (
            <g key={index}>
              <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="currentColor" opacity=".08" />
              <text x={width - right + 10} y={y(tick) + 4} fill="currentColor" opacity=".48" fontSize="11">{formatCap(tick)}</text>
            </g>
          ))}

          <line x1={left} x2={width - right} y1={y(state.currentMarketCap)} y2={y(state.currentMarketCap)} stroke="currentColor" strokeDasharray="4 4" opacity=".16" />

          {lineSegments.map((segment, index) => (
            <path
              key={index}
              d={segment.d}
              fill="none"
              stroke={segment.rising ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {points.slice(-1).map((point) => (
            <circle key={point.time} cx={x(points.length - 1)} cy={y(point.value)} r="4" fill={point.value === 0 ? "hsl(var(--destructive))" : "hsl(var(--success))"} />
          ))}

          <text x={left} y={height - 12} fill="currentColor" opacity=".38" fontSize="10">LIVE</text>
          <text x={width - right - 18} y={height - 12} fill="currentColor" opacity=".38" fontSize="10">MC</text>
        </svg>
      </div>
    </div>
  );
}
