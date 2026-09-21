import "@/lib/buffer-polyfill";

import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";

import { readPlatformConfig } from "@/config/solbaseVault";

const platformConfig = readPlatformConfig();

export const CLIENT_NETWORK = platformConfig.network;
export const CLIENT_RPC_URL = platformConfig.rpcUrl;

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export function SolanaWalletProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={CLIENT_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useSolBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["sol-balance", publicKey?.toBase58(), CLIENT_RPC_URL],
    enabled: !!publicKey,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!publicKey) return 0;
      const lamports = await connection.getBalance(publicKey);
      return lamports / LAMPORTS_PER_SOL;
    },
  });
}

export interface WalletTokenHolding {
  mint: string;
  amount: number;
  decimals: number;
}

/** Reads the SPL token accounts owned by the connected wallet, straight from the RPC. */
export function useWalletHoldings() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["wallet-holdings", publicKey?.toBase58(), CLIENT_RPC_URL],
    enabled: !!publicKey,
    queryFn: async (): Promise<WalletTokenHolding[]> => {
      if (!publicKey) return [];
      const res = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });
      return res.value
        .map((item) => {
          const info = item.account.data.parsed.info;
          return {
            mint: info.mint as string,
            amount: Number(info.tokenAmount.uiAmount ?? 0),
            decimals: Number(info.tokenAmount.decimals ?? 0),
          };
        })
        .filter((h) => h.amount > 0);
    },
  });
}
