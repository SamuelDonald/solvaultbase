import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Solbase Vault is a plain client-side SPA — there is no server-rendering
// step, so there is no "SSR module graph" for a CJS-flavored package like
// `buffer` to be evaluated in. Vite's normal dependency pre-bundling
// (esbuild) converts it to ESM for the browser bundle like any other
// client-side npm dependency. `define: { global: "globalThis" }` covers the
// handful of Solana libraries that still expect a Node-style `global`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
});
