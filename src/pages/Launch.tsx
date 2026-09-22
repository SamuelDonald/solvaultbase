import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Rocket, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Slider } from "@/components/ui/Slider";
import { Textarea } from "@/components/ui/Textarea";
import { WalletButton } from "@/components/wallet/WalletButton";
import { TOKEN_DEFAULTS, networkDisplayLabel, readPlatformConfig } from "@/config/solbaseVault";
import { truncateAddress } from "@/lib/utils";
import { buildLaunchTransaction } from "@/services/launchService";
import { tokenStore } from "@/services/tokenStore";
import { TX_STATE_LABEL, type TxState } from "@/services/transactionService";
import { useSolBalance } from "@/services/walletService";

const STEPS = ["Basics", "Branding", "Socials", "Funding", "Review"] as const;
const MAX_IMAGE_BYTES = 700_000;

interface FormState {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  websiteUrl: string;
  twitterUrl: string;
  telegramUrl: string;
  discordUrl: string;
  creatorPercent: number;
  liquiditySol: string;
  simBuySol: string;
  simSellSol: string;
}

const EMPTY: FormState = {
  name: "",
  symbol: "",
  description: "",
  imageUrl: "",
  websiteUrl: "",
  twitterUrl: "",
  telegramUrl: "",
  discordUrl: "",
  creatorPercent: 0,
  liquiditySol: "0",
  simBuySol: "0",
  simSellSol: "0",
};

const STEP_STORAGE_KEY = "solbase-vault-launch-step";
const FORM_STORAGE_KEY = "solbase-vault-launch-draft";

function loadDraftStep(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(STEP_STORAGE_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 && n <= STEPS.length - 1 ? n : 0;
}

function loadDraftForm(): FormState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<FormState>) };
  } catch {
    return EMPTY;
  }
}

function parseSol(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatSol(value: number): string {
  return `${value.toFixed(3)} SOL`;
}

export function Launch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();
  const { data: balance } = useSolBalance();
  const config = readPlatformConfig();

  const [step, setStep] = useState<number>(loadDraftStep);
  const [form, setForm] = useState<FormState>(loadDraftForm);
  const [tx, setTx] = useState<TxState>({ phase: "idle" });
  const [payOpen, setPayOpen] = useState(false);
  const [launched, setLaunched] = useState<{ mint: string; signature: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STEP_STORAGE_KEY, String(step));
  }, [step]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Draft persistence is a convenience, not a requirement — fail silently.
    }
  }, [form]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const basicsValid = form.name.trim().length > 1 && form.symbol.trim().length > 0;

  function goToStep(next: number) {
    setStep(Math.min(STEPS.length - 1, Math.max(0, next)));
  }

  function handleContinue() {
    if (step === 0 && !basicsValid) {
      toast.error("Give your token a name (2+ characters) and a symbol");
      return;
    }
    goToStep(step + 1);
  }

  const liquidity = parseSol(form.liquiditySol);
  const simBuy = parseSol(form.simBuySol);
  const simSell = parseSol(form.simSellSol);
  const extraSol = liquidity + simBuy + simSell + config.networkFeeSol;
  const totalSol = config.launchFeeSol + extraSol;
  const notEnoughSol = connected && balance !== undefined && balance < totalSol;

  const keptSupply = Math.round((TOKEN_DEFAULTS.totalSupply * form.creatorPercent) / 100);
  const releasedSupply = TOKEN_DEFAULTS.totalSupply - keptSupply;

  function handleImageFile(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large — use one under 700KB, or paste an image URL instead");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("imageUrl")(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleLaunch() {
    if (!publicKey || !signTransaction) return;
    try {
      setTx({ phase: "preparing" });
      const { transaction, mint } = await buildLaunchTransaction({
        connection,
        payer: publicKey,
        receivingWallet: config.receivingWallet,
        launchFeeSol: config.launchFeeSol,
        extraSol,
        decimals: TOKEN_DEFAULTS.decimals,
        totalSupply: TOKEN_DEFAULTS.totalSupply,
        creatorPercent: form.creatorPercent,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      transaction.partialSign(mint);

      setTx({ phase: "awaiting_signature" });
      const signed = await signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signed.serialize());
      setTx({ phase: "confirming", signature });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      await tokenStore.registerLaunch({
        signature,
        mintAddress: mint.publicKey.toBase58(),
        creatorWallet: publicKey.toBase58(),
        name: form.name.trim(),
        symbol: form.symbol.trim().toUpperCase(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl || null,
        websiteUrl: form.websiteUrl || null,
        twitterUrl: form.twitterUrl || null,
        telegramUrl: form.telegramUrl || null,
        discordUrl: form.discordUrl || null,
        totalSupply: TOKEN_DEFAULTS.totalSupply,
        decimals: TOKEN_DEFAULTS.decimals,
        creatorPercent: form.creatorPercent,
      });

      setTx({ phase: "success", signature });
      setLaunched({ mint: mint.publicKey.toBase58(), signature });
      window.sessionStorage.removeItem(FORM_STORAGE_KEY);
      window.sessionStorage.removeItem(STEP_STORAGE_KEY);
      void queryClient.invalidateQueries({ queryKey: ["tokens"] });
      toast.success("Token launched 🚀");
    } catch (err) {
      setTx({ phase: "error", message: err instanceof Error ? err.message : "Transaction failed" });
    }
  }

  return (
    <AppLayout>
      <PageHeading
        eyebrow="Launch"
        title="Create your token"
        subtitle="Five steps, one on-chain transaction — the transaction is signed by your wallet and settled on Solana directly."
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              i === step
                ? "border-primary/60 bg-primary/15 text-foreground"
                : i < step
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border/60 text-muted-foreground"
            }`}
          >
            {i < step ? <Check className="size-3" /> : <span>{i + 1}</span>}
            {label}
          </div>
        ))}
      </div>

      <div className="glass rise-in mx-auto max-w-2xl rounded-3xl p-6 sm:p-8">
        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <Label htmlFor="name">Token name</Label>
              <Input
                id="name"
                placeholder="e.g. Orbit Finance"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="e.g. ORBIT"
                value={form.symbol}
                onChange={(e) => set("symbol")(e.target.value.toUpperCase().slice(0, 12))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {TOKEN_DEFAULTS.totalSupply.toLocaleString()} fixed supply,{" "}
              {TOKEN_DEFAULTS.decimals} decimals — mint authority is revoked at launch.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="size-16 rounded-2xl object-cover" />
              ) : (
                <span className="grid size-16 place-items-center rounded-2xl bg-secondary/60 text-xs text-muted-foreground">
                  No image
                </span>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-2.5 text-sm text-muted-foreground hover:border-accent/50 hover:text-foreground">
                <Upload className="size-4" />
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                  }}
                />
              </label>
            </div>
            <div>
              <Label htmlFor="imageUrl">Or paste an image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://…"
                value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                onChange={(e) => set("imageUrl")(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="What is this token about?"
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            {(
              [
                ["websiteUrl", "Website"],
                ["twitterUrl", "Twitter / X"],
                ["telegramUrl", "Telegram"],
                ["discordUrl", "Discord"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  placeholder="https:// (optional)"
                  value={form[key]}
                  onChange={(e) => set(key)(e.target.value)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <Label htmlFor="creatorPercent">Supply you keep</Label>
              <Slider
                id="creatorPercent"
                className="mt-4"
                min={0}
                max={100}
                step={1}
                value={form.creatorPercent}
                onValueChange={(v) => setForm((f) => ({ ...f, creatorPercent: v }))}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-background/50 p-3">
                  <p className="text-muted-foreground">You keep</p>
                  <p className="mt-1 text-sm text-foreground">
                    {form.creatorPercent}% · {keptSupply.toLocaleString()}{" "}
                    {form.symbol || "tokens"}
                  </p>
                </div>
                <div className="rounded-xl bg-background/50 p-3">
                  <p className="text-muted-foreground">You let go</p>
                  <p className="mt-1 text-sm text-foreground">
                    {100 - form.creatorPercent}% · {releasedSupply.toLocaleString()}{" "}
                    {form.symbol || "tokens"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The share you let go is held in the Solbase Vault wallet until pool launching
                goes live.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["liquiditySol", "Liquidity (SOL)"],
                  ["simBuySol", "Simulated buys (SOL)"],
                  ["simSellSol", "Simulated sells (SOL)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[key]}
                    onChange={(e) => set(key)(e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-secondary/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Running total</span>
                <span className="font-medium text-foreground">{formatSol(totalSol)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Includes the {formatSol(config.launchFeeSol)} launch fee and the{" "}
                {formatSol(config.networkFeeSol)} network fee. Liquidity and simulated activity
                are held in the Solbase Vault wallet for now and applied when pool launching
                goes live.
              </p>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            {launched ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success/15">
                  <Rocket className="size-6 text-success" />
                </div>
                <div>
                  <h2 className="font-display text-xl text-foreground">Launched 🚀</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {form.name} (${form.symbol}) is live on {networkDisplayLabel(config.network)}.
                  </p>
                </div>
                <div className="glass space-y-2 rounded-2xl p-4 text-left text-xs">
                  <Row label="Mint" value={launched.mint} />
                  <Row label="Signature" value={launched.signature} />
                </div>
                <div className="flex justify-center gap-3">
                  <Link to={`/token/${launched.mint}`}>
                    <Button>View token</Button>
                  </Link>
                  <Button variant="outline" onClick={() => navigate("/explore")}>
                    Explore all
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="size-14 rounded-xl object-cover" />
                  ) : null}
                  <div>
                    <p className="font-display text-lg text-foreground">
                      {form.name || "Unnamed"} <span className="text-accent">${form.symbol || "???"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TOKEN_DEFAULTS.totalSupply.toLocaleString()} supply ·{" "}
                      {TOKEN_DEFAULTS.decimals} decimals · fixed supply
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-border/50 rounded-2xl bg-secondary/30 px-5 text-sm">
                  <Dt label="Network" value={networkDisplayLabel(config.network)} />
                  <Dt label="Launch fee" value={formatSol(config.launchFeeSol)} />
                  {liquidity > 0 ? <Dt label="Liquidity" value={formatSol(liquidity)} /> : null}
                  {simBuy > 0 ? <Dt label="Simulated buys" value={formatSol(simBuy)} /> : null}
                  {simSell > 0 ? <Dt label="Simulated sells" value={formatSol(simSell)} /> : null}
                  <Dt label="Network fee" value={formatSol(config.networkFeeSol)} />
                  <Dt label="Total" value={formatSol(totalSol)} bold />
                  <Dt label="Paying wallet" value={truncateAddress(publicKey?.toBase58(), 4) || "—"} mono />
                </dl>

                {tx.phase !== "idle" ? (
                  <p
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                      tx.phase === "error" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-foreground"
                    }`}
                  >
                    {tx.phase !== "error" && tx.phase !== "success" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {tx.phase === "error" ? tx.message : TX_STATE_LABEL[tx.phase]}
                  </p>
                ) : null}

                {!connected ? (
                  <div className="rounded-xl bg-secondary/40 p-4 text-center">
                    <p className="mb-3 text-sm text-muted-foreground">
                      Connect your wallet to pay the fee and sign the launch.
                    </p>
                    <WalletButton />
                  </div>
                ) : null}

                {notEnoughSol ? (
                  <p className="rounded-xl bg-destructive/15 px-4 py-3 text-sm text-destructive">
                    Not enough SOL — you need {formatSol(totalSol)} plus a little for network
                    costs.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {!launched ? (
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={step === 0} onClick={() => goToStep(step - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleContinue}>
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!basicsValid || (tx.phase !== "idle" && tx.phase !== "error")}
                onClick={() => setPayOpen(true)}
              >
                <Rocket className="size-4" />
                Pay &amp; confirm
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogHeader>
          <DialogTitle>Pay {formatSol(totalSol)}</DialogTitle>
          <DialogDescription>
            This signs one transaction from your connected wallet: it creates your token, mints
            the supply, revokes future minting, and pays the {formatSol(totalSol)} fee to the
            Solbase Vault wallet — all in a single step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <img
            src="/deposit-wallet-qr.png"
            alt="QR code for the Solbase Vault deposit wallet"
            className="size-44 rounded-2xl border border-border/60 bg-white p-2 sm:size-52"
          />
          <p className="break-all text-center font-mono text-xs text-muted-foreground">
            {config.receivingWallet}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(config.receivingWallet);
              toast.success("Address copied");
            }}
          >
            <Copy className="size-4" />
            Copy address
          </Button>
        </div>

        {tx.phase !== "idle" && tx.phase !== "success" ? (
          <p
            className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              tx.phase === "error" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-foreground"
            }`}
          >
            {tx.phase !== "error" ? <Loader2 className="size-4 animate-spin" /> : null}
            {tx.phase === "error" ? tx.message : TX_STATE_LABEL[tx.phase]}
          </p>
        ) : null}

        <Button
          className="mt-6 w-full"
          disabled={!connected || notEnoughSol || (tx.phase !== "idle" && tx.phase !== "error")}
          onClick={() => void handleLaunch()}
        >
          {tx.phase !== "idle" && tx.phase !== "error" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Launching…
            </>
          ) : (
            <>
              <Rocket className="size-4" /> Confirm &amp; sign
            </>
          )}
        </Button>
      </Dialog>
    </AppLayout>
  );
}

function Dt({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`${bold ? "font-medium text-foreground" : ""} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono">{truncateAddress(value, 6)}</span>
    </div>
  );
}
