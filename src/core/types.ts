// Domain records as the core stores them. Terms follow GLOSSARY.md.

export type FunktionsområdeId = string;
export type ProjektId = string;
export type PersonId = string;
export type ScopeId = string;
export type UppdateringId = string;

export type MilstolpeId = string;

/** A calendar date, "YYYY-MM-DD". */
export type Datum = string;

/** A named date within a Projekt or Funktionsområde. */
export type Milstolpe = { id: MilstolpeId; namn: string; datum: Datum };

/** Optional Startdatum and Slutdatum (the Appetit) and Milstolpar in date order. */
export type Tidsplan = {
  startdatum: Datum | null;
  slutdatum: Datum | null;
  milstolpar: Milstolpe[];
};

/** Who took something away (Ta bort) and when. Absent while it is shown. */
export type Borttagen = {
  vem: PersonId;
  tid: string; // ISO timestamp
};

export type Funktionsområde = {
  id: FunktionsområdeId;
  namn: string;
  skapad: string; // ISO timestamp
  /** Its dates, saved without Historik. Missing = none (records from before #38). */
  tidsplan?: Tidsplan;
  borttagen?: Borttagen;
};

export type Projekt = {
  id: ProjektId;
  namn: string;
  funktionsområdeId: FunktionsområdeId;
  skapad: string; // ISO timestamp
  /**
   * Set while Borttagen. `medFunktionsområde`: it went with its
   * Funktionsområde and comes back with it; otherwise it was taken away on its own.
   */
  borttagen?: Borttagen & { medFunktionsområde: boolean };
};

/** Someone who can sign edits and own Scopes. Names are unique ignoring case. */
export type Person = {
  id: PersonId;
  namn: string;
  aktiv: boolean;
  skapad: string; // ISO timestamp
};

/** What happened to a Person, as recorded in the Personer-historik. */
export type PersonHändelseTyp = "ny" | "byt namn" | "ta bort" | "återaktivera";

/**
 * One change to Personer: who (Signatur), what, when, and the name before and
 * after. Kept apart from Projekt Historik; there is no Ångra for these.
 */
export type PersonHändelse = {
  id: string;
  typ: PersonHändelseTyp;
  /** The Person changed. */
  personId: PersonId;
  /** Signatur; null only for the first Person added to an empty list. */
  vem: PersonId | null;
  tid: string; // ISO timestamp
  /** Name before the change (null when the Person was just added). */
  förraNamn: string | null;
  /** Name after the change. */
  nyttNamn: string;
  /** On "ta bort": the Person who took over their Scopes. */
  nyÄgare?: PersonId;
};

export type ScopeValues = {
  namn: string;
  läge: number; // 0–100
  ägare: PersonId;
};

/** One Scope's values before and after an Uppdatering (null = does not exist). */
export type Ändring = { scopeId: ScopeId; före: ScopeValues | null; efter: ScopeValues | null };

/**
 * Projekt-level fields recorded in the Historik, as for Scopes: marked
 * Avslutat, the dates and the Milstolpar. Compare with `fältLika` (Milstolpar
 * is an array).
 */
export type ProjektFält = {
  /** Marked Avslutat (not the derived status; see status.ts). */
  avslutat: boolean;
} & Tidsplan;

/** One recorded edit to a Projekt's Hill chart or its dates (see spec #31). */
export type Uppdatering = {
  id: UppdateringId;
  typ: string;
  vem: PersonId | null; // Signatur; null only for legacy edits
  tid: string; // ISO timestamp
  mål?: UppdateringId; // target of an Återställning or Ångra
  ändringar: Ändring[];
  /** Changed Projekt-level fields: only those changed, before and after. */
  projekt?: { före: Partial<ProjektFält>; efter: Partial<ProjektFält> };
};
