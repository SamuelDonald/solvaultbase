# Solbase Vault

A clean, client-only rebuild of the Solana token launchpad — same product
surface (wallet connect, explore, five-step launch wizard, deposit,
portfolio, token detail), rebuilt as a plain Vite + React SPA instead of a
server-rendered app, specifically to avoid the class of bug that kept
breaking the previous build: Solana's browser-only libraries (which lean on
`Buffer`/`global`) getting pulled into a server-rendering module graph they
were never designed for.

## What's real vs. placeholder

- **The token launch itself is real.** `src/services/launchService.ts`
  builds an actual SPL token mint + supply + fee-transfer transaction; it's
  signed by the connected wallet and submitted straight to Solana. Nothing
  here is simulated.
- **Explore / Portfolio / Token detail read from a local index**
  (`src/services/tokenStore.ts`), not a shared database — there are no
  backend credentials configured in this build. It only knows about tokens
  launched from the same browser. The file explains, in comments, exactly
  what a real backend (e.g. Supabase, using the same schema as the old
  repo's migrations) would need to do differently — in particular,
  independently verifying the transaction signature on-chain before
  trusting anything the client reports.
- **AI-assisted name/description suggestions were dropped**, not faked —
  they need a server holding a real API key, which this build doesn't have.

## Fixed from the old build

- Network is no longer hardcoded to display "Mainnet" regardless of which
  cluster is actually configured (`src/config/solbaseVault.ts`) — the label
  is always derived from the real network so the UI can't claim something
  the RPC endpoint doesn't back up. Defaults to **devnet** until you
  deliberately switch it.
- No SSR, so no server module graph for `buffer` (a CJS package) to crash
  inside — see `src/lib/buffer-polyfill.ts` for the full explanation.

## Getting started

```bash
npm install
cp .env.example .env.local   # adjust network/fees/wallet if needed
npm run dev
```

`npm run build` produces a static `dist/` — deploy it anywhere that serves
static files (Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.).

## Wiring up a real backend later

Implement the `TokenStore` interface in `src/services/tokenStore.ts` against
your backend of choice and swap the `tokenStore` export at the bottom of
that file — nothing else in the app needs to change.
