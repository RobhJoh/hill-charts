// The Notion source port (ADR 0003, docs/notion-sync.md): the core's one way
// to read the structure Notion owns. Adapters: the real Notion API (#79), a
// local JSON file for development (src/notion/fil.ts) and an in-memory fake
// for tests (src/notion/minne.ts).
import type { Datum } from "./types.js";

/** A page id in Notion. */
export type NotionId = string;

/** A ticked Projekt (`Apogee` checkbox) as read from `[Databas] Projekt`. */
export type NotionProjekt = {
  notionId: NotionId;
  /** The Notion page URL ("Ändra i Notion"). */
  url: string;
  namn: string;
  /** Its Funktionsområde's Notion id; null = none (Utan funktionsområde). */
  funktionsområde: NotionId | null;
  startdatum: Datum | null;
  slutdatum: Datum | null;
  /** `Status` exactly as it reads in Notion; null when empty. */
  notionStatus: string | null;
  /** The Projektledare's Notion person id; null when empty. */
  projektledare: NotionId | null;
};

/** A Funktionsområde referenced by a ticked Projekt, from `[Databas] Funktionsområden`. */
export type NotionFunktionsområde = {
  notionId: NotionId;
  url: string;
  namn: string;
  startdatum: Datum | null;
  slutdatum: Datum | null;
  notionStatus: string | null;
  /** The Funktionsansvarig's Notion person id; null when empty. */
  funktionsansvarig: NotionId | null;
};

/** A Notion person named as Projektledare or Funktionsansvarig. */
export type NotionPerson = { notionId: NotionId; namn: string };

/** Everything one fetch from Notion returns, already in Apogee's vocabulary. */
export type NotionSnapshot = {
  /** Only Projekt whose `Apogee` checkbox is ticked. */
  projekt: NotionProjekt[];
  /** Only Funktionsområden referenced by those Projekt. */
  funktionsområden: NotionFunktionsområde[];
  personer: NotionPerson[];
};

/** The Notion source: one fetch, which returns a snapshot or fails (rejects). */
export interface NotionKälla {
  hämta(): Promise<NotionSnapshot>;
}

/** Notion's `Datum` property: a start, and an end only for a range. */
export type NotionDatum = { start: Datum; end?: Datum | null } | null;

/**
 * Notion `Datum` to Startdatum and Slutdatum. A single date becomes the
 * Slutdatum with no Startdatum (a deadline). Every adapter honours this.
 */
export function datumFrånNotion(datum: NotionDatum | undefined): { startdatum: Datum | null; slutdatum: Datum | null } {
  if (!datum) return { startdatum: null, slutdatum: null };
  if (!datum.end) return { startdatum: null, slutdatum: datum.start };
  return { startdatum: datum.start, slutdatum: datum.end };
}
