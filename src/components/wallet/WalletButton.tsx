import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, LogOut, Wallet, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { truncateAddress } from "@/lib/utils";
import { useSolBalance } from "@/services/walletService";
import { useState } from "react";
import { SimulationDashboard, AUTHORIZED_WALLET } from "@/components/simulation/SimulationDashboard";

export function WalletButton({ full = false }: { full?: boolean }) {
  const { wallets, select, connect, connected, connecting, publicKey, disconnect } = useWallet();
  const { data: balance } = useSolBalance();

  const [simulationOpen, setSimulationOpen] = useState(false);\n\n  if (connected && publicKey) {
    const address = publicKey.toBase58();
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" className={full ? "w-full" : ""}>
            <span className="mr-1 inline-block size-2 rounded-full bg-success live-dot" />
            <span className="font-mono text-xs">{truncateAddress(address)}</span>
            <span className="ml-3 hidden text-xs text-muted-foreground sm:inline">
              {balance !== undefined ? `${balance.toFixed(3)} SOL` : "…"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="break-all font-mono text-xs">{address}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              void navigator.clipboard.writeText(address);
              toast.success("Wallet address copied");
            }}
          >
            <Copy className="size-4" /> Copy address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void disconnect()}>
            <LogOut className="size-4" /> Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const installed = wallets.filter((w) => w.readyState === "Installed");
  const others = wallets.filter((w) => w.readyState !== "Installed");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="default" className={full ? "w-full" : ""} disabled={connecting}>
          <Wallet className="size-4" />
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Connect a Solana wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {installed.map((w) => (
          <DropdownMenuItem
            key={w.adapter.name}
            onClick={async () => {
              select(w.adapter.name);
              try {
                await connect();
              } catch {
                /* adapter surfaces its own error toast */
              }
            }}
          >
            <img src={w.adapter.icon} alt="" className="size-4 rounded" />
            {w.adapter.name}
          </DropdownMenuItem>
        ))}
        {installed.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            No wallet detected. Install Phantom or Solflare to continue.
          </div>
        ) : null}
        {others.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Not installed</DropdownMenuLabel>
            {others.map((w) => (
              <DropdownMenuItem
                key={w.adapter.name}
                onClick={() => window.open(w.adapter.url, "_blank", "noopener")}
              >
                <img src={w.adapter.icon} alt="" className="size-4 rounded opacity-60" />
                {w.adapter.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
