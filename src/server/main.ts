// Entry point: one Node process, JSON files on disk, no external services.
//
//   PORT              port to listen on (default 3000)
//   HOST              interface to bind (default 127.0.0.1)
//   APOGEE_DATA_DIR   where the JSON files live (default ./data)
//   APOGEE_PUBLIC_URL public origin for link previews, e.g. https://apogeechart.com
//                     (default: taken from each request's Host header)
//   APOGEE_WEB_DIR    the built SPA (default: dist/web, found relative to
//                     the compiled dist/node/server/main.js)
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createApogee, randomId } from "../core/index.js";
import { createJsonFileStorage } from "../storage/json-file.js";
import { startServer } from "./http.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const dataDir = resolve(process.env.APOGEE_DATA_DIR ?? "data");
const webDir = resolve(
  process.env.APOGEE_WEB_DIR ?? fileURLToPath(new URL("../../web", import.meta.url)),
);

await mkdir(dataDir, { recursive: true });
const apogee = createApogee({
  storage: createJsonFileStorage(dataDir),
  now: () => new Date(),
  newId: randomId,
});
const server = await startServer({
  apogee,
  webDir,
  port,
  host,
  ...(process.env.APOGEE_PUBLIC_URL ? { publicUrl: process.env.APOGEE_PUBLIC_URL } : {}),
});
console.log(`Apogee på http://${host}:${server.address.port} (data: ${dataDir})`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
