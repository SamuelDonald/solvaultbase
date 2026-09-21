/**
 * Solana libraries (bs58, @solana/buffer-layout, web3.js) touch `Buffer` and
 * `global` while their modules are still evaluating. Importing this module
 * first — before any Solana import, at the very top of main.tsx — guarantees
 * both exist in the browser.
 *
 * Unlike the old TanStack Start build, there is no server-rendering pass for
 * this file to run under, so there's no risk of it (or the `buffer` package
 * itself) being evaluated by anything other than a normal Vite client
 * bundle. That mismatch — a CJS package landing in a non-Node SSR module
 * graph — was the actual cause of the "require is not defined" crash.
 */
import { Buffer } from "buffer";

const g = globalThis as unknown as { Buffer?: typeof Buffer; global?: unknown };

if (typeof g.Buffer === "undefined") g.Buffer = Buffer;
if (typeof g.global === "undefined") g.global = globalThis;

export {};
