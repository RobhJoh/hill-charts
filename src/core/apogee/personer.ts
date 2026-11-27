// Personer: adding, renaming, removing (with handover) and reactivating, the
// Personer-historik, and the per-Person views (Stjärnkarta, Personer index).
import { nuvarande } from "../diagram.js";
import { DomainError } from "../errors.js";
import { PERSON_HÄNDELSE_TYP, UPPDATERING_TYP, type PersonHändelseTyp } from "../typer.js";
import type { Person, PersonHändelse, PersonId, Uppdatering } from "../types.js";
import type { Kärna } from "./karna.js";
import { namnFrån, requireLedigtNamn, requirePerson, requireSignatur, requireÄgare } from "./regler.js";
import {
  efterNamn,
  personVy,
  type PersonRad,
  type PersonRäkning,
  type PersonVy,
  type StjärnkartaProjekt,
  type StjärnkartaVy,
} from "./vyer.js";

function räkna(egna: StjärnkartaProjekt[]): PersonRäkning {
  const pågående = egna.filter((p) => !p.avslutat);
  const scopes = pågående.flatMap((p) => p.scopes);
  return {
    scopes: scopes.length,
    projekt: pågående.length,
    stilla: scopes.filter((s) => s.stilla).length,
    avslutade: egna.length - pågående.length,
  };
}

/** The Projekt in which `person` owns Scopes, with only those Scopes. */
const egnaProjekt = (alla: StjärnkartaProjekt[], person: PersonId): StjärnkartaProjekt[] =>
  alla
    .map((p) => ({ ...p, scopes: p.scopes.filter((s) => s.ägare.id === person) }))
    .filter((p) => p.scopes.length > 0);

export function personer(k: Kärna) {
  const { storage, now, newId } = k;

  /**
   * Saves one Person's new state among `all` and records the change in the
   * Personer-historik. Every Personer command goes through here.
   */
  async function sparaPerson(
    all: Person[],
    efter: Person,
    typ: PersonHändelseTyp,
    vem: PersonId | null,
    extra: Pick<PersonHändelse, "nyÄgare"> = {},
  ): Promise<PersonVy> {
    const före = all.find((p) => p.id === efter.id);
    await storage.savePersoner(före ? all.map((p) => (p.id === efter.id ? efter : p)) : [...all, efter]);
    await storage.appendPersonHändelse({
      id: newId(),
      typ,
      personId: efter.id,
      vem,
      tid: now().toISOString(),
      förraNamn: före?.namn ?? null,
      nyttNamn: efter.namn,
      ...extra,
    });
    return personVy(efter);
  }

  /**
   * Every shown Projekt (Borttagna left out, also those gone with their
   * Funktionsområde) with its Hill chart and countdown, in name order: what
   * the Stjärnkarta and the Personer index pick each Person's Scopes from.
   */
  async function synligaDiagram(personer: Person[]): Promise<StjärnkartaProjekt[]> {
    const synliga = (await storage.listProjekt()).filter((p) => !p.borttagen).sort(efterNamn);
    return Promise.all(
      synliga.map(async (p) => {
        const logg = await storage.readHistorik(p.id);
        const { scopes, avslutat } = k.diagramVy(logg, personer, false);
        const { nedräkning, nästaMilstolpe, överTid } = k.projektTidVy(logg, avslutat);
        return { id: p.id, namn: p.namn, avslutat, nedräkning, nästaMilstolpe, överTid, scopes };
      }),
    );
  }

  return {
    async createPerson(namn: string, vem: PersonId | null): Promise<PersonVy> {
      const giltigt = namnFrån(namn);
      const all = await storage.listPersoner();
      const signerad = all.length > 0 ? requireSignatur(all, vem).id : null;
      requireLedigtNamn(all, giltigt);
      const person: Person = { id: newId(), namn: giltigt, aktiv: true, skapad: now().toISOString() };
      return sparaPerson(all, person, PERSON_HÄNDELSE_TYP.ny, signerad);
    },

    /** Renames a Person everywhere (Historik refers to the id); writes no Uppdatering. */
    async renamePerson(id: PersonId, namn: string, vem: PersonId | null): Promise<PersonVy> {
      const all = await storage.listPersoner();
      const signerad = requireSignatur(all, vem);
      const giltigt = namnFrån(namn);
      const person = requirePerson(all, id);
      requireLedigtNamn(all, giltigt, id);
      return sparaPerson(all, { ...person, namn: giltigt }, PERSON_HÄNDELSE_TYP.bytNamn, signerad.id);
    },

    /**
     * Removes a Person by handing their Scopes in every Pågående Projekt to
     * `nyÄgare` (one Uppdatering per affected Projekt, returned) and making
     * them inaktiv. Scopes in Avslutade and Borttagna Projekt keep them.
     */
    async removePerson(id: PersonId, nyÄgare: PersonId, vem: PersonId | null): Promise<Uppdatering[]> {
      const all = await storage.listPersoner();
      const signerad = requireSignatur(all, vem);
      const person = requirePerson(all, id);
      if (!person.aktiv) throw new DomainError("ogiltig", `${person.namn} är redan inaktiv`);
      if (nyÄgare === id) throw new DomainError("ogiltig", "Välj någon annan som ny Ägare");
      const mottagare = requireÄgare(all, nyÄgare);

      const uppdateringar: Uppdatering[] = [];
      for (const p of await storage.listProjekt()) {
        const logg = await storage.readHistorik(p.id);
        if (!k.diagramVy(logg, all, !!p.borttagen).pågående) continue;
        const ändringar = Object.entries(nuvarande(logg))
          .filter(([, s]) => s.ägare === id)
          .map(([scopeId, före]) => ({ scopeId, före, efter: { ...före, ägare: mottagare } }));
        if (ändringar.length) {
          uppdateringar.push(await k.skriv(p.id, UPPDATERING_TYP.överlämning, ändringar, signerad.id));
        }
      }
      await sparaPerson(all, { ...person, aktiv: false }, PERSON_HÄNDELSE_TYP.taBort, signerad.id, {
        nyÄgare: mottagare,
      });
      return uppdateringar;
    },

    /** Återaktivera: an inaktiv Person is active again. Handed-over Scopes stay where they are. */
    async reactivatePerson(id: PersonId, vem: PersonId | null): Promise<PersonVy> {
      const all = await storage.listPersoner();
      const signerad = requireSignatur(all, vem);
      const person = requirePerson(all, id);
      if (person.aktiv) throw new DomainError("ogiltig", `${person.namn} är redan aktiv`);
      return sparaPerson(all, { ...person, aktiv: true }, PERSON_HÄNDELSE_TYP.återaktivera, signerad.id);
    },

    /** The Personer-historik, oldest first. There is no Ångra for these. */
    async personerHistorik(): Promise<PersonHändelse[]> {
      return storage.readPersonerHistorik();
    },

    /**
     * A Person's Stjärnkarta: every Scope they own in shown Projekt, grouped
     * by Projekt (Pågående first, then Avslutade, each in name order).
     * Borttagna Projekt are never included; inaktiva Personer have none.
     */
    async stjärnkarta(id: PersonId): Promise<StjärnkartaVy> {
      const personer = await storage.listPersoner();
      const person = requirePerson(personer, id);
      if (!person.aktiv) throw new DomainError("finns-inte", `${person.namn} är inaktiv och har ingen Stjärnkarta`);
      const egna = egnaProjekt(await synligaDiagram(personer), id);
      const projekt = [...egna.filter((p) => !p.avslutat), ...egna.filter((p) => p.avslutat)];
      return { person: personVy(person), projekt, räkning: räkna(egna) };
    },

    /** The Personer index: every Person (inaktiva too) with their load and a strip of Läge dots. */
    async personerÖversikt(): Promise<PersonRad[]> {
      const personer = (await storage.listPersoner()).sort(efterNamn);
      const alla = await synligaDiagram(personer);
      return personer.map((person) => {
        const egna = egnaProjekt(alla, person.id);
        const lägen = egna
          .filter((p) => !p.avslutat)
          .flatMap((p) => p.scopes.map(({ läge, stilla }) => ({ läge, stilla })))
          .sort((a, b) => b.läge - a.läge);
        return { ...personVy(person), räkning: räkna(egna), lägen };
      });
    },

    async listPersoner(): Promise<PersonVy[]> {
      return (await storage.listPersoner()).sort(efterNamn).map(personVy);
    },
  };
}
