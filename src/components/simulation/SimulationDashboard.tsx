import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SimulationChart } from "@/components/simulation/SimulationChart";
import { dumpSimulation, getSimulation, riseSimulation } from "@/services/simulationStore";

export const AUTHORIZED_WALLET =
  "DXVdPZ4SKvtbX7DxRgCB7n9Wh9Te1LrJqfnsSwMs8J9W";

interface SimulationToken {
  mintAddress: string;
  name: string;
  symbol: string;
}

interface SimulationDashboardProps {
  open: boolean;
  onClose: () => void;
  token?: SimulationToken | null;
}

export function SimulationDashboard({ open, onClose, token }: SimulationDashboardProps) {
  const [rise, setRise] = useState("1");

  useEffect(() => {
    if (open) setRise("1");
  }, [open]);

  if (!open) return null;

  const mint = token?.mintAddress ?? "simulation-token";
  const state = getSimulation(mint);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-5xl rounded-3xl border border-accent/20 p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-accent">Private simulation controls</p>
            <h2 className="mt-1 font-display text-2xl text-cosmic">Market Simulation Dashboard</h2>
            <p className="mt-1 text-xs text-muted-foreground">Visual-only simulation. No trades or blockchain state are changed.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl bg-secondary/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Simulation token</p>
            <p className="mt-1 text-lg font-medium text-foreground">
              {token?.name || "Untitled Token"}{" "}
              <span className="text-accent">${token?.symbol || "TOKEN"}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Using the token details entered in the launch form. This is a simulated token, not a blockchain launch.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Token</label>
              <div className="flex h-10 items-center rounded-xl border border-border bg-background px-3 text-sm">
                {token?.name || "Untitled Token"} (${"{"}{token?.symbol || "TOKEN"})
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Rise by SOL</label>
              <Input type="number" min="0.01" step="0.1" value={rise} onChange={(event) => setRise(event.target.value)} />
            </div>
          </div>
          <SimulationChart mintAddress={mint} height={340} />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => riseSimulation(mint, Number(rise))}>Rise SOL</Button>
            <Button variant="outline" onClick={() => dumpSimulation(mint)}>Dump</Button>
            <Button variant="ghost" onClick={() => { localStorage.removeItem("solbase-vault-simulation"); window.location.reload(); }}>Reset</Button>
            <span className="text-xs text-muted-foreground">Current simulated price: {state.currentSol.toFixed(4)} SOL</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Simulation ID: {mint}</p>
        </div>
      </div>
    </div>
  );
}