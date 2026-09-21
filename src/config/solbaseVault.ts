/**
 * Centralised Solbase Vault platform configuration.
 *
 * The receiving wallet and fees live here (and in env vars) ONLY — never
 * hardcode them elsewhere, and never expose them as user-editable settings.
 *
 * NOTE ON NETWORK LABELING: the old repo hardcoded the *displayed* network
 * name to "Mainnet" independent of which cluster it actually talked to
 * (which defaulted to devnet). That's a real problem, not a style choice —
 * showing users "Mainnet" while their transaction actually lands on a test
 * network (or vice versa) is misleading about where their SOL and tokens
 * actually go. Here the label is always derived from the real network, so
 * the UI can't say something the RPC endpoint doesn't back up.
 */

export type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

export const DEFAULT_RECEIVING_WALLET = "DXVdPZ4SKvtbX7DxRgCB7n9Wh9Te1LrJqfnsSwMs8J9W";

/** Launch fee in SOL. */
export const DEFAULT_LAUNCH_FEE_SOL = 1;

/** Flat network fee added on top of the launch fee. */
export const DEFAULT_NETWORK_FEE_SOL = 0.05;

// Safe-by-default: devnet uses free faucet SOL, so nothing here risks real
// funds until this is deliberately switched over. Flip with
// VITE_SOLBASE_NETWORK=mainnet-beta once you're ready to go live.
export const DEFAULT_NETWORK: SolanaNetwork = "devnet";

export function defaultRpcUrl(network: SolanaNetwork): string {
  if (network === "mainnet-beta") return "https://api.mainnet-beta.solana.com";
  if (network === "testnet") return "https://api.testnet.solana.com";
  return "https://api.devnet.solana.com";
}

export function networkDisplayLabel(network: SolanaNetwork): string {
  if (network === "mainnet-beta") return "Mainnet";
  if (network === "testnet") return "Testnet";
  return "Devnet";
}

/** Token launch defaults so a beginner can launch without tuning anything. */
export const TOKEN_DEFAULTS = {
  totalSupply: 1_000_000_000,
  decimals: 9,
};

export interface PlatformConfig {
  receivingWallet: string;
  launchFeeSol: number;
  networkFeeSol: number;
  network: SolanaNetwork;
  rpcUrl: string;
}

/**
 * Reads Vite env vars (VITE_SOLBASE_*) with sane fallbacks. All of these are
 * plainly displayed to users anyway (the receiving wallet is shown on the
 * pay screen, the fee is shown before every launch), so none of it is
 * secret — it's just centralised so nothing drifts out of sync.
 */
export function readPlatformConfig(): PlatformConfig {
  const network = (import.meta.env["VITE_SOLBASE_NETWORK"] as SolanaNetwork | undefined) ??
    DEFAULT_NETWORK;
  const feeRaw = import.meta.env["VITE_SOLBASE_LAUNCH_FEE"] as string | undefined;
  const parsedFee = feeRaw ? Number(feeRaw) : Number.NaN;
  const networkFeeRaw = import.meta.env["VITE_SOLBASE_NETWORK_FEE"] as string | undefined;
  const parsedNetworkFee = networkFeeRaw ? Number(networkFeeRaw) : Number.NaN;

  return {
    receivingWallet:
      (import.meta.env["VITE_SOLBASE_RECEIVING_WALLET"] as string | undefined) ??
      DEFAULT_RECEIVING_WALLET,
    launchFeeSol: Number.isFinite(parsedFee) ? parsedFee : DEFAULT_LAUNCH_FEE_SOL,
    networkFeeSol: Number.isFinite(parsedNetworkFee)
      ? parsedNetworkFee
      : DEFAULT_NETWORK_FEE_SOL,
    network,
    rpcUrl:
      (import.meta.env["VITE_SOLBASE_RPC_URL"] as string | undefined) ??
      defaultRpcUrl(network),
  };
}
