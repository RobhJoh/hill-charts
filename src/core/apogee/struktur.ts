// Funktionsområden and Projekt as records: create, rename, move, Ta bort,
// Återställ, Radera, and the views that list them (overview, pages).
import { datumVarningar, idagFrån, TOM_TIDSPLAN } from "../datum.js";
import { DomainError } from "../errors.js";
import type { Funktionsområde, FunktionsområdeId, Person, PersonId, Projekt, ProjektId } from "../types.js";
import type { Kärna } from "./karna.js";
import { avslutadTid, funktionsområdeStatus } from "../status.js";
import { inteBorttaget, namnFrån, requireBekräftelse } from "./regler.js";
import {
  borttagenEnsam,
  borttagenVy,
  efterNamn,
  svenskOrdning,
  tidVy,
  type FunktionsområdeVy,
  type ProjektRad,
  type ProjektVy,
  type UtanFunktionsområdeVy,
  type Översikt,
} from "./vyer.js";

export function struktur(k: Kärna) {
  const { storage, now, newId, signatur, requireFunktionsområde, requireProjekt } = k;

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
        .filter((p) => !borttagenEnsam(p))
        .sort(efterNamn)
        .map((p) => projektRad(p, personer)),
    );
    const borttagnaProjekt = egna
      .filter(borttagenEnsam)
      .map((p) => ({ id: p.id, namn: p.namn, borttagen: borttagenVy(personer, p.borttagen!) }))
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
      borttagen: fo.borttagen ? borttagenVy(personer, fo.borttagen) : null,
      status: funktionsområdeStatus(projekt.map((p) => p.status)),
      stilla: projekt.reduce((n, p) => n + p.stilla, 0),
      projekt,
      borttagnaProjekt,
      ...tidVy(tidsplan, passerat && allaAvslutade, idag),
    };
  }

  return {
    async createFunktionsområde(namn: string, vem: PersonId | null): Promise<Funktionsområde> {
      await signatur(vem);
      const fo: Funktionsområde = { id: newId(), namn: namnFrån(namn), skapad: now().toISOString() };
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden([...all, fo]);
      return fo;
    },

    async createProjekt(
      funktionsområdeId: FunktionsområdeId,
      namn: string,
      vem: PersonId | null,
    ): Promise<Projekt> {
      await signatur(vem);
      const giltigt = namnFrån(namn);
      inteBorttaget(await requireFunktionsområde(funktionsområdeId));
      const p: Projekt = { id: newId(), namn: giltigt, funktionsområdeId, skapad: now().toISOString() };
      await storage.saveProjekt(p);
      return p;
    },

    async renameFunktionsområde(id: FunktionsområdeId, nyttNamn: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const namn = namnFrån(nyttNamn);
      await requireFunktionsområde(id);
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden(all.map((f) => (f.id === id ? { ...f, namn } : f)));
    },

    async renameProjekt(id: ProjektId, namn: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const giltigt = namnFrån(namn);
      const p = await requireProjekt(id);
      await storage.saveProjekt({ ...p, namn: giltigt });
    },

    async moveProjekt(
      id: ProjektId,
      funktionsområdeId: FunktionsområdeId,
      vem: PersonId | null,
    ): Promise<void> {
      await signatur(vem);
      const p = await requireProjekt(id);
      inteBorttaget(await requireFunktionsområde(funktionsområdeId));
      await storage.saveProjekt({ ...p, funktionsområdeId });
    },

    /** Ta bort: hides a Projekt (always allowed). It stays whole, Historik included, until Radera. */
    async taBortProjekt(id: ProjektId, vem: PersonId | null): Promise<void> {
      const signerad = await signatur(vem);
      const p = await requireProjekt(id);
      if (p.borttagen) throw new DomainError("ogiltig", `${p.namn} är redan borttaget`);
      const borttagen = { vem: signerad.id, tid: now().toISOString(), medFunktionsområde: false };
      await storage.saveProjekt({ ...p, borttagen });
    },

    /** Återställ: brings back a Projekt taken away on its own, whole. */
    async återställProjekt(id: ProjektId, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const { borttagen, ...p } = await requireProjekt(id);
      if (!borttagen) throw new DomainError("ogiltig", `${p.namn} är inte borttaget`);
      const fo = p.funktionsområdeId === undefined ? null : await requireFunktionsområde(p.funktionsområdeId);
      if (fo?.borttagen) {
        throw new DomainError("ogiltig", `${fo.namn} är borttaget; återställ Funktionsområdet först`);
      }
      if (borttagen.medFunktionsområde) {
        throw new DomainError("ogiltig", `${p.namn} togs bort med sitt Funktionsområde; återställ Funktionsområdet`);
      }
      await storage.saveProjekt(p);
    },

    /**
     * Ta bort: hides a Funktionsområde and, as one unit, its Projekt. Only
     * when none of its Projekt is Pågående (Inte påbörjat and Avslutat ones
     * may go); those taken away on their own earlier stay so.
     */
    async taBortFunktionsområde(id: FunktionsområdeId, vem: PersonId | null): Promise<void> {
      const signerad = await signatur(vem);
      const fo = inteBorttaget(await requireFunktionsområde(id));
      const [allProjekt, personer] = await Promise.all([storage.listProjekt(), storage.listPersoner()]);
      const medFo = allProjekt.filter((p) => p.funktionsområdeId === id && !p.borttagen);
      const pågående: string[] = [];
      for (const p of medFo) {
        if (k.diagramVy(await storage.readHistorik(p.id), personer).status === "pågående") pågående.push(p.namn);
      }
      if (pågående.length > 0) {
        throw new DomainError(
          "ogiltig",
          `${fo.namn} kan tas bort först när inget av dess Projekt är Pågående. Pågående: ${pågående.sort(svenskOrdning.compare).join(", ")}`,
        );
      }
      const tid = now().toISOString();
      for (const p of medFo) {
        await storage.saveProjekt({ ...p, borttagen: { vem: signerad.id, tid, medFunktionsområde: true } });
      }
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden(
        all.map((f) => (f.id === id ? { ...f, borttagen: { vem: signerad.id, tid } } : f)),
      );
    },

    /** Återställ: brings back a Funktionsområde with the Projekt that went with it. */
    async återställFunktionsområde(id: FunktionsområdeId, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const fo = await requireFunktionsområde(id);
      if (!fo.borttagen) throw new DomainError("ogiltig", `${fo.namn} är inte borttaget`);
      for (const { borttagen, ...p } of await storage.listProjekt()) {
        if (p.funktionsområdeId === id && borttagen?.medFunktionsområde) await storage.saveProjekt(p);
      }
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden(
        all.map((f) => {
          if (f.id !== id) return f;
          const { borttagen: _, ...kvar } = f;
          return kvar;
        }),
      );
    },

    /**
     * Radera: erases a Projekt taken away on its own, Historik included, for
     * good. Confirmed by typing its exact name.
     */
    async raderaProjekt(id: ProjektId, bekräftelse: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const p = await requireProjekt(id);
      if (!p.borttagen) throw new DomainError("ogiltig", `Ta bort ${p.namn} innan det kan raderas`);
      if (p.borttagen.medFunktionsområde) {
        throw new DomainError("ogiltig", `${p.namn} togs bort med sitt Funktionsområde och raderas bara med det`);
      }
      requireBekräftelse(p.namn, bekräftelse);
      await storage.eraseProjekt(id);
    },

    /**
     * Radera: erases a Borttaget Funktionsområde and every Projekt in it
     * (also those taken away on their own) for good. Confirmed by typing its
     * exact name.
     */
    async raderaFunktionsområde(id: FunktionsområdeId, bekräftelse: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const fo = await requireFunktionsområde(id);
      if (!fo.borttagen) throw new DomainError("ogiltig", `Ta bort ${fo.namn} innan det kan raderas`);
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

    /**
     * "Borttagna Funktionsområden", newest first: each with the Projekt that
     * went with it (`projekt`) and those taken away on their own before.
     */
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
        funktionsområde: fo && { id: fo.id, namn: fo.namn },
        borttagen: p.borttagen ? borttagenVy(personer, p.borttagen) : null,
        datumVarningar: datumVarningar(tid.tidsplan, fo?.tidsplan ?? TOM_TIDSPLAN),
        avslutad: avslutadTid(logg),
        ...diagram,
        ...tid,
      };
    },
  };
}
