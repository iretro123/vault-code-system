import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "node:module";
import { componentTagger } from "lovable-tagger";
import { atlasDevMentor } from "./scripts/atlasDevMentor";
import { stocksToWatchDev } from "./scripts/stocksToWatchDev";
import { vaultCalendarAssets } from "./scripts/vaultCalendarAssets";
const require = createRequire(import.meta.url);
const pdfWorker = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs", { paths: [require.resolve("react-pdf")] });

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    target: "es2020",
  },
  plugins: [react(), atlasDevMentor(), stocksToWatchDev(), vaultCalendarAssets(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "vault-pdf-worker?url": `${pdfWorker}?url`,
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    exclude: ["vault-pdf-worker?url"],
    include: ["@tanstack/react-query"],
  },
}));
