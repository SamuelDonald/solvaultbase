export interface SimCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SimulationState {
  mintAddress: string;
  currentSol: number;
  currentMarketCap: number;
  phase: "idle" | "rising" | "dumped";
  candles: SimCandle[];
  updatedAt: string;
}

const KEY = "solbase-vault-simulation";
const START_MC = 15000;
const TARGET_MC = 2000000;

const read = (): Record<string, SimulationState> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

const write = (all: Record<string, SimulationState>) => {
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("solbase-simulation-updated"));
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidState = (value: unknown): value is SimulationState => {
  if (!value || typeof value !== "object") return false;

  const state = value as Partial<SimulationState>;
  if (!isFiniteNumber(state.currentMarketCap) || state.currentMarketCap < 0) return false;
  if (!isFiniteNumber(state.currentSol) || state.currentSol < 0) return false;
  if (!Array.isArray(state.candles) || state.candles.length === 0) return false;

  return state.candles.every(
    (candle) =>
      candle &&
      isFiniteNumber(candle.time) &&
      isFiniteNumber(candle.open) &&
      isFiniteNumber(candle.high) &&
      isFiniteNumber(candle.low) &&
      isFiniteNumber(candle.close) &&
      isFiniteNumber(candle.volume) &&
      candle.high >= Math.max(candle.open, candle.close) &&
      candle.low <= Math.min(candle.open, candle.close),
  );
};

const makeCandle = (
  time: number,
  open: number,
  close: number,
  volume: number,
  volatility = 0.04,
): SimCandle => {
  const spread = Math.max(open, close, 1) * volatility;
  return {
    time,
    open,
    close,
    high: Math.max(open, close) + spread * (0.45 + Math.random() * 0.8),
    low: Math.max(0, Math.min(open, close) - spread * (0.3 + Math.random() * 0.65)),
    volume,
  };
};

function initialCandles(): SimCandle[] {
  const candles: SimCandle[] = [];
  const now = Date.now();

  for (let i = 0; i < 34; i++) {
    const wobble = Math.sin(i * 0.9) * 0.012;
    const open = START_MC * (1 + wobble);
    const close =
      i === 33
        ? START_MC
        : Math.max(START_MC * 0.97, open * (1 + 0.004 + wobble * 0.25));

    candles.push(
      makeCandle(
        now - (34 - i) * 45000,
        open,
        close,
        900 + i * 180,
        0.035,
      ),
    );
  }

  candles[candles.length - 1] = makeCandle(
    now - 45000,
    START_MC,
    START_MC,
    6500,
    0.025,
  );

  return candles;
}

export function getSimulation(mintAddress: string): SimulationState {
  const all = read();
  const existing = all[mintAddress];

  if (isValidState(existing)) {
    return existing;
  }

  const candles = initialCandles();
  const state: SimulationState = {
    mintAddress,
    currentSol: START_MC / 1000000,
    currentMarketCap: START_MC,
    phase: "idle",
    candles,
    updatedAt: new Date().toISOString(),
  };

  all[mintAddress] = state;
  write(all);
  return state;
}

export function advanceSimulation(mintAddress: string): SimulationState {
  const state = getSimulation(mintAddress);

  if (state.phase === "dumped" || state.currentMarketCap >= TARGET_MC) {
    return state;
  }

  const last = state.candles[state.candles.length - 1];
  const progress = state.currentMarketCap / TARGET_MC;
  const multiplier = 1.035 + progress * 0.035;
  const next = Math.min(TARGET_MC, state.currentMarketCap * multiplier);

  const candle = makeCandle(
    Date.now(),
    last.close,
    next,
    Math.max(1500, (next - last.close) * 0.75),
    0.055,
  );

  const updated: SimulationState = {
    ...state,
    currentSol: next / 1000000,
    currentMarketCap: next,
    phase: "rising",
    candles: [...state.candles, candle].slice(-90),
    updatedAt: new Date().toISOString(),
  };

  const all = read();
  all[mintAddress] = updated;
  write(all);
  return updated;
}

export function dumpSimulation(mintAddress: string): SimulationState {
  const state = getSimulation(mintAddress);

  if (state.phase === "dumped") return state;

  const open = Math.max(START_MC, state.currentMarketCap);
  const candle: SimCandle = {
    time: Date.now(),
    open,
    close: 0,
    high: open * 1.03,
    low: 0,
    volume: Math.max(20000, open * 0.12),
  };

  const updated: SimulationState = {
    ...state,
    currentSol: 0,
    currentMarketCap: 0,
    phase: "dumped",
    candles: [...state.candles, candle].slice(-90),
    updatedAt: new Date().toISOString(),
  };

  const all = read();
  all[mintAddress] = updated;
  write(all);
  return updated;
}

export function resetSimulation(mintAddress: string): SimulationState {
  const all = read();
  delete all[mintAddress];
  write(all);
  return getSimulation(mintAddress);
}
