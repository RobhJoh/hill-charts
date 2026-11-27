// `npm run dev`: the API server (restarting on change, data in ./data) plus
// Vite's dev server for the SPA with hot reload. Open http://localhost:5173.
import { spawn } from "node:child_process";

const apiPort = process.env.API_PORT ?? "3001";
const env = { ...process.env, API_PORT: apiPort };

const children = [
  spawn("npx", ["tsx", "watch", "src/server/main.ts"], {
    stdio: "inherit",
    env: { ...env, PORT: apiPort },
  }),
  spawn("npx", ["vite"], { stdio: "inherit", env }),
];

function stop(code = 0) {
  for (const child of children) child.kill("SIGTERM");
  process.exit(code);
}
for (const child of children) child.on("exit", (code) => stop(code ?? 0));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
