export interface SimCandle { time: number; open: number; high: number; low: number; close: number; volume: number; }
export interface SimulationState { mintAddress: string; currentSol: number; currentMarketCap: number; phase: "idle" | "rising" | "dumped"; candles: SimCandle[]; updatedAt: string; }
const KEY = "solbase-vault-simulation";
const START_MC = 15000;
const TARGET_MC = 2000000;
const read = (): Record<string, SimulationState> => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const write = (all: Record<string, SimulationState>) => { localStorage.setItem(KEY, JSON.stringify(all)); window.dispatchEvent(new CustomEvent("solbase-simulation-updated")); };
const makeCandle = (time: number, open: number, close: number, volume: number, volatility = 0.04): SimCandle => {
  const spread = Math.max(open, close) * volatility;
  return { time, open, close, high: Math.max(open, close) + spread * (0.45 + Math.random() * 0.8), low: Math.max(1, Math.min(open, close) - spread * (0.3 + Math.random() * 0.65)), volume };
};
function initialCandles(): SimCandle[] {
  const candles: SimCandle[] = []; let price = START_MC; const now = Date.now();
  for (let i = 0; i < 34; i++) {
    const progress = i / 34; const open = price; const momentum = 1 + progress * 0.7;
    const pullback = i % 7 === 5 ? 0.94 : 1; const close = Math.min(TARGET_MC, open * (1 + 0.012 * momentum) * pullback);
    candles.push(makeCandle(now - (34 - i) * 45000, open, close, 900 + i * 180)); price = close;
  }
  return candles;
}
export function getSimulation(mintAddress: string): SimulationState {
  const all = read(); if (all[mintAddress]) return all[mintAddress];
  const candles = initialCandles();
  const state: SimulationState = { mintAddress, currentSol: candles[candles.length - 1].close / 1000000, currentMarketCap: candles[candles.length - 1].close, phase: "idle", candles, updatedAt: new Date().toISOString() };
  all[mintAddress] = state; write(all); return state;
}
export function advanceSimulation(mintAddress: string): SimulationState {
  const state = getSimulation(mintAddress); if (state.phase === "dumped" || state.currentMarketCap >= TARGET_MC) return state;
  const last = state.candles[state.candles.length - 1]; const progress = state.currentMarketCap / TARGET_MC;
  const multiplier = 1.035 + progress * 0.035; const next = Math.min(TARGET_MC, state.currentMarketCap * multiplier);
  const candle = makeCandle(Date.now(), last.close, next, Math.max(1500, (next - last.close) * 0.75), 0.055);
  const all = read(); const updated: SimulationState = { ...state, currentSol: next / 1000000, currentMarketCap: next, phase: "rising", candles: [...state.candles, candle].slice(-90), updatedAt: new Date().toISOString() };
  all[mintAddress] = updated; write(all); return updated;
}
export function dumpSimulation(mintAddress: string): SimulationState {
  const state = getSimulation(mintAddress); if (state.phase === "dumped") return state;
  const open = state.currentMarketCap;
  const candle: SimCandle = { time: Date.now(), open, close: 1, high: open * 1.03, low: 0.01, volume: Math.max(20000, open * 0.12) };
  const all = read(); const updated: SimulationState = { ...state, currentSol: 0, currentMarketCap: 0, phase: "dumped", candles: [...state.candles, candle].slice(-90), updatedAt: new Date().toISOString() };
  all[mintAddress] = updated; write(all); return updated;
}
export function resetSimulation(mintAddress: string): SimulationState {
  const all = read(); delete all[mintAddress]; write(all); return getSimulation(mintAddress);
}