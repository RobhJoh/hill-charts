// Projekt-level fields: the Avslutat mark, dates (Appetit) and Milstolpar.
// A Projekt's Avslutat mark and Milstolpar are Uppdateringar in its Historik;
// its dates, and a Funktionsområde's dates and Milstolpar, are saved on the
// record itself without Historik.
import { datumFrån, iOrdning, nyaDatum, TOM_TIDSPLAN, ändraMilstolpe, type DatumInput } from "../datum.js";
import { fältLika, projektFält } from "../status.js";
import { UPPDATERING_TYP } from "../typer.js";
import type {
  Datum,
  FunktionsområdeId,
  Milstolpe,
  MilstolpeId,
  PersonId,
  ProjektFält,
  ProjektId,
  Tidsplan,
  Uppdatering,
} from "../types.js";
import type { Kärna } from "./karna.js";
import { namnFrån } from "./regler.js";

/** Where dates and Milstolpar are changed: a Projekt (in its Historik) or a Funktionsområde. */
export type Mål = { projekt: ProjektId } | { funktionsområde: FunktionsområdeId };

export function projektfält(k: Kärna) {
  const { storage, signatur } = k;

  /**
   * Changes Projekt-level fields: signs, checks the Projekt exists, and writes
   * one Uppdatering holding only the fields that change (null if none do).
   */
  async function ändraProjektFält(
    projektId: ProjektId,
    typ: string,
    ändra: (före: ProjektFält) => Partial<ProjektFält>,
    vem: PersonId | null,
  ): Promise<Uppdatering | null> {
    const signerad = await signatur(vem);
    await k.requireProjekt(projektId);
    const nu = projektFält(await storage.readHistorik(projektId));
    const efter = ändra(nu);
    const nycklar = (Object.keys(efter) as (keyof ProjektFält)[]).filter((f) => !fältLika(nu[f], efter[f]));
    if (nycklar.length === 0) return null;
    const före: Partial<ProjektFält> = {};
    const ändrat: Partial<ProjektFält> = {};
    for (const f of nycklar) {
      Object.assign(före, { [f]: nu[f] });
      Object.assign(ändrat, { [f]: efter[f] });
    }
    return k.skriv(projektId, typ, [], signerad.id, { före, efter: ändrat });
  }

  /**
   * Changes the Milstolpar of a Projekt (an Uppdatering in its Historik) or
   * the dates or Milstolpar of a Funktionsområde (saved without Historik;
   * returns null).
   */
  async function ändraTidsplan(
    mål: Mål,
    typ: string,
    ändra: (före: Tidsplan) => Partial<Tidsplan>,
    vem: PersonId | null,
  ): Promise<Uppdatering | null> {
    if ("projekt" in mål) {
      return ändraProjektFält(mål.projekt, typ, (f) => ({ milstolpar: ändra({ ...TOM_TIDSPLAN, ...f }).milstolpar }), vem);
    }
    await signatur(vem);
    const fo = await k.requireFunktionsområde(mål.funktionsområde);
    const före = fo.tidsplan ?? TOM_TIDSPLAN;
    const tidsplan = { ...före, ...ändra(före) };
    const all = await storage.listFunktionsområden();
    await storage.saveFunktionsområden(all.map((f) => (f.id === fo.id ? { ...f, tidsplan } : f)));
    return null;
  }

  /** Checks that the Projekt or Funktionsområde exists. */
  async function requireMål(mål: Mål): Promise<void> {
    if ("projekt" in mål) await k.requireProjekt(mål.projekt);
    else await k.requireFunktionsområde(mål.funktionsområde);
  }

  return {
    /** Marks a Projekt Avslutat whatever its Scopes' Läge. Null when already marked. */
    async markAvslutat(projektId: ProjektId, vem: PersonId | null) {
      return ändraProjektFält(projektId, UPPDATERING_TYP.avslutat, () => ({ avslutat: true }), vem);
    },

    /**
     * "Öppna igen": removes the Avslutat mark. Null when not marked. A Projekt
     * with every Scope at Läge 100 (or none) stays Avslutat.
     */
    async reopenProjekt(projektId: ProjektId, vem: PersonId | null) {
      return ändraProjektFält(projektId, UPPDATERING_TYP.öppnaIgen, () => ({ avslutat: false }), vem);
    },

    /**
     * Sets a Projekt's or Funktionsområde's Startdatum and Slutdatum: two dates,
     * a Startdatum plus weeks, or a new Startdatum keeping the Appetit. A
     * Projekt's dates outside its Funktionsområde's only warn (`datumVarningar`).
     * Both are saved on the record itself, without Historik (#73): always null.
     */
    async setDatum(mål: Mål, input: DatumInput, vem: PersonId | null): Promise<null> {
      if (!("projekt" in mål)) {
        await ändraTidsplan(mål, UPPDATERING_TYP.datum, (t) => nyaDatum(t, input), vem);
        return null;
      }
      await signatur(vem);
      const p = await k.requireProjekt(mål.projekt);
      const datum = nyaDatum({ startdatum: p.startdatum ?? null, slutdatum: p.slutdatum ?? null }, input);
      await storage.saveProjekt({ ...p, ...datum });
      return null;
    },

    /** Adds a Milstolpe (name and date). */
    async addMilstolpe(
      mål: Mål,
      { namn, datum }: { namn: string; datum: Datum },
      vem: PersonId | null,
    ): Promise<{ id: MilstolpeId; uppdatering: Uppdatering | null }> {
      const giltig = { namn: namnFrån(namn), datum: datumFrån(datum) };
      await signatur(vem);
      await requireMål(mål);
      const ny: Milstolpe = { id: k.newId(), ...giltig };
      const uppdatering = await ändraTidsplan(
        mål,
        UPPDATERING_TYP.milstolpe,
        (t) => ({ milstolpar: iOrdning([...t.milstolpar, ny]) }),
        vem,
      );
      return { id: ny.id, uppdatering };
    },

    /** Renames a Milstolpe or moves its date. Null when nothing changed (always for a Funktionsområde). */
    async changeMilstolpe(
      mål: Mål,
      id: MilstolpeId,
      ändring: { namn?: string; datum?: Datum },
      vem: PersonId | null,
    ) {
      const namn = ändring.namn === undefined ? undefined : namnFrån(ändring.namn);
      const datum = ändring.datum === undefined ? undefined : datumFrån(ändring.datum);
      return ändraTidsplan(
        mål,
        UPPDATERING_TYP.milstolpe,
        (t) => ({
          milstolpar: ändraMilstolpe(t.milstolpar, id, (m) => ({ ...m, namn: namn ?? m.namn, datum: datum ?? m.datum })),
        }),
        vem,
      );
    },

    async removeMilstolpe(mål: Mål, id: MilstolpeId, vem: PersonId | null) {
      return ändraTidsplan(
        mål,
        UPPDATERING_TYP.milstolpe,
        (t) => ({ milstolpar: ändraMilstolpe(t.milstolpar, id, () => null) }),
        vem,
      );
    },
  };
}
