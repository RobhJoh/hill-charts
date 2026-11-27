// The Notion sync (ADR 0003, docs/notion-sync.md): Funktionsområden and
// Projekt are created and updated from a Notion source, one way. No step
// writes an Uppdatering.
import type { NotionFunktionsområde, NotionId, NotionKälla, NotionProjekt, NotionSnapshot } from "../notion.js";
import { PERSON_HÄNDELSE_TYP } from "../typer.js";
import type { Funktionsområde, FunktionsområdeId, Person, PersonId, Projekt } from "../types.js";
import type { Kärna } from "./karna.js";

/** How fresh the structure from Notion is. Held in memory; a sync runs at startup. */
export type SynkStatus = {
  /** When the last successful fetch from Notion was (ISO time); null before the first. */
  senastHämtat: string | null;
  /** Why the latest fetch failed, and when; null once a fetch succeeds. Nothing changed then. */
  fel: { tid: string; meddelande: string } | null;
};

/** Runs a write step in turn with every other write (ADR 0001: one process serializes writes). */
export type Skrivkö = <T>(steg: () => Promise<T>) => Promise<T>;

const ingenKälla: NotionKälla = {
  hämta: () => Promise.reject(new Error("Ingen Notion-källa är konfigurerad")),
};

export function notionSynk(k: Kärna, källa: NotionKälla = ingenKälla, iTur: Skrivkö = (steg) => steg()) {
  const { storage, now, newId } = k;
  let status: SynkStatus = { senastHämtat: null, fel: null };
  let pågående: Promise<SynkStatus> | null = null;

  async function synka(): Promise<SynkStatus> {
    const tid = now().toISOString();
    let snapshot: NotionSnapshot;
    try {
      snapshot = await källa.hämta();
    } catch (error) {
      const meddelande = error instanceof Error ? error.message : String(error);
      status = { ...status, fel: { tid, meddelande } };
      throw error;
    }
    await iTur(() => tillämpa(snapshot));
    status = { senastHämtat: tid, fel: null };
    return { ...status };
  }

  async function tillämpa(snapshot: NotionSnapshot): Promise<void> {
    const personIds = await upsertPersoner(snapshot);
    const foIds = await upsertFunktionsområden(snapshot, personIds);
    for (const np of snapshot.projekt) await upsertProjekt(np, foIds, personIds);
    await taBortSaknade(snapshot);
  }

  /**
   * Makes every Projektledare and Funktionsansvarig a Person: matched by
   * stored Notion id, else by name ignoring case (storing the id), else
   * created. Never renames a Person nor makes one inaktiv. Returns the
   * Person ids by Notion id.
   */
  async function upsertPersoner(snapshot: NotionSnapshot): Promise<Map<NotionId, PersonId>> {
    const refererade = new Set<NotionId | null>([
      ...snapshot.projekt.map((p) => p.projektledare),
      ...snapshot.funktionsområden.map((f) => f.funktionsansvarig),
    ]);
    const alla = await storage.listPersoner();
    const länkade = new Map<NotionId, PersonId>();
    const nya: Person[] = [];
    let ändrat = false;
    for (const np of snapshot.personer) {
      const namn = np.namn.trim();
      if (!refererade.has(np.notionId) || !namn || länkade.has(np.notionId)) continue;
      const finns =
        alla.find((p) => p.notionId === np.notionId) ??
        alla.find((p) => p.notionId === undefined && nyckel(p.namn) === nyckel(namn));
      if (finns) {
        if (finns.notionId === undefined) {
          finns.notionId = np.notionId;
          ändrat = true;
        }
        länkade.set(np.notionId, finns.id);
        continue;
      }
      const person: Person = {
        id: newId(),
        namn: ledigtNamn(alla, namn),
        aktiv: true,
        skapad: now().toISOString(),
        notionId: np.notionId,
      };
      alla.push(person);
      nya.push(person);
      länkade.set(np.notionId, person.id);
    }
    if (ändrat || nya.length > 0) await storage.savePersoner(alla);
    for (const person of nya) {
      await storage.appendPersonHändelse({
        id: newId(),
        typ: PERSON_HÄNDELSE_TYP.ny,
        personId: person.id,
        vem: null,
        tid: now().toISOString(),
        förraNamn: null,
        nyttNamn: person.namn,
      });
    }
    return länkade;
  }

  /**
   * A synced Projekt missing from the snapshot becomes Borttaget, kept whole.
   * A synced Funktionsområde is Borttaget while none of its Projekt is
   * synced, and back as soon as one is.
   */
  async function taBortSaknade(snapshot: NotionSnapshot): Promise<void> {
    const ticked = new Set(snapshot.projekt.map((p) => p.notionId));
    const tid = now().toISOString();
    const synkade = new Set<FunktionsområdeId>();
    for (const p of await storage.listProjekt()) {
      if (p.notionId === undefined) continue;
      if (ticked.has(p.notionId)) {
        if (p.funktionsområdeId !== undefined) synkade.add(p.funktionsområdeId);
      } else if (!p.borttagen) {
        await storage.saveProjekt({ ...p, borttagen: { tid } });
      }
    }
    const före = await storage.listFunktionsområden();
    const efter = före.map((fo): Funktionsområde => {
      if (fo.notionId === undefined) return fo;
      if (synkade.has(fo.id)) {
        const { borttagen: _, ...kvar } = fo;
        return kvar;
      }
      return fo.borttagen ? fo : { ...fo, borttagen: { tid } };
    });
    if (JSON.stringify(efter) !== JSON.stringify(före)) await storage.saveFunktionsområden(efter);
  }

  /** Upserts the Funktionsområden a ticked Projekt references; returns their ids by Notion id. */
  async function upsertFunktionsområden(
    snapshot: NotionSnapshot,
    personIds: Map<NotionId, PersonId>,
  ): Promise<Map<string, FunktionsområdeId>> {
    const refererade = new Set(snapshot.projekt.map((p) => p.funktionsområde));
    const ur = snapshot.funktionsområden.filter((f) => refererade.has(f.notionId));
    const före = await storage.listFunktionsområden();
    const efter = [...före];
    for (const nf of ur) {
      const i = efter.findIndex((f) => f.notionId === nf.notionId);
      if (i === -1) efter.push(nyttFunktionsområde(nf, personIds));
      else efter[i] = uppdateratFunktionsområde(efter[i]!, nf, personIds);
    }
    if (JSON.stringify(efter) !== JSON.stringify(före)) await storage.saveFunktionsområden(efter);
    return new Map(efter.filter((f) => f.notionId !== undefined).map((f) => [f.notionId!, f.id]));
  }

  function nyttFunktionsområde(nf: NotionFunktionsområde, personIds: Map<NotionId, PersonId>): Funktionsområde {
    return uppdateratFunktionsområde({ id: newId(), namn: "", skapad: now().toISOString() }, nf, personIds);
  }

  function uppdateratFunktionsområde(
    { funktionsansvarig: _, ...fo }: Funktionsområde,
    nf: NotionFunktionsområde,
    personIds: Map<NotionId, PersonId>,
  ): Funktionsområde {
    const funktionsansvarig = nf.funktionsansvarig === null ? undefined : personIds.get(nf.funktionsansvarig);
    return {
      ...fo,
      namn: namnUr(nf.namn),
      tidsplan: { milstolpar: [], ...fo.tidsplan, startdatum: nf.startdatum, slutdatum: nf.slutdatum },
      notionId: nf.notionId,
      notionUrl: nf.url,
      notionStatus: nf.notionStatus,
      ...(funktionsansvarig !== undefined && { funktionsansvarig }),
    };
  }

  async function upsertProjekt(
    np: NotionProjekt,
    foIds: Map<string, FunktionsområdeId>,
    personIds: Map<NotionId, PersonId>,
  ): Promise<void> {
    const finns = (await storage.listProjekt()).find((p) => p.notionId === np.notionId);
    const { funktionsområdeId: _, projektledare: __, borttagen: ___, ...bas } = finns ?? {
      id: newId(),
      namn: "",
      skapad: now().toISOString(),
    };
    const foId = np.funktionsområde === null ? undefined : foIds.get(np.funktionsområde);
    const projektledare = np.projektledare === null ? undefined : personIds.get(np.projektledare);
    const p: Projekt = {
      ...bas,
      namn: namnUr(np.namn),
      ...(foId !== undefined && { funktionsområdeId: foId }),
      startdatum: np.startdatum,
      slutdatum: np.slutdatum,
      notionId: np.notionId,
      notionUrl: np.url,
      notionStatus: np.notionStatus,
      ...(projektledare !== undefined && { projektledare }),
    };
    if (JSON.stringify(p) !== JSON.stringify(finns)) await storage.saveProjekt(p);
  }

  return {
    /**
     * Fetches the structure from Notion and creates or updates Funktionsområden
     * and Projekt by Notion id. A call made while a sync runs waits for that
     * one and gets its result. Rejects when the fetch fails; nothing changes
     * then, and the sync state records the error.
     */
    synkaFrånNotion(): Promise<SynkStatus> {
      pågående ??= synka().finally(() => {
        pågående = null;
      });
      return pågående;
    },

    /** The sync state: when Apogee last fetched from Notion, and whether the latest fetch failed. */
    synkStatus(): SynkStatus {
      return { ...status };
    },
  };
}

/** Person names compare ignoring case (as `requireLedigtNamn`). */
const nyckel = (namn: string) => namn.toLocaleLowerCase("sv");

/**
 * The name itself, or with " (2)", " (3)" … when another Person already
 * has it: two Notion people may share a name, but Personer may not.
 */
function ledigtNamn(personer: Person[], namn: string): string {
  const tagna = new Set(personer.map((p) => nyckel(p.namn)));
  let kandidat = namn;
  for (let i = 2; tagna.has(nyckel(kandidat)); i++) kandidat = `${namn} (${i})`;
  return kandidat;
}

/** A name from Notion; an empty one is shown as "Namnlös". */
function namnUr(namn: string): string {
  return namn.trim() || "Namnlös";
}
