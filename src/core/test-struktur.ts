// Test setup shared by the core's tests: the structure (Funktionsområden and
// Projekt) is ticked in a fake Notion and synced, as in production (ADR 0003).
import type { MemoryNotion } from "../notion/minne.js";
import type { Apogee } from "./apogee.js";
import type { NotionFunktionsområde, NotionProjekt } from "./notion.js";
import type { Storage } from "./storage.js";
import type { FunktionsområdeId, ProjektId } from "./types.js";

/** Notion ids in tests are made from names, so tests can refer to things by name. */
export const notionIdFör = (namn: string) => `notion-${namn}`;

export function notionStruktur(apogee: Apogee, notion: MemoryNotion, storage: Storage) {
  async function projektId(namn: string): Promise<ProjektId> {
    const p = (await storage.listProjekt()).find((x) => x.notionId === notionIdFör(namn));
    if (!p) throw new Error(`Projektet ${namn} synkades inte`);
    return p.id;
  }

  async function funktionsområdeId(namn: string): Promise<FunktionsområdeId> {
    const fo = (await storage.listFunktionsområden()).find((x) => x.notionId === notionIdFör(namn));
    if (!fo) throw new Error(`Funktionsområdet ${namn} synkades inte`);
    return fo.id;
  }

  const synka = () => apogee.synkaFrånNotion();

  return {
    synka,
    /** The Notion id a test gives the Projekt or Funktionsområde of that name. */
    idFör: notionIdFör,
    projektId,
    funktionsområdeId,

    /**
     * Ticks a Projekt in Notion, in the Funktionsområde named `fo` (added to
     * Notion if new) or in none, syncs, and returns its id in Apogee.
     */
    async projekt(namn: string, fo: string | null = null, fält: Partial<NotionProjekt> = {}): Promise<ProjektId> {
      if (fo !== null && !(await notion.hämta()).funktionsområden.some((f) => f.notionId === notionIdFör(fo))) {
        notion.funktionsområde({ notionId: notionIdFör(fo), namn: fo });
      }
      notion.projekt({ notionId: notionIdFör(namn), namn, funktionsområde: fo && notionIdFör(fo), ...fält });
      await synka();
      return projektId(namn);
    },

    /** Unticks a Projekt in Notion (or it is trashed, or gone) and syncs. */
    async avbocka(namn: string): Promise<void> {
      notion.utan(notionIdFör(namn));
      await synka();
    },

    /** Changes a Projekt (by its first name) in Notion and syncs. */
    async ändraProjekt(namn: string, fält: Partial<NotionProjekt>): Promise<void> {
      const p = (await notion.hämta()).projekt.find((x) => x.notionId === notionIdFör(namn));
      if (!p) throw new Error(`Projektet ${namn} finns inte i Notion`);
      notion.projekt({ ...p, ...fält });
      await synka();
    },

    /** Changes a Funktionsområde (by its first name) in Notion and syncs. */
    async ändraFunktionsområde(namn: string, fält: Partial<NotionFunktionsområde>): Promise<void> {
      const fo = (await notion.hämta()).funktionsområden.find((x) => x.notionId === notionIdFör(namn));
      if (!fo) throw new Error(`Funktionsområdet ${namn} finns inte i Notion`);
      notion.funktionsområde({ ...fo, ...fält });
      await synka();
    },
  };
}
