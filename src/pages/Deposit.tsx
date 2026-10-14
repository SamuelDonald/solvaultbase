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

const MAX_SAFE_LAMPORTS = BigInt(Number.MAX_SAFE_INTEGER);

function parseSolAmount(value: string): number | null {
  const normalized = value.trim().startsWith(".") ? `0${value.trim()}` : value.trim();
  if (!/^(?:\d+)(?:\.\d{1,9})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const lamports =
    BigInt(whole) * BigInt(LAMPORTS_PER_SOL) +
    BigInt(fraction.padEnd(9, "0") || "0");

  if (lamports <= 0n || lamports > MAX_SAFE_LAMPORTS) return null;
  return Number(lamports);
}

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
    if (!publicKey || sending) return;

    const lamports = parseSolAmount(amount);
    if (lamports === null) {
      toast.error("Enter a valid SOL amount with up to 9 decimal places");
      return;
    }

    const recipient = new PublicKey(config.receivingWallet);
    if (publicKey.equals(recipient)) {
      toast.error("Your connected wallet is already the receiving address");
      return;
    }

    setSending(true);
    try {
      // Fetch the blockhash before building/sending so confirmation uses the
      // same blockhash lifetime as the wallet-signed transaction.
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: latestBlockhash.blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports,
        }),
      );

      const [currentBalance, feeEstimate] = await Promise.all([
        connection.getBalance(publicKey, "confirmed"),
        connection.getFeeForMessage(transaction.compileMessage(), "confirmed"),
      ]);
      if (feeEstimate.value === null) {
        throw new Error("Could not estimate the network fee. Please try again.");
      }
      if (currentBalance < lamports + feeEstimate.value) {
        throw new Error("Insufficient SOL to cover the transfer and network fee.");
      }

      // sendTransaction asks the connected wallet to approve/sign; the site
      // never accesses or stores the wallet's private key.
      const signature = await sendTransaction(transaction, connection, {
        preflightCommitment: "confirmed",
      });
      const confirmation = await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed",
      );

      if (confirmation.value.err) {
        throw new Error(
          `The transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      await recordDeposit({
        walletAddress: publicKey.toBase58(),
        signature,
        solAmount: lamports / LAMPORTS_PER_SOL,
        destinationWallet: recipient.toBase58(),
      });

      toast.success(`Confirmed: ${(lamports / LAMPORTS_PER_SOL).toString()} SOL sent`);
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
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Enter the amount to send. Up to 9 decimal places are supported.
              </p>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Your balance: {balance !== undefined ? balance.toFixed(4) : "…"} SOL
              <span className="mt-1 block">Network fee is charged separately by Solana.</span>
            </p>

            <Button className="mt-6 w-full" onClick={() => void handleSend()} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Confirming…
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
                    <a
                      href={`https://explorer.solana.com/tx/${d.signature}${config.network === "mainnet-beta" ? "" : `?cluster=${config.network}`}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {truncateAddress(d.signature, 6)}
                    </a>
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
