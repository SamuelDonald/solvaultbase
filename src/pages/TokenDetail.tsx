import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Globe, Search, Send } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { readPlatformConfig } from "@/config/solbaseVault";
import { truncateAddress } from "@/lib/utils";
import { tokenStore } from "@/services/tokenStore";

function explorerUrl(address: string, network: string) {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

const SOCIAL_ICONS = [
  { key: "websiteUrl" as const, icon: Globe, label: "Website" },
  { key: "twitterUrl" as const, icon: Send, label: "Twitter / X" },
  { key: "telegramUrl" as const, icon: Send, label: "Telegram" },
  { key: "discordUrl" as const, icon: Send, label: "Discord" },
];

export function TokenDetail() {
  const { mint = "" } = useParams<{ mint: string }>();
  const config = readPlatformConfig();

  const { data: token, isLoading } = useQuery({
    queryKey: ["token", mint],
    queryFn: () => tokenStore.getByMint(mint),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppLayout>
    );
  }

  if (!token) {
    return (
      <AppLayout>
        <EmptyState
          icon={Search}
          title="Not in this browser's local index"
          description="This mint isn't in the local launch index for this browser — it may have been launched elsewhere, or from a different device. You can still look it up directly on Solana Explorer."
          action={
            <a href={explorerUrl(mint, config.network)} target="_blank" rel="noreferrer">
              <Button variant="outline">
                <ExternalLink className="size-4" /> View on Explorer
              </Button>
            </a>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="rise-in mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {token.imageUrl ? (
          <img
            src={token.imageUrl}
            alt=""
            className="size-16 rounded-2xl object-cover ring-1 ring-border/60"
          />
        ) : (
          <span className="grid size-16 place-items-center rounded-2xl bg-secondary/60 font-display text-xl text-accent">
            {token.symbol.slice(0, 3)}
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl text-cosmic sm:text-3xl">{token.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">${token.symbol}</p>
        </div>
      </div>

      {token.description ? (
        <p className="glass rise-in mb-6 rounded-2xl p-5 text-sm text-muted-foreground">
          {token.description}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total supply</p>
          <p className="mt-1 font-display text-lg text-foreground">
            {token.totalSupply.toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Decimals</p>
          <p className="mt-1 font-display text-lg text-foreground">{token.decimals}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Creator kept</p>
          <p className="mt-1 font-display text-lg text-foreground">{token.creatorPercent}%</p>
        </div>
      </div>

      <div className="glass mb-6 space-y-3 rounded-2xl p-5">
        <Row
          label="Mint address"
          value={truncateAddress(token.mintAddress, 8)}
          onCopy={() => {
            void navigator.clipboard.writeText(token.mintAddress);
            toast.success("Mint address copied");
          }}
        />
        <Row
          label="Creator wallet"
          value={truncateAddress(token.creatorWallet, 8)}
          onCopy={() => {
            void navigator.clipboard.writeText(token.creatorWallet);
            toast.success("Creator address copied");
          }}
        />
        <Row
          label="Launch signature"
          value={truncateAddress(token.signature, 8)}
          onCopy={() => {
            void navigator.clipboard.writeText(token.signature);
            toast.success("Signature copied");
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a href={explorerUrl(token.mintAddress, config.network)} target="_blank" rel="noreferrer">
          <Button variant="outline">
            <ExternalLink className="size-4" /> View mint on Explorer
          </Button>
        </a>
        {SOCIAL_ICONS.filter((s) => token[s.key]).map((s) => (
          <a key={s.key} href={token[s.key]!} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm">
              <s.icon className="size-4" /> {s.label}
            </Button>
          </a>
        ))}
      </div>
    </AppLayout>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-accent"
      >
        {value} <Copy className="size-3" />
      </button>
    </div>
  );
}
