import { Compass, Rocket, ShieldCheck, Sparkles, Wallet, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { networkDisplayLabel, readPlatformConfig } from "@/config/solbaseVault";

const STEPS = [
  {
    icon: Wallet,
    title: "Connect your wallet",
    body: "Phantom or Solflare — nothing else to install.",
  },
  {
    icon: Sparkles,
    title: "Describe your token",
    body: "Name, symbol, branding and socials in a five-step wizard.",
  },
  {
    icon: Zap,
    title: "Launch on-chain",
    body: "One transaction mints your SPL token — real, verifiable on Solana.",
  },
];

export function Landing() {
  const config = readPlatformConfig();

  return (
    <AppLayout>
      <div className="space-y-20">
      <section className="rise-in nebula-field grid items-center gap-10 py-8 md:grid-cols-2 md:py-16">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs text-accent">
            <span className="size-1.5 rounded-full bg-success live-dot" />
            Live on {networkDisplayLabel(config.network)}
          </p>
          <h1 className="font-display text-4xl leading-tight tracking-wide text-cosmic sm:text-5xl">
            Launch your token into orbit
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground">
            Solbase Vault takes you from an idea to a real, on-chain Solana SPL token in five
            guided steps — no code, no contracts to deploy yourself.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/launch">
              <Button size="lg">
                <Rocket className="size-4" /> Start a launch
              </Button>
            </Link>
            <Link to="/explore">
              <Button size="lg" variant="outline">
                <Compass className="size-4" /> Explore tokens
              </Button>
            </Link>
          </div>
        </div>

        <div className="glass float-slow relative rounded-3xl p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/20 ring-1 ring-primary/40">
              <Rocket className="size-5 text-accent" />
            </span>
            <div>
              <p className="font-display text-sm text-foreground">Launch fee</p>
              <p className="text-xs text-muted-foreground">Paid once, on launch</p>
            </div>
          </div>
          <p className="mt-6 font-display text-4xl text-cosmic">
            {(config.launchFeeSol + config.networkFeeSol).toFixed(2)}
            <span className="ml-2 text-lg text-muted-foreground">SOL</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {config.launchFeeSol} SOL platform fee + {config.networkFeeSol} SOL network fee.
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-foreground">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="glass glass-hover rise-in rounded-2xl p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary/60">
                <step.icon className="size-5 text-accent" />
              </span>
              <h3 className="mt-4 font-display text-base text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rise-in flex flex-col items-start gap-4 rounded-3xl p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
          <p className="text-sm text-muted-foreground">
            Every launch is a real transaction on Solana {networkDisplayLabel(config.network)} —
            mint authority is revoked immediately, so supply is fixed the moment you launch.
          </p>
        </div>
        <Link to="/launch" className="shrink-0">
          <Button>Get started</Button>
        </Link>
      </section>
      </div>
    </AppLayout>
  );
}
