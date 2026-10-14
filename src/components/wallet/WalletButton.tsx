import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, LogOut, Wallet, SlidersHorizontal, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { SimulationDashboard, AUTHORIZED_WALLET } from "@/components/simulation/SimulationDashboard";
import { truncateAddress } from "@/lib/utils";
import { useSolBalance } from "@/services/walletService";

const CONNECT_TIMEOUT_MS = 20_000;

export function WalletButton({ full = false }: { full?: boolean }) {
  const { wallets, select, connect, connected, connecting, publicKey, disconnect } = useWallet();
  const { data: balance } = useSolBalance();
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [requestingWallet, setRequestingWallet] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const requestId = useRef(0);
  const pendingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearRequest() {
    requestId.current += 1;
    pendingRef.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRequestingWallet(null);
    setTimedOut(false);
  }

  async function cancelConnection(showToast = true) {
    clearRequest();
    try {
      // Best-effort cancellation: some wallet extensions keep their own popup
      // open, but disconnect resets the app's pending adapter state.
      await disconnect();
    } catch {
      // The local UI is still reset even if the adapter cannot cancel its popup.
    }
    if (showToast) toast.info("Connection cancelled. You can try again.");
  }

  async function connectWallet(walletName: string) {
    // If a previous extension request stalled, reset the adapter before retrying
    // or switching providers. Some extension popups may remain open.
    if (pendingRef.current) {
      try {
        await disconnect();
      } catch {
        // Continue with a fresh request even if the adapter cannot cancel the old one.
      }
    }
    const thisRequest = ++requestId.current;
    pendingRef.current = true;
    setRequestingWallet(walletName);
    setTimedOut(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (requestId.current === thisRequest) setTimedOut(true);
    }, CONNECT_TIMEOUT_MS);

    try {
      // Select the adapter first, then connect. The wallet's own approval UI
      // remains under the wallet provider's control.
      select(walletName);
      await connect();
      if (requestId.current === thisRequest) {
        clearRequest();
        toast.success(`Connected to ${walletName}`);
      }
    } catch (error) {
      if (requestId.current === thisRequest) {
        clearRequest();
        const message = error instanceof Error ? error.message : "Wallet connection failed";
        toast.error(message);
      }
    }
  }

  useEffect(() => () => {
    requestId.current += 1;
    if (timer.current) clearTimeout(timer.current);
    if (pendingRef.current) {
      pendingRef.current = false;
      void disconnect().catch(() => {
        // Best effort when the connection dialog closes or unmounts.
      });
    }
  }, [disconnect]);

  if (connected && publicKey) {
    const address = publicKey.toBase58();
    const authorized = address === AUTHORIZED_WALLET;
    return <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" className={full ? "w-full" : ""}>
            <span className="mr-1 inline-block size-2 rounded-full bg-success live-dot" />
            <span className="font-mono text-xs">{truncateAddress(address)}</span>
            <span className="ml-3 hidden text-xs text-muted-foreground sm:inline">{balance !== undefined ? `${balance.toFixed(3)} SOL` : "…"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="break-all font-mono text-xs">{address}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { void navigator.clipboard.writeText(address); toast.success("Wallet address copied"); }}><Copy className="size-4" /> Copy address</DropdownMenuItem>
          <DropdownMenuItem onClick={async () => { await disconnect(); toast.info("Wallet disconnected. Choose another wallet to continue."); }}><RefreshCw className="size-4" /> Change wallet</DropdownMenuItem>
          {authorized ? <DropdownMenuItem onClick={() => setSimulationOpen(true)}><SlidersHorizontal className="size-4" /> Simulation dashboard</DropdownMenuItem> : null}
          <DropdownMenuItem onClick={() => void disconnect()}><LogOut className="size-4" /> Disconnect</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {authorized ? <SimulationDashboard open={simulationOpen} onClose={() => setSimulationOpen(false)} /> : null}
    </>;
  }

  const installed = wallets.filter((w) => w.readyState === "Installed");
  const others = wallets.filter((w) => w.readyState !== "Installed");
  return <div className={full ? "w-full space-y-2" : "space-y-2"}>
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="default" className={full ? "w-full" : ""} disabled={connecting && !timedOut}>
          <Wallet className="size-4" />
          {requestingWallet && timedOut ? "Connection taking too long" : requestingWallet || connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{timedOut ? "Connection timed out — choose retry or another wallet" : "Connect a Solana wallet"}</DropdownMenuLabel><DropdownMenuSeparator />
        {installed.map((w) => <DropdownMenuItem key={w.adapter.name} onClick={() => void connectWallet(w.adapter.name)}><img src={w.adapter.icon} alt="" className="size-4 rounded" />{w.adapter.name}</DropdownMenuItem>)}
        {installed.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">No wallet detected. Install Phantom or Solflare to continue.</div> : null}
        {others.length > 0 ? <><DropdownMenuSeparator /><DropdownMenuLabel className="text-xs">Not installed</DropdownMenuLabel>{others.map((w) => <DropdownMenuItem key={w.adapter.name} onClick={() => window.open(w.adapter.url, "_blank", "noopener")}><img src={w.adapter.icon} alt="" className="size-4 rounded opacity-60" />{w.adapter.name}</DropdownMenuItem>)}</> : null}
      </DropdownMenuContent>
    </DropdownMenu>
    {requestingWallet ? (
      <div className="flex flex-wrap items-center gap-2">
        {timedOut ? <Button type="button" variant="outline" size="sm" onClick={() => void connectWallet(requestingWallet)}><RefreshCw className="size-3" /> Retry</Button> : null}
        <Button type="button" variant="ghost" size="sm" onClick={() => void cancelConnection()}><X className="size-3" /> Cancel connection</Button>
      </div>
    ) : null}
  </div>;
}
