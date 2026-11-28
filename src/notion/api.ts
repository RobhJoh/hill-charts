import {
  datumFrånNotion,
  type NotionFunktionsområde,
  type NotionId,
  type NotionKälla,
  type NotionPerson,
  type NotionProjekt,
  type NotionSnapshot,
} from "../core/notion.js";

/** The Notion API version whose data-source query endpoint this adapter speaks. */
export const NOTION_VERSION = "2025-09-03";

export type NotionApiInställning = {
  /** The integration's secret token. */
  token: string;
  /** Data source id of `[Databas] Projekt`. */
  projektKälla: string;
  /** Data source id of `[Databas] Funktionsområden`. */
  funktionsområdenKälla: string;
  /** Injected for tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** How long one request may take before the fetch fails (default 30 s). */
  timeoutMs?: number;
  /** Default https://api.notion.com. */
  baseUrl?: string;
};

/**
 * The real Notion source (ADR 0003, docs/notion-sync.md). It queries the two
 * data sources through Notion's data-source query API, following every page:
 * the Projekt with the `Apogee` checkbox ticked, and the Funktionsområden they
 * reference through the `Funktionsområde` relation. It reads `Datum`,
 * `Status`, `Projektledare` and `Funktionsansvarig`; a single date becomes the
 * Slutdatum and a person with no name is no person. Any Notion error or
 * timeout rejects, so the sync records an error and changes nothing.
 */
export function createNotionApi(inställning: NotionApiInställning): NotionKälla {
  const fetcher = inställning.fetch ?? fetch;
  const timeoutMs = inställning.timeoutMs ?? 30_000;
  const baseUrl = inställning.baseUrl ?? "https://api.notion.com";

  async function fråga(källa: string, filter?: unknown): Promise<Sida[]> {
    const sidor: Sida[] = [];
    let cursor: string | null = null;
    do {
      const svar = await fetcher(`${baseUrl}/v1/data_sources/${encodeURIComponent(källa)}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${inställning.token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
          ...(filter ? { filter } : {}),
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!svar.ok) {
        const fel = (await svar.json().catch(() => null)) as { code?: string; message?: string } | null;
        throw new Error(`Notion svarade ${svar.status} för ${källa}: ${fel?.code ?? ""} ${fel?.message ?? ""}`.trim());
      }
      const lista = (await svar.json()) as Lista;
      sidor.push(...lista.results.filter((s) => s.object === "page"));
      cursor = lista.has_more ? lista.next_cursor : null;
    } while (cursor);
    return sidor;
  }

  return {
    async hämta(): Promise<NotionSnapshot> {
      const [projektSidor, foSidor] = await Promise.all([
        fråga(inställning.projektKälla, { property: "Apogee", checkbox: { equals: true } }),
        fråga(inställning.funktionsområdenKälla),
      ]);
      const personer = new Map<NotionId, NotionPerson>();
      const person = (egenskap: Egenskap | undefined): NotionId | null => {
        const namngiven = egenskap && "people" in egenskap ? egenskap.people.find((p) => p.name?.trim()) : undefined;
        if (!namngiven?.name) return null;
        personer.set(namngiven.id, { notionId: namngiven.id, namn: namngiven.name.trim() });
        return namngiven.id;
      };

      const projekt: NotionProjekt[] = projektSidor
        .filter((s) => kryss(s.properties.Apogee))
        .map((s) => ({
          notionId: s.id,
          url: s.url,
          namn: titel(s),
          funktionsområde: relation(s.properties["Funktionsområde"]),
          ...datum(s.properties.Datum),
          notionStatus: status(s.properties.Status),
          projektledare: person(s.properties.Projektledare),
        }));
      const refererade = new Set(projekt.map((p) => p.funktionsområde));
      const funktionsområden: NotionFunktionsområde[] = foSidor
        .filter((s) => refererade.has(s.id))
        .map((s) => ({
          notionId: s.id,
          url: s.url,
          namn: titel(s),
          ...datum(s.properties.Datum),
          notionStatus: status(s.properties.Status),
          funktionsansvarig: person(s.properties.Funktionsansvarig),
        }));
      return { projekt, funktionsområden, personer: [...personer.values()] };
    },
  };
}

// The parts of Notion's page objects that Apogee reads.
type Lista = { results: Sida[]; has_more: boolean; next_cursor: string | null };
type Sida = { object: string; id: string; url: string; properties: Record<string, Egenskap> };
type Användare = { id: string; name?: string | null };
type Egenskap =
  | { type: "title"; title: { plain_text: string }[] }
  | { type: "checkbox"; checkbox: boolean }
  | { type: "date"; date: { start: string; end?: string | null } | null }
  | { type: "status"; status: { name: string } | null }
  | { type: "select"; select: { name: string } | null }
  | { type: "people"; people: Användare[] }
  | { type: "relation"; relation: { id: string }[] }
  | { type: string };

function titel(sida: Sida): string {
  const egenskap = Object.values(sida.properties).find((e) => e.type === "title");
  return egenskap && "title" in egenskap ? egenskap.title.map((t) => t.plain_text).join("").trim() : "";
}

function kryss(egenskap: Egenskap | undefined): boolean {
  return !!egenskap && "checkbox" in egenskap && egenskap.checkbox === true;
}

function relation(egenskap: Egenskap | undefined): NotionId | null {
  return egenskap && "relation" in egenskap ? (egenskap.relation[0]?.id ?? null) : null;
}

function status(egenskap: Egenskap | undefined): string | null {
  if (egenskap && "status" in egenskap) return egenskap.status?.name ?? null;
  if (egenskap && "select" in egenskap) return egenskap.select?.name ?? null;
  return null;
}

/** Notion dates may carry a time; Apogee keeps the day. */
function datum(egenskap: Egenskap | undefined) {
  const d = egenskap && "date" in egenskap ? egenskap.date : null;
  return datumFrånNotion(d ? { start: d.start.slice(0, 10), end: d.end ? d.end.slice(0, 10) : null } : null);
}
