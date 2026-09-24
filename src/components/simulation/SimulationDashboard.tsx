import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SimulationChart } from "@/components/simulation/SimulationChart";
import { advanceSimulation, dumpSimulation, getSimulation, resetSimulation } from "@/services/simulationStore";
export const AUTHORIZED_WALLET = "DXVdPZ4SKvtbX7DxRgCB7n9Wh9Te1LrJqfnsSwMs8J9W";
interface SimulationToken { mintAddress: string; name: string; symbol: string; }
interface SimulationDashboardProps { open: boolean; onClose: () => void; token?: SimulationToken | null; }
export function SimulationDashboard({ open, onClose, token }: SimulationDashboardProps) {
  const [, setVersion] = useState(0); const mint = token?.mintAddress ?? "simulation-token";
  useEffect(() => { if (!open) return; const timer = window.setInterval(() => { advanceSimulation(mint); setVersion((value) => value + 1); }, 900); return () => window.clearInterval(timer); }, [open, mint]);
  if (!open) return null; const state = getSimulation(mint);
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:p-6">
    <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-6"><div className="glass w-full max-w-5xl rounded-3xl border border-accent/20 p-5 shadow-2xl sm:p-7">
      <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl text-cosmic">{token?.name || "Untitled Token"} <span className="text-accent">{"$" + (token?.symbol || "TOKEN")}</span></h2>
      <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Close"><X className="size-5" /></button></div>
      <div className="space-y-5"><SimulationChart mintAddress={mint} height={420} /><div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => dumpSimulation(mint)}>Dump</Button><Button variant="ghost" onClick={() => { resetSimulation(mint); setVersion((value) => value + 1); }}>Reset</Button>
        <span className="text-xs text-muted-foreground">{"Market cap: $" + Math.round(state.currentMarketCap).toLocaleString()}</span>
      </div></div>
    </div></div>
  </div>;
}