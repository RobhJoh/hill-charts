// Domain records as the core stores them. Terms follow GLOSSARY.md.

export type FunktionsområdeId = string;
export type ProjektId = string;
export type PersonId = string;
export type ScopeId = string;
export type UppdateringId = string;

/** Who took something away (Ta bort) and when. Absent while it is shown. */
export type Borttagen = {
  vem: PersonId;
  tid: string; // ISO timestamp
};

export type Funktionsområde = {
  id: FunktionsområdeId;
  namn: string;
  skapad: string; // ISO timestamp
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

export type ScopeValues = {
  namn: string;
  läge: number; // 0–100
  ägare: PersonId;
};

/** One Scope's values before and after an Uppdatering (null = does not exist). */
export type Ändring = { scopeId: ScopeId; före: ScopeValues | null; efter: ScopeValues | null };

/**
 * Projekt-level fields recorded in the Historik, as for Scopes. Only
 * marked-Avslutat so far; dates and Milstolpar join later.
 */
export type ProjektFält = {
  /** Marked Avslutat (not the derived status; see status.ts). */
  avslutat: boolean;
};

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
