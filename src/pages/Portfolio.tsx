import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { Rocket, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { WalletButton } from "@/components/wallet/WalletButton";
import { truncateAddress } from "@/lib/utils";
import { tokenStore } from "@/services/tokenStore";
import { useSolBalance, useWalletHoldings } from "@/services/walletService";

export function Portfolio() {
  const { publicKey, connected } = useWallet();
  const wallet = publicKey?.toBase58();
  const { data: balance } = useSolBalance();
  const { data: holdings, isLoading: loadingHoldings } = useWalletHoldings();

  const { data: launched, isLoading: loadingLaunched } = useQuery({
    queryKey: ["tokens", "by-creator", wallet],
    enabled: !!wallet,
    queryFn: () => tokenStore.listByCreator(wallet!),
  });

  if (!connected || !wallet) {
    return (
      <AppLayout>
        <PageHeading eyebrow="Portfolio" title="Your holdings" />
        <EmptyState
          icon={Wallet}
          title="Connect your wallet"
          description="Connect a Solana wallet to see your balance, holdings and launched tokens."
          action={<WalletButton />}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeading
        eyebrow="Portfolio"
        title="Your holdings"
        subtitle={`Wallet ${truncateAddress(wallet, 6)}`}
      />

      <div className="glass rise-in mb-8 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">SOL balance</p>
        <p className="mt-1 font-display text-3xl text-cosmic">
          {balance !== undefined ? balance.toFixed(4) : "…"}
          <span className="ml-2 text-base text-muted-foreground">SOL</span>
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg text-foreground">Token holdings</h2>
        {loadingHoldings ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !holdings || holdings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No SPL tokens in this wallet on the current network yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {holdings.map((h) => (
              <Link
                key={h.mint}
                to={`/token/${h.mint}`}
                className="glass glass-hover flex items-center justify-between rounded-xl p-4"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {truncateAddress(h.mint, 6)}
                </span>
                <span className="font-display text-sm text-foreground">
                  {h.amount.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-foreground">Tokens you've launched</h2>
          <Link to="/launch">
            <Button size="sm" variant="outline">
              <Rocket className="size-3.5" /> New launch
            </Button>
          </Link>
        </div>
        {loadingLaunched ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !launched || launched.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven't launched a token from this browser yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {launched.map((t) => (
              <Link
                key={t.mintAddress}
                to={`/token/${t.mintAddress}`}
                className="glass glass-hover flex items-center gap-3 rounded-xl p-4"
              >
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt="" className="size-10 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-lg bg-secondary/60 font-display text-xs text-accent">
                    {t.symbol.slice(0, 3)}
                  </span>
                )}
                <div>
                  <p className="font-display text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">${t.symbol}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
