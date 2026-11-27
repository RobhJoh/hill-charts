import { readFile } from "node:fs/promises";
import { datumFrånNotion, type NotionDatum, type NotionKälla, type NotionSnapshot } from "../core/notion.js";

/**
 * A Notion source that reads a local JSON file, for development without a
 * Notion token. The file is shaped like the two Notion databases:
 *
 *   {
 *     "projekt": [{ "id", "url"?, "namn", "apogee": true, "funktionsområde"?: id,
 *                   "datum"?: { "start", "end"? }, "status"?, "projektledare"?: id }],
 *     "funktionsområden": [{ "id", "url"?, "namn", "datum"?, "status"?, "funktionsansvarig"?: id }],
 *     "personer": [{ "id", "namn" }]
 *   }
 *
 * Like Notion, only Projekt with `apogee: true` are returned, with the
 * Funktionsområden they reference; a single date becomes the Slutdatum. The
 * file is read on every fetch, so editing it and syncing shows the change.
 */
export function createFileNotion(path: string): NotionKälla {
  return {
    async hämta(): Promise<NotionSnapshot> {
      const fil = JSON.parse(await readFile(path, "utf8")) as unknown;
      if (!fil || typeof fil !== "object" || Array.isArray(fil)) {
        throw new Error(`${path} är inte ett JSON-objekt`);
      }
      const { projekt = [], funktionsområden = [], personer = [] } = fil as Fil;
      const ikryssade = projekt.filter((p) => p.apogee === true);
      const refererade = new Set(ikryssade.map((p) => p.funktionsområde));
      return {
        projekt: ikryssade.map((p) => ({
          notionId: p.id,
          url: p.url ?? `https://www.notion.so/${p.id}`,
          namn: p.namn,
          funktionsområde: p.funktionsområde ?? null,
          ...datumFrånNotion(p.datum),
          notionStatus: p.status ?? null,
          projektledare: p.projektledare ?? null,
        })),
        funktionsområden: funktionsområden
          .filter((f) => refererade.has(f.id))
          .map((f) => ({
            notionId: f.id,
            url: f.url ?? `https://www.notion.so/${f.id}`,
            namn: f.namn,
            ...datumFrånNotion(f.datum),
            notionStatus: f.status ?? null,
            funktionsansvarig: f.funktionsansvarig ?? null,
          })),
        personer: personer.map((p) => ({ notionId: p.id, namn: p.namn })),
      };
    },
  };
}

type Fil = {
  projekt?: {
    id: string;
    url?: string;
    namn: string;
    apogee?: boolean;
    funktionsområde?: string | null;
    datum?: NotionDatum;
    status?: string | null;
    projektledare?: string | null;
  }[];
  funktionsområden?: {
    id: string;
    url?: string;
    namn: string;
    datum?: NotionDatum;
    status?: string | null;
    funktionsansvarig?: string | null;
  }[];
  personer?: { id: string; namn: string }[];
};
