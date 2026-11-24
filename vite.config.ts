import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// The SPA lives in src/web and builds to dist/web, which the Node server
// serves. In development Vite serves the SPA and proxies /api to the server
// started by `npm run dev` (see scripts/dev.mjs).
export default defineConfig({
  root: "src/web",
  plugins: [svelte({ configFile: false })],
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.VITE_PORT ?? 5173),
    proxy: {
      "/api": `http://127.0.0.1:${process.env.API_PORT ?? 3001}`,
    },
  },
});
