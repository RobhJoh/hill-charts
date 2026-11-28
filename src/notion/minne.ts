import type {
  NotionFunktionsområde,
  NotionId,
  NotionKälla,
  NotionPerson,
  NotionProjekt,
  NotionSnapshot,
} from "../core/notion.js";

/**
 * A Notion source held in memory, for tests. The test changes the snapshot
 * between syncs; each fetch returns a copy after one timer tick, so two
 * concurrent syncs overlap.
 */
export type MemoryNotion = NotionKälla & {
  /** How many fetches have been made. */
  readonly hämtningar: number;
  /** Ticks a Projekt (adds or replaces it by Notion id). Missing fields default to empty. */
  projekt(p: Pick<NotionProjekt, "notionId" | "namn"> & Partial<NotionProjekt>): void;
  /** Adds or replaces a Funktionsområde by Notion id. */
  funktionsområde(fo: Pick<NotionFunktionsområde, "notionId" | "namn"> & Partial<NotionFunktionsområde>): void;
  person(p: NotionPerson): void;
  /** Takes a Projekt or Funktionsområde out of the snapshot. */
  utan(notionId: NotionId): void;
  /** From now on every fetch fails with this error (null: succeeds again). */
  misslyckas(fel: Error | null): void;
};

export function createMemoryNotion(start: Partial<NotionSnapshot> = {}): MemoryNotion {
  const snapshot: NotionSnapshot = {
    projekt: [...(start.projekt ?? [])],
    funktionsområden: [...(start.funktionsområden ?? [])],
    personer: [...(start.personer ?? [])],
  };
  let hämtningar = 0;
  let fel: Error | null = null;
  const ersätt = <T extends { notionId: NotionId }>(lista: T[], ny: T): T[] => [
    ...lista.filter((x) => x.notionId !== ny.notionId),
    ny,
  ];

  return {
    get hämtningar() {
      return hämtningar;
    },
    async hämta() {
      hämtningar++;
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (fel) throw fel;
      return structuredClone(snapshot);
    },
    projekt(p) {
      snapshot.projekt = ersätt(snapshot.projekt, {
        url: `https://www.notion.so/${p.notionId}`,
        funktionsområde: null,
        startdatum: null,
        slutdatum: null,
        notionStatus: null,
        projektledare: null,
        ...p,
      });
    },
    funktionsområde(fo) {
      snapshot.funktionsområden = ersätt(snapshot.funktionsområden, {
        url: `https://www.notion.so/${fo.notionId}`,
        startdatum: null,
        slutdatum: null,
        notionStatus: null,
        funktionsansvarig: null,
        ...fo,
      });
    },
    person(p) {
      snapshot.personer = ersätt(snapshot.personer, p);
    },
    utan(notionId) {
      snapshot.projekt = snapshot.projekt.filter((p) => p.notionId !== notionId);
      snapshot.funktionsområden = snapshot.funktionsområden.filter((f) => f.notionId !== notionId);
    },
    misslyckas(nyttFel) {
      fel = nyttFel;
    },
  };
}
