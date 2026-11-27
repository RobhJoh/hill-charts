// The read models the core returns, and the pure functions that build them
// from stored records and a Projekt's Historik.
import { nuvarande, senastFlyttad } from "../diagram.js";
import { nedräkning, nästaMilstolpe, ärÖverTid, type Nedräkning, type NästaMilstolpe } from "../datum.js";
import { dagarSedan, projektFält, ärAvslutat, ärPågående, ärStilla } from "../status.js";
import type {
  Borttagen,
  Datum,
  FunktionsområdeId,
  MilstolpeId,
  Person,
  PersonId,
  Projekt,
  ProjektFält,
  ProjektId,
  ScopeId,
  Tidsplan,
  Uppdatering,
} from "../types.js";

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
  /** When it became Avslutat (ISO time); null while Pågående or if never edited. */
  avslutad: string | null;
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
export type Förhandsvisning = DiagramVy &
  TidVy & {
    /** Scopes that differ from now (incl. added/removed since). */
    skiljer: ScopeId[];
    /** Projekt-level fields (Avslutat mark, dates, Milstolpar) that differ from now. */
    fältSkiljer: (keyof ProjektFält)[];
    /** Milstolpar added, removed, renamed or moved since. */
    milstolparSkiljer: MilstolpeId[];
    /** Chart, Avslutat mark, dates and Milstolpar all as now: Återställ hit would change nothing. */
    sammaSomNu: boolean;
  };

export type PersonVy = { id: PersonId; namn: string; aktiv: boolean };

/** A Projekt in a Stjärnkarta's key: its countdown and that Person's Scopes in it. */
export type StjärnkartaProjekt = {
  id: ProjektId;
  namn: string;
  avslutat: boolean;
  nedräkning: Nedräkning | null;
  nästaMilstolpe: NästaMilstolpe | null;
  överTid: boolean;
  /** The Person's Scopes, highest Läge first. */
  scopes: ScopeVy[];
};

/** A Person's load, counted over Pågående Projekt only (except `avslutade`). */
export type PersonRäkning = {
  /** Scopes they own in Pågående Projekt. */
  scopes: number;
  /** Pågående Projekt in which they own a Scope. */
  projekt: number;
  /** Their stuck Scopes (more than 14 days without movement). */
  stilla: number;
  /** Avslutade Projekt in which they own a Scope. */
  avslutade: number;
};

/** Everything one Person owns, in one sky. Borttagna Projekt are never included. */
export type StjärnkartaVy = {
  person: PersonVy;
  /** Pågående Projekt first, then Avslutade; each in name order. */
  projekt: StjärnkartaProjekt[];
  räkning: PersonRäkning;
};

/** A Person in the Personer index: load and a strip of Läge dots. */
export type PersonRad = PersonVy & {
  räkning: PersonRäkning;
  /** Their Scopes in Pågående Projekt, highest Läge first. */
  lägen: { läge: number; stilla: boolean }[];
};

export const svenskOrdning = new Intl.Collator("sv");
export const efterNamn = (a: { namn: string }, b: { namn: string }) => svenskOrdning.compare(a.namn, b.namn);

export const personVy = ({ id, namn, aktiv }: Person): PersonVy => ({ id, namn, aktiv });

/** The Person with that id as shown; one no longer known is "Okänd". */
export const ägareVy = (personer: Person[], id: PersonId): PersonVy => {
  const p = personer.find((x) => x.id === id);
  return p ? personVy(p) : { id, namn: "Okänd", aktiv: false };
};

export const borttagenVy = (personer: Person[], b: Borttagen): BorttagenVy => ({
  vem: ägareVy(personer, b.vem),
  tid: b.tid,
});

/** Taken away on its own, not with its Funktionsområde. */
export const borttagenEnsam = (p: Projekt): boolean => !!p.borttagen && !p.borttagen.medFunktionsområde;

export function tidVy(tidsplan: Tidsplan, avslutat: boolean, idag: Datum): TidVy {
  return {
    tidsplan,
    nedräkning: nedräkning(tidsplan, avslutat, idag),
    nästaMilstolpe: avslutat ? null : nästaMilstolpe(tidsplan.milstolpar, idag),
    överTid: ärÖverTid(tidsplan.slutdatum, avslutat, idag),
  };
}

/** A Projekt's dates, Milstolpar and countdown from its Historik. */
export function projektTidVy(logg: Uppdatering[], avslutat: boolean, idag: Datum): TidVy {
  const { startdatum, slutdatum, milstolpar } = projektFält(logg);
  return tidVy({ startdatum, slutdatum, milstolpar }, avslutat, idag);
}

/** A Projekt's Hill chart and status from its Historik, against `nu`. */
export function diagramVy(logg: Uppdatering[], personer: Person[], borttagen: boolean, nu: Date): DiagramVy {
  const flyttad = senastFlyttad(logg);
  const diagram = Object.entries(nuvarande(logg));
  const markeradAvslutat = projektFält(logg).avslutat;
  const avslutat = ärAvslutat(markeradAvslutat, diagram.map(([, s]) => s.läge));
  const scopes = diagram
    .map(([scopeId, s]): ScopeVy => ({
      id: scopeId,
      namn: s.namn,
      läge: s.läge,
      ägare: ägareVy(personer, s.ägare),
      flyttad: flyttad[scopeId]!,
      stillaDagar: dagarSedan(flyttad[scopeId]!, nu),
      stilla: ärStilla(flyttad[scopeId]!, nu, s.läge, avslutat),
    }))
    .sort((a, b) => b.läge - a.läge || efterNamn(a, b));
  return { scopes, avslutat, markeradAvslutat, pågående: ärPågående({ avslutat, borttagen }) };
}
