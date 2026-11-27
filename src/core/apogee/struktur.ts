// Funktionsområden and Projekt as records: Radera, and the views that list
// them (overview, pages). They are created, named, moved, dated, taken away
// (Borttagen) and brought back only by the Notion sync (./notion.ts, ADR 0003).
import { datumVarningar, idagFrån, TOM_TIDSPLAN } from "../datum.js";
import { DomainError } from "../errors.js";
import type { Funktionsområde, FunktionsområdeId, Person, PersonId, Projekt, ProjektId } from "../types.js";
import type { Kärna } from "./karna.js";
import { avslutadTid, funktionsområdeStatus } from "../status.js";
import { requireBekräftelse } from "./regler.js";
import {
  borttagenVy,
  efterNamn,
  tidVy,
  type FunktionsområdeVy,
  type ProjektRad,
  type ProjektVy,
  type UtanFunktionsområdeVy,
  type Översikt,
} from "./vyer.js";

export function struktur(k: Kärna) {
  const { storage, now, signatur, requireFunktionsområde, requireProjekt } = k;

  async function projektRad(p: Projekt, personer: Person[]): Promise<ProjektRad> {
    const logg = await storage.readHistorik(p.id);
    const { scopes, status, avslutat } = k.diagramVy(logg, personer);
    const { nedräkning, nästaMilstolpe, överTid } = k.projektTidVy(p, logg, avslutat);
    return {
      id: p.id,
      namn: p.namn,
      status,
      avslutat,
      avslutad: avslutadTid(logg),
      nedräkning,
      nästaMilstolpe,
      överTid,
      stilla: scopes.filter((s) => s.stilla).length,
      scopes: scopes.map(({ läge, stilla }) => ({ läge, stilla })),
    };
  }

  async function vy(fo: Funktionsområde, allProjekt: Projekt[], personer: Person[]): Promise<FunktionsområdeVy> {
    const egna = allProjekt.filter((p) => p.funktionsområdeId === fo.id);
    const projekt = await Promise.all(
      egna
        .filter((p) => !p.borttagen)
        .sort(efterNamn)
        .map((p) => projektRad(p, personer)),
    );
    const borttagnaProjekt = egna
      .filter((p) => p.borttagen)
      .map((p) => ({ id: p.id, namn: p.namn, borttagen: borttagenVy(p.borttagen!) }))
      .sort((a, b) => b.borttagen.tid.localeCompare(a.borttagen.tid) || efterNamn(a, b));
    // Över tid while any Projekt is not Avslutat; "Avslutat" only once the
    // Slutdatum has passed with every Projekt Avslutat.
    const tidsplan = fo.tidsplan ?? TOM_TIDSPLAN;
    const idag = idagFrån(now());
    const allaAvslutade = projekt.every((p) => p.avslutat);
    const passerat = tidsplan.slutdatum !== null && idag > tidsplan.slutdatum;
    return {
      id: fo.id,
      namn: fo.namn,
      notionUrl: fo.notionUrl ?? null,
      borttagen: fo.borttagen ? borttagenVy(fo.borttagen) : null,
      status: funktionsområdeStatus(projekt.map((p) => p.status)),
      stilla: projekt.reduce((n, p) => n + p.stilla, 0),
      projekt,
      borttagnaProjekt,
      ...tidVy(tidsplan, passerat && allaAvslutade, idag),
    };
  }

  return {
    /**
     * Radera: erases a Borttaget Projekt, Historik included, for good.
     * Confirmed by typing its exact name. Ticked again in Notion later, it
     * comes back as a new Projekt with an empty Hill chart.
     */
    async raderaProjekt(id: ProjektId, bekräftelse: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const p = await requireProjekt(id);
      if (!p.borttagen) throw new DomainError("ogiltig", `${p.namn} raderas först när det är borttaget i Notion`);
      requireBekräftelse(p.namn, bekräftelse);
      await storage.eraseProjekt(id);
    },

    /**
     * Radera: erases a Borttaget Funktionsområde and every Projekt in it
     * (all Borttagna) for good. Confirmed by typing its exact name.
     */
    async raderaFunktionsområde(id: FunktionsområdeId, bekräftelse: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const fo = await requireFunktionsområde(id);
      if (!fo.borttagen) throw new DomainError("ogiltig", `${fo.namn} raderas först när det är borttaget`);
      requireBekräftelse(fo.namn, bekräftelse);
      for (const p of await storage.listProjekt()) {
        if (p.funktionsområdeId === id) await storage.eraseProjekt(p.id);
      }
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden(all.filter((f) => f.id !== id));
    },

    /** Shown Funktionsområden with their Projekt; Borttagna are left out. */
    async overview(): Promise<Översikt> {
      const [all, allProjekt, personer] = await Promise.all([
        storage.listFunktionsområden(),
        storage.listProjekt(),
        storage.listPersoner(),
      ]);
      const synliga = all.filter((fo) => !fo.borttagen).sort(efterNamn);
      return Promise.all(synliga.map((fo) => vy(fo, allProjekt, personer)));
    },

    /**
     * The Utan funktionsområde group on the start page, after the
     * Funktionsområden; null when no shown Projekt lacks a Funktionsområde.
     */
    async utanFunktionsområde(): Promise<UtanFunktionsområdeVy | null> {
      const [allProjekt, personer] = await Promise.all([storage.listProjekt(), storage.listPersoner()]);
      const utan = allProjekt.filter((p) => p.funktionsområdeId === undefined && !p.borttagen).sort(efterNamn);
      if (utan.length === 0) return null;
      return { projekt: await Promise.all(utan.map((p) => projektRad(p, personer))) };
    },

    /** "Borttagna Funktionsområden", newest first, each with its (Borttagna) Projekt. */
    async borttagnaFunktionsområden(): Promise<FunktionsområdeVy[]> {
      const [all, allProjekt, personer] = await Promise.all([
        storage.listFunktionsområden(),
        storage.listProjekt(),
        storage.listPersoner(),
      ]);
      const borttagna = all
        .filter((fo) => fo.borttagen)
        .sort((a, b) => b.borttagen!.tid.localeCompare(a.borttagen!.tid) || efterNamn(a, b));
      return Promise.all(borttagna.map((fo) => vy(fo, allProjekt, personer)));
    },

    async getFunktionsområde(id: FunktionsområdeId): Promise<FunktionsområdeVy> {
      const fo = await requireFunktionsområde(id);
      const [allProjekt, personer] = await Promise.all([storage.listProjekt(), storage.listPersoner()]);
      return vy(fo, allProjekt, personer);
    },

    async getProjekt(id: ProjektId): Promise<ProjektVy> {
      const p = await requireProjekt(id);
      const fo = p.funktionsområdeId === undefined ? null : await requireFunktionsområde(p.funktionsområdeId);
      const [logg, personer] = await Promise.all([storage.readHistorik(id), storage.listPersoner()]);
      const diagram = k.diagramVy(logg, personer);
      const tid = k.projektTidVy(p, logg, diagram.avslutat);
      return {
        id: p.id,
        namn: p.namn,
        notionUrl: p.notionUrl ?? null,
        funktionsområde: fo && { id: fo.id, namn: fo.namn },
        borttagen: p.borttagen ? borttagenVy(p.borttagen) : null,
        datumVarningar: datumVarningar(tid.tidsplan, fo?.tidsplan ?? TOM_TIDSPLAN),
        avslutad: avslutadTid(logg),
        ...diagram,
        ...tid,
      };
    },
  };
}
