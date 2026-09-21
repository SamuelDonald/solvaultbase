/**
 * Same rationale as tokenStore.ts: the actual SOL transfer is real and
 * on-chain (built + sent straight from the connected wallet). This just
 * keeps a local history of it in this browser until a real backend is
 * connected to verify and persist it centrally.
 */

export interface DepositRecord {
  walletAddress: string;
  signature: string;
  solAmount: number;
  destinationWallet: string;
  createdAt: string;
}

const STORAGE_KEY = "solbase-vault-deposits";

function readAll(): DepositRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DepositRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(deposits: DepositRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deposits));
  } catch {
    // Local placeholder index only — losing it isn't fatal.
  }
}

export async function recordDeposit(
  input: Omit<DepositRecord, "createdAt">,
): Promise<DepositRecord> {
  const record: DepositRecord = { ...input, createdAt: new Date().toISOString() };
  const all = [record, ...readAll()];
  writeAll(all);
  return record;
}

export async function listDeposits(walletAddress: string): Promise<DepositRecord[]> {
  return readAll().filter((d) => d.walletAddress === walletAddress);
}
