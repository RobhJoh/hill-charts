import { HISTORIK_TYP, diagramEfter, lika, nuvarande, senastFlyttad, återställHit, ångraEn } from "./diagram.js";
import { DomainError } from "./errors.js";
import { historikRader, type HistorikRad } from "./historik.js";
import { annonseraUppdateringar } from "./live.js";
import {
  datumFrån,
  datumVarningar,
  idagFrån,
  iOrdning,
  nedräkning,
  nyaDatum,
  nästaMilstolpe,
  TOM_TIDSPLAN,
  ändraMilstolpe,
  ärÖverTid,
  type DatumInput,
  type Nedräkning,
  type NästaMilstolpe,
} from "./datum.js";
import { dagarSedan, fältLika, projektFält, ärAvslutat, ärPågående, ärStilla } from "./status.js";
import type { Storage } from "./storage.js";
import type {
  Borttagen,
  Datum,
  Funktionsområde,
  FunktionsområdeId,
  Milstolpe,
  MilstolpeId,
  Person,
  PersonHändelse,
  PersonHändelseTyp,
  PersonId,
  Projekt,
  ProjektFält,
  ProjektId,
  ScopeId,
  ScopeValues,
  Tidsplan,
  Uppdatering,
  UppdateringId,
} from "./types.js";

export type ApogeeDeps = {
  storage: Storage;
  /** The clock; injected so tests are deterministic. */
  now: () => Date;
  /** Id generator; injected so tests are deterministic. */
  newId: () => string;
};

/** Where dates and Milstolpar are changed: a Projekt (in its Historik) or a Funktionsområde. */
export type Mål = { projekt: ProjektId } | { funktionsområde: FunktionsområdeId };

/** Dates and time pressure against today (see datum.ts). */
export type TidVy = {
  tidsplan: Tidsplan;
  /** Null when there is no Slutdatum and it is not Avslutat. */
  nedräkning: Nedräkning | null;
  nästaMilstolpe: NästaMilstolpe | null;
  överTid: boolean;
};

/** A Projekt in a list: a mini sky chart with its status. */
export type ProjektRad = {
  id: ProjektId;
  namn: string;
  avslutat: boolean;
  pågående: boolean;
  nedräkning: Nedräkning | null;
  nästaMilstolpe: NästaMilstolpe | null;
  överTid: boolean;
  /** Number of stuck Scopes. */
  stilla: number;
  /** The mini chart's dots, highest Läge first. */
  scopes: { läge: number; stilla: boolean }[];
};
export type FunktionsområdeVy = {
  id: FunktionsområdeId;
  namn: string;
  /** Who took it away and when; null while it is shown. */
  borttagen: BorttagenVy | null;
  /** Stuck Scopes across its Projekt. */
  stilla: number;
  /** Its Projekt, except those taken away on their own (they went with it if it is Borttagen). */
  projekt: ProjektRad[];
  /** Projekt taken away on their own ("Borttagna Projekt"), newest first. */
  borttagnaProjekt: BorttagetProjekt[];
} & TidVy;
/** Who took something away (Ta bort) and when. */
export type BorttagenVy = { vem: PersonVy; tid: string };
/** A row in "Borttagna Projekt". */
export type BorttagetProjekt = { id: ProjektId; namn: string; borttagen: BorttagenVy };
export type Översikt = FunktionsområdeVy[];
export type ProjektVy = {
  id: ProjektId;
  namn: string;
  funktionsområde: { id: FunktionsområdeId; namn: string };
  /** Who took it away and when (on its own or with its Funktionsområde); null while shown. */
  borttagen: BorttagenVy | null;
  /** Quiet warnings such as "slutar efter Funktionsområdet"; never block saving. */
  datumVarningar: string[];
} & DiagramVy &
  TidVy;

/** A Projekt's Hill chart and derived status. */
export type DiagramVy = {
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
  /** ISO time its Läge last changed (or it was added). Drives star size. */
  flyttad: string;
  /** Whole days since its Läge last changed ("Ingen rörelse på N dagar"). */
  stillaDagar: number;
  /** Stuck: no Läge change for more than 14 days (never at Läge 100 or in an Avslutat Projekt). */
  stilla: boolean;
};

/**
 * Visa in the Historik: the chart and status at a point, and the Scopes that
 * differ from now (incl. added/removed since).
 */
export type Förhandsvisning = DiagramVy & { skiljer: ScopeId[] };

export type PersonVy = { id: PersonId; namn: string; aktiv: boolean };
const personVy = ({ id, namn, aktiv }: Person): PersonVy => ({ id, namn, aktiv });
const ägareVy = (personer: Person[], id: PersonId): PersonVy => {
  const p = personer.find((x) => x.id === id);
  return p ? personVy(p) : { id, namn: "Okänd", aktiv: false };
};

const borttagenVy = (personer: Person[], b: Borttagen): BorttagenVy => ({
  vem: ägareVy(personer, b.vem),
  tid: b.tid,
});
/** Taken away on its own, not with its Funktionsområde. */
const borttagenEnsam = (p: Projekt): boolean => !!p.borttagen && !p.borttagen.medFunktionsområde;

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

/**
 * Person names are unique ignoring case, across active and inaktiva Personer.
 * A name an inaktiv Person has is refused with "finns-inaktiv", so that
 * Återaktivera can be offered instead.
 */
function requireLedigtNamn(personer: Person[], namn: string, utom?: PersonId): void {
  const nyckel = namn.toLocaleLowerCase("sv");
  const finns = personer.find((p) => p.id !== utom && p.namn.toLocaleLowerCase("sv") === nyckel);
  if (finns?.aktiv) throw new DomainError("finns-redan", `Det finns redan en Person som heter ${finns.namn}`);
  if (finns) throw new DomainError("finns-inaktiv", `${finns.namn} finns redan men är inaktiv`);
}

function requirePerson(personer: Person[], id: PersonId): Person {
  const person = personer.find((p) => p.id === id);
  if (!person) throw new DomainError("finns-inte", `Personen ${id} finns inte`);
  return person;
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

/** Radera is confirmed by typing the exact name (surrounding spaces aside). */
function requireBekräftelse(namn: string, bekräftelse: string): void {
  if (String(bekräftelse ?? "").trim() !== namn) {
    throw new DomainError("ogiltig", `Skriv namnet exakt, ${namn}, för att radera`);
  }
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

/** Uppdatering type written when a removed Person's Scopes are handed over. */
export const ÖVERLÄMNING_TYP = "överlämning";

/** Uppdatering types written by the Projekt-level commands. */
export const PROJEKT_TYP = {
  avslutat: "avslutat",
  öppnaIgen: "öppna igen",
  datum: "datum",
  milstolpe: "milstolpe",
} as const;

const svenskOrdning = new Intl.Collator("sv");
const efterNamn = (a: { namn: string }, b: { namn: string }) => svenskOrdning.compare(a.namn, b.namn);

/**
 * The Apogee core: every domain rule lives behind these commands and queries.
 */
export function createApogee({ storage: lagring, now, newId }: ApogeeDeps) {
  // Every Uppdatering written to a Historik is announced via `påUppdatering`.
  const { storage, påUppdatering } = annonseraUppdateringar(lagring);

  async function requireFunktionsområde(id: FunktionsområdeId): Promise<Funktionsområde> {
    const fo = (await storage.listFunktionsområden()).find((f) => f.id === id);
    if (!fo) throw new DomainError("finns-inte", `Funktionsområdet ${id} finns inte`);
    return fo;
  }

  /** New or moved Projekt can only go into a shown Funktionsområde. */
  function inteBorttaget(fo: Funktionsområde): Funktionsområde {
    if (fo.borttagen) throw new DomainError("ogiltig", `${fo.namn} är borttaget`);
    return fo;
  }

  async function requireProjekt(id: ProjektId): Promise<Projekt> {
    const p = await storage.getProjekt(id);
    if (!p) throw new DomainError("finns-inte", `Projektet ${id} finns inte`);
    return p;
  }

  /** The active Person signing this write; rejects a missing, unknown or inaktiv Signatur. */
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
    mål?: UppdateringId,
  ): Promise<Uppdatering> {
    const u: Uppdatering = { id: newId(), typ, vem, tid: now().toISOString(), ...(mål ? { mål } : {}), ändringar };
    if (projekt) u.projekt = projekt;
    await storage.appendUppdatering(projektId, u);
    return u;
  }

  /**
   * Changes one existing Scope: signs, checks it exists, and writes one
   * Uppdatering unless the values would not change (then returns null).
   */
  /** A Projekt's Historik and the index of one of its Uppdateringar. */
  async function historikMed(projektId: ProjektId, uppdateringId: UppdateringId) {
    await requireProjekt(projektId);
    const logg = await storage.readHistorik(projektId);
    const index = logg.findIndex((u) => u.id === uppdateringId);
    if (index < 0) throw new DomainError("finns-inte", `Uppdateringen ${uppdateringId} finns inte`);
    return { logg, index };
  }

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
    await requireProjekt(projektId);
    const nu = projektFält(await storage.readHistorik(projektId));
    const efter = ändra(nu);
    const nycklar = (Object.keys(efter) as (keyof ProjektFält)[]).filter((k) => !fältLika(nu[k], efter[k]));
    if (nycklar.length === 0) return null;
    const före: Partial<ProjektFält> = {};
    const ändrat: Partial<ProjektFält> = {};
    for (const k of nycklar) {
      Object.assign(före, { [k]: nu[k] });
      Object.assign(ändrat, { [k]: efter[k] });
    }
    return skriv(projektId, typ, [], signerad.id, { före, efter: ändrat });
  }

  /**
   * Changes the dates or Milstolpar of a Projekt (an Uppdatering in its
   * Historik) or a Funktionsområde (saved without Historik; returns null).
   */
  async function ändraTidsplan(
    mål: Mål,
    typ: string,
    ändra: (före: Tidsplan) => Partial<Tidsplan>,
    vem: PersonId | null,
  ): Promise<Uppdatering | null> {
    if ("projekt" in mål) return ändraProjektFält(mål.projekt, typ, ändra, vem);
    await signatur(vem);
    const fo = await requireFunktionsområde(mål.funktionsområde);
    const före = fo.tidsplan ?? TOM_TIDSPLAN;
    const tidsplan = { ...före, ...ändra(före) };
    const all = await storage.listFunktionsområden();
    await storage.saveFunktionsområden(all.map((f) => (f.id === fo.id ? { ...f, tidsplan } : f)));
    return null;
  }

  /** Checks that the Projekt or Funktionsområde exists. */
  async function requireMål(mål: Mål): Promise<void> {
    if ("projekt" in mål) await requireProjekt(mål.projekt);
    else await requireFunktionsområde(mål.funktionsområde);
  }

  function tidVy(tidsplan: Tidsplan, avslutat: boolean, idag: Datum): TidVy {
    return {
      tidsplan,
      nedräkning: nedräkning(tidsplan, avslutat, idag),
      nästaMilstolpe: avslutat ? null : nästaMilstolpe(tidsplan.milstolpar, idag),
      överTid: ärÖverTid(tidsplan.slutdatum, avslutat, idag),
    };
  }

  /** A Projekt's dates, Milstolpar and countdown from its Historik. */
  function projektTidVy(logg: Uppdatering[], avslutat: boolean): TidVy {
    const { startdatum, slutdatum, milstolpar } = projektFält(logg);
    return tidVy({ startdatum, slutdatum, milstolpar }, avslutat, idagFrån(now()));
  }

  /** A Projekt's Hill chart and status from its Historik, against the clock's "now". */
  function diagramVy(logg: Uppdatering[], personer: Person[], borttagen: boolean): DiagramVy {
    const nu = now();
    const flyttad = senastFlyttad(logg);
    const diagram = Object.entries(nuvarande(logg));
    const markeradAvslutat = projektFält(logg).avslutat;
    const avslutat = ärAvslutat(markeradAvslutat, diagram.map(([, s]) => s.läge));
    const scopes = diagram
      .map(([scopeId, s]): ScopeVy => {
        const stillaDagar = dagarSedan(flyttad[scopeId]!, nu);
        return {
          id: scopeId,
          namn: s.namn,
          läge: s.läge,
          ägare: ägareVy(personer, s.ägare),
          flyttad: flyttad[scopeId]!,
          stillaDagar,
          stilla: ärStilla(stillaDagar, s.läge, avslutat),
        };
      })
      .sort((a, b) => b.läge - a.läge || efterNamn(a, b));
    return { scopes, avslutat, markeradAvslutat, pågående: ärPågående({ avslutat, borttagen }) };
  }

  async function projektRad(p: Projekt, personer: Person[]): Promise<ProjektRad> {
    const logg = await storage.readHistorik(p.id);
    const { scopes, avslutat, pågående } = diagramVy(logg, personer, !!p.borttagen);
    const { nedräkning, nästaMilstolpe, överTid } = projektTidVy(logg, avslutat);
    return {
      id: p.id,
      namn: p.namn,
      avslutat,
      pågående,
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
      stilla: projekt.reduce((n, p) => n + p.stilla, 0),
      projekt,
      borttagnaProjekt,
      ...tidVy(tidsplan, passerat && allaAvslutade, idag),
    };
  }

  return {
    /** Listens for every Uppdatering written, by any command (live sync, #36). */
    påUppdatering,

    async createPerson(namn: string, vem: PersonId | null): Promise<PersonVy> {
      const giltigt = namnFrån(namn);
      const all = await storage.listPersoner();
      const signerad = all.length > 0 ? requireSignatur(all, vem).id : null;
      requireLedigtNamn(all, giltigt);
      const person: Person = { id: newId(), namn: giltigt, aktiv: true, skapad: now().toISOString() };
      return sparaPerson(all, person, "ny", signerad);
    },

    /** Renames a Person everywhere (Historik refers to the id); writes no Uppdatering. */
    async renamePerson(id: PersonId, namn: string, vem: PersonId | null): Promise<PersonVy> {
      const all = await storage.listPersoner();
      const signerad = requireSignatur(all, vem);
      const giltigt = namnFrån(namn);
      const person = requirePerson(all, id);
      requireLedigtNamn(all, giltigt, id);
      return sparaPerson(all, { ...person, namn: giltigt }, "byt namn", signerad.id);
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
        if (!diagramVy(logg, all, !!p.borttagen).pågående) continue;
        const ändringar = Object.entries(nuvarande(logg))
          .filter(([, s]) => s.ägare === id)
          .map(([scopeId, före]) => ({ scopeId, före, efter: { ...före, ägare: mottagare } }));
        if (ändringar.length) uppdateringar.push(await skriv(p.id, ÖVERLÄMNING_TYP, ändringar, signerad.id));
      }
      await sparaPerson(all, { ...person, aktiv: false }, "ta bort", signerad.id, { nyÄgare: mottagare });
      return uppdateringar;
    },

    /** Återaktivera: an inaktiv Person is active again. Handed-over Scopes stay where they are. */
    async reactivatePerson(id: PersonId, vem: PersonId | null): Promise<PersonVy> {
      const all = await storage.listPersoner();
      const signerad = requireSignatur(all, vem);
      const person = requirePerson(all, id);
      if (person.aktiv) throw new DomainError("ogiltig", `${person.namn} är redan aktiv`);
      return sparaPerson(all, { ...person, aktiv: true }, "återaktivera", signerad.id);
    },

    /** The Personer-historik, oldest first. There is no Ångra for these. */
    async personerHistorik(): Promise<PersonHändelse[]> {
      return storage.readPersonerHistorik();
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
      const fo = await requireFunktionsområde(p.funktionsområdeId);
      if (fo.borttagen) {
        throw new DomainError("ogiltig", `${fo.namn} är borttaget; återställ Funktionsområdet först`);
      }
      if (borttagen.medFunktionsområde) {
        throw new DomainError("ogiltig", `${p.namn} togs bort med sitt Funktionsområde; återställ Funktionsområdet`);
      }
      await storage.saveProjekt(p);
    },

    /**
     * Ta bort: hides a Funktionsområde and, as one unit, its Projekt. Only
     * when none of its Projekt is Pågående; those taken away on their own
     * earlier stay so.
     */
    async taBortFunktionsområde(id: FunktionsområdeId, vem: PersonId | null): Promise<void> {
      const signerad = await signatur(vem);
      const fo = inteBorttaget(await requireFunktionsområde(id));
      const [allProjekt, personer] = await Promise.all([storage.listProjekt(), storage.listPersoner()]);
      const medFo = allProjekt.filter((p) => p.funktionsområdeId === id && !p.borttagen);
      const pågående: string[] = [];
      for (const p of medFo) {
        if (diagramVy(await storage.readHistorik(p.id), personer, false).pågående) pågående.push(p.namn);
      }
      if (pågående.length > 0) {
        throw new DomainError(
          "ogiltig",
          `${fo.namn} kan tas bort först när alla dess Projekt är Avslutade. Pågående: ${pågående.sort(svenskOrdning.compare).join(", ")}`,
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
      const fo = await requireFunktionsområde(p.funktionsområdeId);
      const [logg, personer] = await Promise.all([storage.readHistorik(id), storage.listPersoner()]);
      const diagram = diagramVy(logg, personer, !!p.borttagen);
      const tid = projektTidVy(logg, diagram.avslutat);
      return {
        id: p.id,
        namn: p.namn,
        funktionsområde: { id: fo.id, namn: fo.namn },
        borttagen: p.borttagen ? borttagenVy(personer, p.borttagen) : null,
        datumVarningar: datumVarningar(tid.tidsplan, fo.tidsplan ?? TOM_TIDSPLAN),
        ...diagram,
        ...tid,
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

    /**
     * Sets a Projekt's or Funktionsområde's Startdatum and Slutdatum: two dates,
     * a Startdatum plus weeks, or a new Startdatum keeping the Appetit. A
     * Projekt's dates outside its Funktionsområde's only warn (`datumVarningar`).
     * Projekt: the Uppdatering, or null when nothing changed. Funktionsområde: null.
     */
    async setDatum(mål: Mål, input: DatumInput, vem: PersonId | null) {
      return ändraTidsplan(mål, PROJEKT_TYP.datum, (t) => nyaDatum(t, input), vem);
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
      const ny: Milstolpe = { id: newId(), ...giltig };
      const uppdatering = await ändraTidsplan(
        mål,
        PROJEKT_TYP.milstolpe,
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
        PROJEKT_TYP.milstolpe,
        (t) => ({
          milstolpar: ändraMilstolpe(t.milstolpar, id, (m) => ({ ...m, namn: namn ?? m.namn, datum: datum ?? m.datum })),
        }),
        vem,
      );
    },

    async removeMilstolpe(mål: Mål, id: MilstolpeId, vem: PersonId | null) {
      return ändraTidsplan(
        mål,
        PROJEKT_TYP.milstolpe,
        (t) => ({ milstolpar: ändraMilstolpe(t.milstolpar, id, () => null) }),
        vem,
      );
    },

    /** Removes a Scope. Its id stays in the Historik, so Ångra can bring it back. */
    async removeScope(projektId: ProjektId, scopeId: ScopeId, vem: PersonId | null) {
      return ändraScope(projektId, scopeId, SCOPE_TYP.taBort, vem, () => null);
    },

    // --- Historik: view, Visa, Återställning and Ångra (#35) ---

    /** The Historik panel: rows newest first, consecutive drags merged. */
    async historikVy(projektId: ProjektId): Promise<HistorikRad<PersonVy>[]> {
      await requireProjekt(projektId);
      const [logg, personer] = await Promise.all([storage.readHistorik(projektId), storage.listPersoner()]);
      return historikRader(logg, (id) => ägareVy(personer, id));
    },

    /** Visa: the chart (and status) right after an Uppdatering, and which Scopes differ from now. */
    async förhandsvisa(projektId: ProjektId, uppdateringId: UppdateringId): Promise<Förhandsvisning> {
      const { logg, index } = await historikMed(projektId, uppdateringId);
      const [personer, p] = await Promise.all([storage.listPersoner(), requireProjekt(projektId)]);
      const då = diagramEfter(logg, index);
      const nu = nuvarande(logg);
      const skiljer = [...new Set([...Object.keys(då), ...Object.keys(nu)])].filter(
        (id) => !lika(då[id] ?? null, nu[id] ?? null),
      );
      return { ...diagramVy(logg.slice(0, index + 1), personer, !!p.borttagen), skiljer };
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
      return skriv(projektId, HISTORIK_TYP.återställning, ä.ändringar, signerad.id, ä.projekt, mål);
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
        const skäl = resultat.krockar.map((k) => `${k.namn} ${k.varför}`).join(", ");
        throw new DomainError(
          "krock",
          `Går inte att ångra bara den här: ${skäl}. Använd Återställ hit på Uppdateringen före i stället, eller ändra för hand.`,
        );
      }
      return skriv(projektId, HISTORIK_TYP.ångra, resultat.ändringar, signerad.id, resultat.projekt, mål);
    },
  };
}
