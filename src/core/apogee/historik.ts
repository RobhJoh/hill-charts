// A Projekt's Historik: the raw log, the Historik panel, Visa (preview),
// Återställ hit and Ångra bara denna.
import { diagramEfter, lika, nuvarande, återställHit, ångraEn } from "../diagram.js";
import { DomainError } from "../errors.js";
import { historikRader, type HistorikRad } from "../historik.js";
import { fältLika, projektFält } from "../status.js";
import { UPPDATERING_TYP } from "../typer.js";
import type { PersonId, ProjektFält, ProjektId, Uppdatering, UppdateringId } from "../types.js";
import type { Kärna } from "./karna.js";
import { ägareVy, type Förhandsvisning, type PersonVy } from "./vyer.js";

export function historik(k: Kärna) {
  const { storage, signatur } = k;

  /** A Projekt's Historik and the index of one of its Uppdateringar. */
  async function historikMed(projektId: ProjektId, uppdateringId: UppdateringId) {
    await k.requireProjekt(projektId);
    const logg = await storage.readHistorik(projektId);
    const index = logg.findIndex((u) => u.id === uppdateringId);
    if (index < 0) throw new DomainError("finns-inte", `Uppdateringen ${uppdateringId} finns inte`);
    return { logg, index };
  }

  return {
    /** A Projekt's Historik, oldest first. */
    async historik(id: ProjektId): Promise<Uppdatering[]> {
      await k.requireProjekt(id);
      return storage.readHistorik(id);
    },

    /** The Historik panel: rows newest first, consecutive drags merged. */
    async historikVy(projektId: ProjektId): Promise<HistorikRad<PersonVy>[]> {
      await k.requireProjekt(projektId);
      const [logg, personer] = await Promise.all([storage.readHistorik(projektId), storage.listPersoner()]);
      return historikRader(logg, (id) => ägareVy(personer, id));
    },

    /**
     * Visa: the chart, status, dates and Milstolpar right after an
     * Uppdatering, and what differs from now.
     */
    async förhandsvisa(projektId: ProjektId, uppdateringId: UppdateringId): Promise<Förhandsvisning> {
      const { logg, index } = await historikMed(projektId, uppdateringId);
      const [personer, p] = await Promise.all([storage.listPersoner(), k.requireProjekt(projektId)]);
      const då = diagramEfter(logg, index);
      const nu = nuvarande(logg);
      const skiljer = [...new Set([...Object.keys(då), ...Object.keys(nu)])].filter(
        (id) => !lika(då[id] ?? null, nu[id] ?? null),
      );
      const fram = logg.slice(0, index + 1);
      const fältDå = projektFält(fram);
      const fältNu = projektFält(logg);
      const fältSkiljer = (Object.keys(fältNu) as (keyof ProjektFält)[]).filter((f) => !fältLika(fältDå[f], fältNu[f]));
      const milstolpeDå = new Map(fältDå.milstolpar.map((m) => [m.id, m]));
      const milstolpeNu = new Map(fältNu.milstolpar.map((m) => [m.id, m]));
      const milstolparSkiljer = [...new Set([...milstolpeDå.keys(), ...milstolpeNu.keys()])].filter(
        (id) => !fältLika(milstolpeDå.get(id) ?? null, milstolpeNu.get(id) ?? null),
      );
      const diagram = k.diagramVy(fram, personer, !!p.borttagen);
      return {
        ...diagram,
        ...k.projektTidVy(p, fram, diagram.avslutat),
        skiljer,
        fältSkiljer,
        milstolparSkiljer,
        sammaSomNu: skiljer.length === 0 && fältSkiljer.length === 0,
      };
    },

    /**
     * Återställ hit: one Uppdatering that puts the whole chart back to right
     * after the target. Null when the chart already looks like that.
     */
    async återställHit(projektId: ProjektId, mål: UppdateringId, vem: PersonId | null): Promise<Uppdatering | null> {
      const signerad = await signatur(vem);
      const { logg, index } = await historikMed(projektId, mål);
      const ä = återställHit(logg, index);
      if (!ä) return null;
      return k.skriv(projektId, UPPDATERING_TYP.återställning, ä.ändringar, signerad.id, ä.projekt, mål);
    },

    /**
     * Ångra bara denna: one Uppdatering reverting only the fields the target
     * changed. Rejected (`krock`) if any of them has changed since.
     */
    async ångra(projektId: ProjektId, mål: UppdateringId, vem: PersonId | null): Promise<Uppdatering> {
      const signerad = await signatur(vem);
      const { logg, index } = await historikMed(projektId, mål);
      const resultat = ångraEn(logg, index);
      if (!resultat.ok) {
        const skäl = resultat.krockar.map((x) => `${x.namn} ${x.varför}`).join(", ");
        throw new DomainError(
          "krock",
          `Går inte att ångra bara den här: ${skäl}. Använd Återställ hit på Uppdateringen före i stället, eller ändra för hand.`,
        );
      }
      return k.skriv(projektId, UPPDATERING_TYP.ångra, resultat.ändringar, signerad.id, resultat.projekt, mål);
    },
  };
}
