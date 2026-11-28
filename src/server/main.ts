// Entry point: one Node process, JSON files on disk. The structure
// (Funktionsområden and Projekt) is read from Notion (ADR 0003).
//
//   PORT              port to listen on (default 3000)
//   HOST              interface to bind (default 127.0.0.1)
//   APOGEE_DATA_DIR   where the JSON files live (default ./data)
//   APOGEE_PUBLIC_URL public origin for link previews, e.g. https://apogeechart.com
//                     (default: taken from each request's Host header)
//   APOGEE_WEB_DIR    the built SPA (default: dist/web, found relative to
//                     the compiled dist/node/server/main.js)
//   NOTION_TOKEN      the Notion integration's secret token. Together with the two
//                     ids below it makes the server read Notion's API (src/notion/api.ts);
//                     set all three or none. The integration must be shared with
//                     both databases.
//   NOTION_PROJEKT_DATA_SOURCE_ID           data source id of [Databas] Projekt
//   NOTION_FUNKTIONSOMRADEN_DATA_SOURCE_ID  data source id of [Databas] Funktionsområden
//   APOGEE_NOTION_FILE  while Notion is not configured: a local JSON file shaped
//                     like the Notion databases, read instead (see
//                     src/notion/fil.ts; default dev/notion.json)
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createApogee, randomId } from "../core/index.js";
import { createJsonFileStorage } from "../storage/json-file.js";
import { createFileNotion } from "../notion/fil.js";
import { createNotionApi } from "../notion/api.js";
import { createWriteQueue, startServer } from "./http.js";

/** How often the structure is fetched from Notion. */
const SYNK_VAR_MS = 5 * 60_000;

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const dataDir = resolve(process.env.APOGEE_DATA_DIR ?? "data");
const webDir = resolve(
  process.env.APOGEE_WEB_DIR ?? fileURLToPath(new URL("../../web", import.meta.url)),
);

const notionFil = resolve(process.env.APOGEE_NOTION_FILE ?? "dev/notion.json");
const notionToken = process.env.NOTION_TOKEN;
const projektKälla = process.env.NOTION_PROJEKT_DATA_SOURCE_ID;
const funktionsområdenKälla = process.env.NOTION_FUNKTIONSOMRADEN_DATA_SOURCE_ID;
const notionSatt = [notionToken, projektKälla, funktionsområdenKälla].filter(Boolean).length;
if (notionSatt > 0 && notionSatt < 3) {
  throw new Error(
    "Notion är delvis inställt: sätt NOTION_TOKEN, NOTION_PROJEKT_DATA_SOURCE_ID och NOTION_FUNKTIONSOMRADEN_DATA_SOURCE_ID, eller ingen av dem",
  );
}
const notion =
  notionToken && projektKälla && funktionsområdenKälla
    ? createNotionApi({ token: notionToken, projektKälla, funktionsområdenKälla })
    : createFileNotion(notionFil);
const notionBeskrivning = notionSatt === 3 ? "Notions API" : notionFil;

await mkdir(dataDir, { recursive: true });
// One write queue for HTTP commands and the Notion sync (ADR 0001).
const skrivkö = createWriteQueue();
const apogee = createApogee({
  storage: createJsonFileStorage(dataDir),
  notion,
  skrivkö,
  now: () => new Date(),
  newId: randomId,
});
const server = await startServer({
  apogee,
  skrivkö,
  webDir,
  port,
  host,
  ...(process.env.APOGEE_PUBLIC_URL ? { publicUrl: process.env.APOGEE_PUBLIC_URL } : {}),
});
console.log(`Apogee på http://${host}:${server.address.port} (data: ${dataDir}, Notion: ${notionBeskrivning})`);

// Fetch from Notion at startup and every 5 minutes. A failed fetch changes nothing.
const synka = () =>
  apogee.synkaFrånNotion().catch((error: unknown) => console.error("Kunde inte hämta från Notion:", error));
void synka();
const synkTimer = setInterval(() => void synka(), SYNK_VAR_MS);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    clearInterval(synkTimer);
    void server.close().then(() => process.exit(0));
  });
}
