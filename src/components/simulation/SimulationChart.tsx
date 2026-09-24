import { useEffect, useState } from "react";
import { getSimulation } from "@/services/simulationStore";

const START_CAP = 15000;
const RISE_STROKE = "#22c55e";
const DUMP_STROKE = "#ef4444";

export function SimulationChart({
  mintAddress,
  height = 420,
}: {
  mintAddress: string;
  height?: number;
}) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion((value) => value + 1);
    window.addEventListener("solbase-simulation-updated", handler);
    return () =>
      window.removeEventListener("solbase-simulation-updated", handler);
  }, []);

  const state = getSimulation(mintAddress);
  const values = state.candles
    .map((candle) => candle.close)
    .filter((value): value is number => Number.isFinite(value));

  const points = values.length > 0 ? values : [START_CAP];
  const width = 1000;
  const top = 24;
  const left = 20;
  const right = 92;
  const bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = Math.max(180, height - top - bottom);
  const maxValue = Math.max(START_CAP, ...points) * 1.08;
  const x = (index: number) =>
    left +
    (index / Math.max(1, points.length - 1)) * plotWidth;
  const y = (value: number) =>
    top + ((maxValue - Math.max(0, value)) / maxValue) * plotHeight;

  const risingPoints: string[] = [];
  const dumpPoints: string[] = [];
  let dumpIndex = -1;

  for (let i = 0; i < points.length; i += 1) {
    if (points[i] === 0) {
      dumpIndex = i;
      break;
    }
  }

  const riseEnd = dumpIndex >= 0 ? dumpIndex - 1 : points.length - 1;
  for (let i = 0; i <= riseEnd; i += 1) {
    risingPoints.push(`${x(i)},${y(points[i])}`);
  }

  if (dumpIndex > 0) {
    dumpPoints.push(`${x(dumpIndex - 1)},${y(points[dumpIndex - 1])}`);
    dumpPoints.push(`${x(dumpIndex)},${y(0)}`);
  }

  const formatCap = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    return `$${Math.round(value / 1000)}K`;
  };

  const ticks = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-[#080b10]">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">
            Market Cap
          </p>
          <p className="font-display text-2xl">
            {formatCap(
              Number.isFinite(state.currentMarketCap)
                ? state.currentMarketCap
                : START_CAP,
            )}
          </p>
        </div>
        <div className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
          <div>Vol</div>
          <div className="mt-1 text-foreground">
            ${Math.round(
              state.candles[state.candles.length - 1]?.volume || 0,
            ).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block min-w-[760px] w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Market cap chart"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#ffffff"
                strokeOpacity="0.08"
              />
              <text
                x={width - right + 12}
                y={y(tick) + 4}
                fill="#ffffff"
                fillOpacity="0.48"
                fontSize="11"
              >
                {formatCap(tick)}
              </text>
            </g>
          ))}

          {risingPoints.length > 1 && (
            <polyline
              points={risingPoints.join(" ")}
              fill="none"
              stroke={RISE_STROKE}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {dumpPoints.length === 2 && (
            <polyline
              points={dumpPoints.join(" ")}
              fill="none"
              stroke={DUMP_STROKE}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          <circle
            cx={x(points.length - 1)}
            cy={y(points[points.length - 1])}
            r="5"
            fill={points[points.length - 1] === 0 ? DUMP_STROKE : RISE_STROKE}
          />

          <text
            x={left}
            y={height - 12}
            fill="#ffffff"
            fillOpacity="0.38"
            fontSize="10"
          >
            LIVE
          </text>
          <text
            x={width - right - 18}
            y={height - 12}
            fill="#ffffff"
            fillOpacity="0.38"
            fontSize="10"
          >
            MC
          </text>
        </svg>
      </div>
    </div>
  );
}
