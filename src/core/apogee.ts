import { lika, nuvarande, senastFlyttad } from "./diagram.js";
import { DomainError } from "./errors.js";
import { projektFält, ärAvslutat, ärPågående } from "./status.js";
import type { Storage } from "./storage.js";
import type {
  Funktionsområde,
  FunktionsområdeId,
  Person,
  PersonId,
  Projekt,
  ProjektFält,
  ProjektId,
  ScopeId,
  ScopeValues,
  Uppdatering,
} from "./types.js";

export type ApogeeDeps = {
  storage: Storage;
  /** The clock; injected so tests are deterministic. */
  now: () => Date;
  /** Id generator; injected so tests are deterministic. */
  newId: () => string;
};

export type ProjektRad = { id: ProjektId; namn: string };
export type FunktionsområdeVy = { id: FunktionsområdeId; namn: string; projekt: ProjektRad[] };
export type Översikt = FunktionsområdeVy[];
export type ProjektVy = {
  id: ProjektId;
  namn: string;
  funktionsområde: { id: FunktionsområdeId; namn: string };
  /** The Hill chart: current Scopes, highest Läge first. */
  scopes: ScopeVy[];
  /** Marked Avslutat, or every Scope at Läge 100 (or none). */
  avslutat: boolean;
  /** Someone marked it Avslutat (it stays so until "Öppna igen"). */
  markeradAvslutat: boolean;
  /** Neither Avslutat nor Borttagen. */
  pågående: boolean;
};

/** A Scope as shown on the Hill chart and in the Scope index. */
export type ScopeVy = {
  id: ScopeId;
  namn: string;
  läge: number;
  /** The Ägare; `aktiv: false` is shown as "(inaktiv)". */
  ägare: PersonVy;
  /** ISO time its Läge last changed (or it was added). */
  flyttad: string;
};

export type PersonVy = { id: PersonId; namn: string; aktiv: boolean };
const personVy = ({ id, namn, aktiv }: Person): PersonVy => ({ id, namn, aktiv });
const ägareVy = (personer: Person[], id: PersonId): PersonVy => {
  const p = personer.find((x) => x.id === id);
  return p ? personVy(p) : { id, namn: "Okänd", aktiv: false };
};

export type Apogee = ReturnType<typeof createApogee>;

const MAX_NAMN = 200;

function namnFrån(input: string): string {
  const namn = String(input ?? "").trim();
  if (!namn) throw new DomainError("ogiltig", "Namnet får inte vara tomt");
  if (namn.length > MAX_NAMN) {
    throw new DomainError("ogiltig", `Namnet får vara högst ${MAX_NAMN} tecken`);
  }
  return namn;
}

/** Every write is signed by an active Person; anything else is rejected. */
function requireSignatur(personer: Person[], vem: PersonId | null | undefined): Person {
  if (!vem) throw new DomainError("signatur", "Välj vem du är innan du ändrar något");
  const person = personer.find((p) => p.id === vem);
  if (!person) throw new DomainError("signatur", "Signaturen är inte en Person");
  if (!person.aktiv) throw new DomainError("signatur", `${person.namn} är inaktiv`);
  return person;
}

/** A Scope's Ägare: required, and chosen among the active Personer. */
function requireÄgare(personer: Person[], ägare: PersonId | null | undefined): PersonId {
  if (!ägare) throw new DomainError("ogiltig", "Ett Scope måste ha en Ägare");
  const person = personer.find((p) => p.id === ägare);
  if (!person) throw new DomainError("ogiltig", "Ägaren är inte en Person");
  if (!person.aktiv) throw new DomainError("ogiltig", `${person.namn} är inaktiv och kan inte äga Scopes`);
  return person.id;
}

/** Läge is a whole number, clamped to 0–100. */
function lägeFrån(input: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new DomainError("ogiltig", "Läge måste vara ett tal");
  }
  return Math.min(100, Math.max(0, Math.round(input)));
}

/** Uppdatering types written by the Scope commands. */
export const SCOPE_TYP = {
  ny: "ny",
  flytt: "flytt",
  bytNamn: "byt namn",
  bytÄgare: "byt ägare",
  taBort: "ta bort",
} as const;

/** Uppdatering types written by the Projekt-level commands. */
export const PROJEKT_TYP = {
  avslutat: "avslutat",
  öppnaIgen: "öppna igen",
} as const;

const svenskOrdning = new Intl.Collator("sv");
const efterNamn = (a: { namn: string }, b: { namn: string }) => svenskOrdning.compare(a.namn, b.namn);

/**
 * The Apogee core: every domain rule lives behind these commands and queries.
 */
export function createApogee({ storage, now, newId }: ApogeeDeps) {
  async function requireFunktionsområde(id: FunktionsområdeId): Promise<Funktionsområde> {
    const fo = (await storage.listFunktionsområden()).find((f) => f.id === id);
    if (!fo) throw new DomainError("finns-inte", `Funktionsområdet ${id} finns inte`);
    return fo;
  }

  async function requireProjekt(id: ProjektId): Promise<Projekt> {
    const p = await storage.getProjekt(id);
    if (!p) throw new DomainError("finns-inte", `Projektet ${id} finns inte`);
    return p;
  }

  /** The active Person signing this write; rejects a missing, unknown or inaktiv Signatur. */
  async function signatur(vem: PersonId | null): Promise<Person> {
    return requireSignatur(await storage.listPersoner(), vem);
  }

  /** Appends one Uppdatering to a Projekt's Historik. Every chart edit goes through here. */
  async function skriv(
    projektId: ProjektId,
    typ: string,
    ändringar: Uppdatering["ändringar"],
    vem: PersonId,
    projekt?: Uppdatering["projekt"],
  ): Promise<Uppdatering> {
    const u: Uppdatering = { id: newId(), typ, vem, tid: now().toISOString(), ändringar };
    if (projekt) u.projekt = projekt;
    await storage.appendUppdatering(projektId, u);
    return u;
  }

  /**
   * Changes one existing Scope: signs, checks it exists, and writes one
   * Uppdatering unless the values would not change (then returns null).
   */
  async function ändraScope(
    projektId: ProjektId,
    scopeId: ScopeId,
    typ: string,
    vem: PersonId | null,
    ändring: (före: ScopeValues, personer: Person[]) => ScopeValues | null,
  ): Promise<Uppdatering | null> {
    const personer = await storage.listPersoner();
    const signerad = requireSignatur(personer, vem);
    await requireProjekt(projektId);
    const före = nuvarande(await storage.readHistorik(projektId))[scopeId];
    if (!före) throw new DomainError("finns-inte", `Scopet ${scopeId} finns inte`);
    const efter = ändring(före, personer);
    if (efter !== null && lika(före, efter)) return null;
    return skriv(projektId, typ, [{ scopeId, före, efter }], signerad.id);
  }

  /**
   * Sets one Projekt-level field: signs, checks the Projekt exists, and writes
   * one Uppdatering unless the field already has that value (then null).
   */
  async function ändraProjekt<K extends keyof ProjektFält>(
    projektId: ProjektId,
    typ: string,
    fält: K,
    värde: ProjektFält[K],
    vem: PersonId | null,
  ): Promise<Uppdatering | null> {
    const signerad = await signatur(vem);
    await requireProjekt(projektId);
    const före = projektFält(await storage.readHistorik(projektId))[fält];
    if (före === värde) return null;
    const ändring = { före: { [fält]: före }, efter: { [fält]: värde } };
    return skriv(projektId, typ, [], signerad.id, ändring);
  }

  function vy(fo: Funktionsområde, allProjekt: Projekt[]): FunktionsområdeVy {
    return {
      id: fo.id,
      namn: fo.namn,
      projekt: allProjekt
        .filter((p) => p.funktionsområdeId === fo.id)
        .sort(efterNamn)
        .map((p) => ({ id: p.id, namn: p.namn })),
    };
  }

  return {
    async createPerson(namn: string, vem: PersonId | null): Promise<PersonVy> {
      const giltigt = namnFrån(namn);
      const all = await storage.listPersoner();
      if (all.length > 0) requireSignatur(all, vem);
      const nyckel = giltigt.toLocaleLowerCase("sv");
      const finns = all.find((p) => p.namn.toLocaleLowerCase("sv") === nyckel);
      if (finns) throw new DomainError("finns-redan", `Det finns redan en Person som heter ${finns.namn}`);
      const person: Person = { id: newId(), namn: giltigt, aktiv: true, skapad: now().toISOString() };
      await storage.savePersoner([...all, person]);
      return personVy(person);
    },

    async listPersoner(): Promise<PersonVy[]> {
      return (await storage.listPersoner()).sort(efterNamn).map(personVy);
    },

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
      await requireFunktionsområde(funktionsområdeId);
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
      await requireFunktionsområde(funktionsområdeId);
      await storage.saveProjekt({ ...p, funktionsområdeId });
    },

    async overview(): Promise<Översikt> {
      const [all, allProjekt] = await Promise.all([
        storage.listFunktionsområden(),
        storage.listProjekt(),
      ]);
      return [...all].sort(efterNamn).map((fo) => vy(fo, allProjekt));
    },

    async getFunktionsområde(id: FunktionsområdeId): Promise<FunktionsområdeVy> {
      const fo = await requireFunktionsområde(id);
      return vy(fo, await storage.listProjekt());
    },

    async getProjekt(id: ProjektId): Promise<ProjektVy> {
      const p = await requireProjekt(id);
      const fo = await requireFunktionsområde(p.funktionsområdeId);
      const [logg, personer] = await Promise.all([storage.readHistorik(id), storage.listPersoner()]);
      const flyttad = senastFlyttad(logg);
      const scopes = Object.entries(nuvarande(logg))
        .map(([scopeId, s]): ScopeVy => ({
          id: scopeId,
          namn: s.namn,
          läge: s.läge,
          ägare: ägareVy(personer, s.ägare),
          flyttad: flyttad[scopeId]!,
        }))
        .sort((a, b) => b.läge - a.läge || efterNamn(a, b));
      const markeradAvslutat = projektFält(logg).avslutat;
      const avslutat = ärAvslutat(markeradAvslutat, scopes.map((s) => s.läge));
      return {
        id: p.id,
        namn: p.namn,
        funktionsområde: { id: fo.id, namn: fo.namn },
        scopes,
        avslutat,
        markeradAvslutat,
        pågående: ärPågående({ avslutat, borttagen: false }),
      };
    },

    /** A Projekt's Historik, oldest first. */
    async historik(id: ProjektId): Promise<Uppdatering[]> {
      await requireProjekt(id);
      return storage.readHistorik(id);
    },

    /** Adds a Scope at Läge 0. Ägare is required and must be an active Person. */
    async addScope(
      projektId: ProjektId,
      { namn, ägare }: { namn: string; ägare: PersonId },
      vem: PersonId | null,
    ): Promise<{ id: ScopeId; uppdatering: Uppdatering }> {
      const personer = await storage.listPersoner();
      const signerad = requireSignatur(personer, vem);
      const efter: ScopeValues = { namn: namnFrån(namn), läge: 0, ägare: requireÄgare(personer, ägare) };
      await requireProjekt(projektId);
      const id = newId();
      const uppdatering = await skriv(projektId, SCOPE_TYP.ny, [{ scopeId: id, före: null, efter }], signerad.id);
      return { id, uppdatering };
    },

    /** Moves a Scope to a new Läge (clamped to 0–100). Null when it is already there. */
    async moveScope(projektId: ProjektId, scopeId: ScopeId, läge: number, vem: PersonId | null) {
      const nytt = lägeFrån(läge);
      return ändraScope(projektId, scopeId, SCOPE_TYP.flytt, vem, (s) => ({ ...s, läge: nytt }));
    },

    async renameScope(projektId: ProjektId, scopeId: ScopeId, namn: string, vem: PersonId | null) {
      const nytt = namnFrån(namn);
      return ändraScope(projektId, scopeId, SCOPE_TYP.bytNamn, vem, (s) => ({ ...s, namn: nytt }));
    },

    /** Hands a Scope to another active Person. The Ägare can never be cleared. */
    async changeScopeÄgare(projektId: ProjektId, scopeId: ScopeId, ägare: PersonId, vem: PersonId | null) {
      return ändraScope(projektId, scopeId, SCOPE_TYP.bytÄgare, vem, (s, personer) => ({
        ...s,
        ägare: requireÄgare(personer, ägare),
      }));
    },

    /** Marks a Projekt Avslutat whatever its Scopes' Läge. Null when already marked. */
    async markAvslutat(projektId: ProjektId, vem: PersonId | null) {
      return ändraProjekt(projektId, PROJEKT_TYP.avslutat, "avslutat", true, vem);
    },

    /**
     * "Öppna igen": removes the Avslutat mark. Null when not marked. A Projekt
     * with every Scope at Läge 100 (or none) stays Avslutat.
     */
    async reopenProjekt(projektId: ProjektId, vem: PersonId | null) {
      return ändraProjekt(projektId, PROJEKT_TYP.öppnaIgen, "avslutat", false, vem);
    },

    /** Removes a Scope. Its id stays in the Historik, so Ångra can bring it back. */
    async removeScope(projektId: ProjektId, scopeId: ScopeId, vem: PersonId | null) {
      return ändraScope(projektId, scopeId, SCOPE_TYP.taBort, vem, () => null);
    },
  };
}
