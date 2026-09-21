import { useQuery } from "@tanstack/react-query";
import { Compass, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { truncateAddress } from "@/lib/utils";
import { tokenStore } from "@/services/tokenStore";

export function Explore() {
  const { data: tokens, isLoading } = useQuery({
    queryKey: ["tokens", "all"],
    queryFn: () => tokenStore.listTokens(),
  });

  return (
    <AppLayout>
      <PageHeading
        eyebrow="Explore"
        title="Tokens launched on Solbase Vault"
        subtitle="Every token here was minted on-chain through the launch wizard. This index only knows about tokens launched from this browser until a shared backend is connected."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !tokens || tokens.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nothing launched yet"
          description="Be the first — launch a token and it'll show up here."
          action={
            <Link to="/launch">
              <Button>
                <Rocket className="size-4" /> Launch a token
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <Link
              key={token.mintAddress}
              to={`/token/${token.mintAddress}`}
              className="glass glass-hover rise-in block rounded-2xl p-5"
            >
              <div className="flex items-center gap-3">
                {token.imageUrl ? (
                  <img
                    src={token.imageUrl}
                    alt=""
                    className="size-12 rounded-xl object-cover ring-1 ring-border/60"
                  />
                ) : (
                  <span className="grid size-12 place-items-center rounded-xl bg-secondary/60 font-display text-sm text-accent">
                    {token.symbol.slice(0, 3)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-display text-sm text-foreground">{token.name}</p>
                  <p className="text-xs text-muted-foreground">${token.symbol}</p>
                </div>
              </div>
              {token.description ? (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  {token.description}
                </p>
              ) : null}
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                by {truncateAddress(token.creatorWallet)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
