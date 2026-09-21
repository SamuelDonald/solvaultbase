/**
 * TOKEN DATA STORE
 * =================
 * The on-chain minting in launchService.ts is real and needs no backend —
 * it talks straight to the Solana RPC and is signed by the connected
 * wallet. Listing tokens for Explore/Portfolio is a different problem: it
 * needs an index that outlives one browser tab, which means a real
 * database. This app doesn't have Supabase (or any backend) credentials
 * connected yet, so rather than fake that with hardcoded sample tokens —
 * which is exactly the kind of thing the original spec explicitly warned
 * against ("don't pretend the transaction succeeded") — this stores what
 * actually got launched in *this* browser, in localStorage, behind the
 * same interface a real backend would implement.
 *
 * Swapping this for Supabase later means writing one new file that
 * implements `TokenStore` against `@supabase/supabase-js` (using the same
 * `tokens`/`transactions` schema the original repo's migrations already
 * define) and pointing `tokenStore` at it below — nothing that calls this
 * module needs to change.
 *
 * IMPORTANT: a real backend must independently verify the transaction
 * signature on-chain before trusting anything the frontend reports (see
 * the original repo's `solana.server.ts` for reference) — never take a
 * client-reported "it succeeded" at face value. This placeholder can't do
 * that (there's no server to do it from), which is precisely why it's a
 * placeholder and not the real launch-registration path.
 */

export interface TokenRecord {
  mintAddress: string;
  name: string;
  symbol: string;
  description: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  telegramUrl: string | null;
  discordUrl: string | null;
  creatorWallet: string;
  totalSupply: number;
  decimals: number;
  creatorPercent: number;
  status: "LIVE";
  signature: string;
  createdAt: string;
}

export interface RegisterLaunchInput {
  signature: string;
  mintAddress: string;
  creatorWallet: string;
  name: string;
  symbol: string;
  description: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  telegramUrl: string | null;
  discordUrl: string | null;
  totalSupply: number;
  decimals: number;
  creatorPercent: number;
}

export interface TokenStore {
  registerLaunch(input: RegisterLaunchInput): Promise<TokenRecord>;
  listTokens(): Promise<TokenRecord[]>;
  listByCreator(walletAddress: string): Promise<TokenRecord[]>;
  getByMint(mintAddress: string): Promise<TokenRecord | null>;
}

const STORAGE_KEY = "solbase-vault-tokens";

function readAll(): TokenRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(tokens: TokenRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Storage can be unavailable (private browsing, quota) — this is only a
    // local placeholder index, so losing it isn't fatal.
  }
}

class LocalTokenStore implements TokenStore {
  async registerLaunch(input: RegisterLaunchInput): Promise<TokenRecord> {
    const record: TokenRecord = { ...input, status: "LIVE", createdAt: new Date().toISOString() };
    const all = readAll().filter((t) => t.mintAddress !== record.mintAddress);
    all.unshift(record);
    writeAll(all);
    return record;
  }

  async listTokens(): Promise<TokenRecord[]> {
    return readAll();
  }

  async listByCreator(walletAddress: string): Promise<TokenRecord[]> {
    return readAll().filter((t) => t.creatorWallet === walletAddress);
  }

  async getByMint(mintAddress: string): Promise<TokenRecord | null> {
    return readAll().find((t) => t.mintAddress === mintAddress) ?? null;
  }
}

export const tokenStore: TokenStore = new LocalTokenStore();
