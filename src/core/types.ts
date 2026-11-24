// Domain records as the core stores them. Terms follow GLOSSARY.md.

export type FunktionsområdeId = string;
export type ProjektId = string;
export type PersonId = string;
export type ScopeId = string;
export type UppdateringId = string;

export type Funktionsområde = {
  id: FunktionsområdeId;
  namn: string;
  skapad: string; // ISO timestamp
};

export type Projekt = {
  id: ProjektId;
  namn: string;
  funktionsområdeId: FunktionsområdeId;
  skapad: string; // ISO timestamp
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

/** One recorded edit to a Projekt's Hill chart or its dates (see spec #31). */
export type Uppdatering = {
  id: UppdateringId;
  typ: string;
  vem: PersonId | null; // Signatur; null only for legacy edits
  tid: string; // ISO timestamp
  mål?: UppdateringId; // target of an Återställning or Ångra
  ändringar: Ändring[];
};
