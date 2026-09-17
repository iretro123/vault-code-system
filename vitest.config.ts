import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const pdfWorker=require.resolve('pdfjs-dist/build/pdf.worker.min.mjs',{paths:[require.resolve('react-pdf')]});

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src"), 'vault-pdf-worker?url':`${pdfWorker}?url` },
  },
});
