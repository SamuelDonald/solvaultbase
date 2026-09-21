import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, PiggyBank, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { WalletButton } from "@/components/wallet/WalletButton";
import { readPlatformConfig } from "@/config/solbaseVault";
import { truncateAddress } from "@/lib/utils";
import { listDeposits, recordDeposit } from "@/services/depositStore";
import { useSolBalance } from "@/services/walletService";

const QUICK_AMOUNTS = [0.1, 0.5, 1, 5];

export function Deposit() {
  const config = readPlatformConfig();
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const { data: balance } = useSolBalance();
  const [amount, setAmount] = useState("0.1");
  const [sending, setSending] = useState(false);

  const wallet = publicKey?.toBase58();
  const { data: deposits } = useQuery({
    queryKey: ["deposits", wallet],
    enabled: !!wallet,
    queryFn: () => listDeposits(wallet!),
  });

  async function handleSend() {
    if (!publicKey) return;
    const sol = Number(amount);
    if (!Number.isFinite(sol) || sol <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    setSending(true);
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(config.receivingWallet),
          lamports: Math.round(sol * LAMPORTS_PER_SOL),
        }),
      );
      const signature = await sendTransaction(transaction, connection);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latest }, "confirmed");

      await recordDeposit({
        walletAddress: publicKey.toBase58(),
        signature,
        solAmount: sol,
        destinationWallet: config.receivingWallet,
      });

      toast.success(`Sent ${sol} SOL`);
      void queryClient.invalidateQueries({ queryKey: ["deposits", wallet] });
      void queryClient.invalidateQueries({ queryKey: ["sol-balance"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppLayout>
      <PageHeading
        eyebrow="Deposit"
        title="Send SOL"
        subtitle="Send SOL directly to the Solbase Vault wallet from any connected Solana wallet."
      />

      {!connected ? (
        <EmptyState
          icon={PiggyBank}
          title="Connect your wallet"
          description="Connect a Solana wallet to send SOL."
          action={<WalletButton />}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rise-in rounded-3xl p-6">
            <Label>Receiving wallet</Label>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(config.receivingWallet);
                toast.success("Address copied");
              }}
              className="flex w-full items-center justify-between rounded-xl border border-input bg-background/40 px-3 py-2.5 font-mono text-xs text-foreground hover:border-accent/50"
            >
              {config.receivingWallet}
              <Copy className="size-3.5 shrink-0" />
            </button>

            <div className="mt-6">
              <Label htmlFor="amount">Amount (SOL)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:border-accent/50 hover:text-foreground"
                  >
                    {a} SOL
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Your balance: {balance !== undefined ? balance.toFixed(4) : "…"} SOL
            </p>

            <Button className="mt-6 w-full" onClick={() => void handleSend()} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" /> Send {amount || "0"} SOL
                </>
              )}
            </Button>
          </div>

          <div className="glass rise-in rounded-3xl p-6">
            <h2 className="mb-4 font-display text-base text-foreground">Your deposits</h2>
            {!deposits || deposits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deposits from this wallet yet.</p>
            ) : (
              <ul className="space-y-3">
                {deposits.map((d) => (
                  <li
                    key={d.signature}
                    className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateAddress(d.signature, 6)}
                    </span>
                    <span className="font-display text-sm text-foreground">{d.solAmount} SOL</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
