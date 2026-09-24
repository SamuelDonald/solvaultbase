import { useEffect, useMemo, useState } from "react";
import { getSimulation } from "@/services/simulationStore";
export function SimulationChart({ mintAddress, height = 420 }: { mintAddress: string; height?: number }) {
  const [version, setVersion] = useState(0);
  useEffect(() => { const handler = () => setVersion((value) => value + 1); window.addEventListener("solbase-simulation-updated", handler); return () => window.removeEventListener("solbase-simulation-updated", handler); }, []);
  const state = useMemo(() => getSimulation(mintAddress), [mintAddress, version]);
  const candles = state.candles.slice(-58); const width = 1000; const chartHeight = height - 72; const volumeHeight = 54;
  const left = 12, right = 76, top = 12, bottom = 28; const plotWidth = width - left - right; const priceHeight = chartHeight - top - bottom - volumeHeight;
  const prices = candles.flatMap((c) => [c.high, c.low]); const minPrice = Math.max(1, Math.min(...prices) * 0.86); const maxPrice = Math.max(...prices) * 1.08;
  const range = Math.max(1, maxPrice - minPrice); const maxVolume = Math.max(...candles.map((c) => c.volume), 1); const candleWidth = Math.max(5, (plotWidth / candles.length) * 0.62);
  const x = (index: number) => left + ((index + 0.5) / candles.length) * plotWidth; const y = (price: number) => top + ((maxPrice - price) / range) * priceHeight;
  const formatMc = (value: number) => value >= 1000000 ? "$" + (value / 1000000).toFixed(2) + "M" : "$" + Math.round(value / 1000) + "K";
  const ticks = [maxPrice, maxPrice * 0.75, maxPrice * 0.5, maxPrice * 0.25, minPrice];
  return <div className="overflow-hidden rounded-2xl border border-border/60 bg-[#080b10]">
    <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
      <div><p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Market Cap</p><p className="font-display text-2xl">{formatMc(state.currentMarketCap)}</p></div>
      <div className="text-right text-[10px] uppercase tracking-wider text-muted-foreground"><div>Vol</div><div className="mt-1 text-foreground">{"$" + Math.round(candles[candles.length - 1]?.volume || 0).toLocaleString()}</div></div>
    </div>
    <div className="w-full overflow-x-auto"><svg viewBox={"0 0 " + width + " " + height} className="min-w-[760px] w-full">
      {ticks.map((tick, index) => <g key={index}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="currentColor" opacity=".09" /><text x={width - right + 10} y={y(tick) + 4} fill="currentColor" opacity=".48" fontSize="11">{formatMc(tick)}</text></g>)}
      {candles.map((candle, index) => { const px = x(index); const bullish = candle.close >= candle.open; const bodyTop = y(Math.max(candle.open, candle.close)); const bodyBottom = y(Math.min(candle.open, candle.close)); const bodyHeight = Math.max(2, bodyBottom - bodyTop); const volumeY = chartHeight - (candle.volume / maxVolume) * volumeHeight; const fill = bullish ? "hsl(var(--success))" : "hsl(var(--destructive))"; return <g key={candle.time + "-" + index}>
        <line x1={px} x2={px} y1={y(candle.high)} y2={y(candle.low)} stroke={fill} strokeWidth="1.2" opacity=".9" /><rect x={px - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" fill={fill} /><rect x={px - candleWidth / 2} y={volumeY} width={candleWidth} height={Math.max(1, chartHeight - volumeY)} fill={fill} opacity=".32" /></g>; })}
      <line x1={left} x2={width - right} y1={chartHeight} y2={chartHeight} stroke="currentColor" opacity=".12" /><text x={left} y={height - 7} fill="currentColor" opacity=".4" fontSize="10">LIVE</text><text x={width - right - 32} y={height - 7} fill="currentColor" opacity=".4" fontSize="10">MC</text>
    </svg></div>
  </div>;
}