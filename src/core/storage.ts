import type { Funktionsområde, Person, PersonHändelse, Projekt, ProjektId, Uppdatering } from "./types.js";

/**
 * The domain-level storage interface (ADR 0001). The core reaches storage only
 * through this; it never assumes files. Every method returns copies: mutating
 * a returned value never changes what is stored.
 */
export interface Storage {
  /** All Funktionsområden, in no particular order. */
  listFunktionsområden(): Promise<Funktionsområde[]>;
  /** Replaces the whole set of Funktionsområden. */
  saveFunktionsområden(all: Funktionsområde[]): Promise<void>;

  /** All Personer, active and inaktiva, in no particular order. */
  listPersoner(): Promise<Person[]>;
  /** Replaces the whole set of Personer. */
  savePersoner(all: Person[]): Promise<void>;
  /** Appends one change to the Personer-historik. */
  appendPersonHändelse(händelse: PersonHändelse): Promise<void>;
  /** The Personer-historik, oldest first. */
  readPersonerHistorik(): Promise<PersonHändelse[]>;

  /** All Projekt, in no particular order. */
  listProjekt(): Promise<Projekt[]>;
  getProjekt(id: ProjektId): Promise<Projekt | undefined>;
  /** Creates or replaces one Projekt. */
  saveProjekt(projekt: Projekt): Promise<void>;

  /** Appends one Uppdatering to a Projekt's Historik. */
  appendUppdatering(projektId: ProjektId, uppdatering: Uppdatering): Promise<void>;
  /** A Projekt's Historik, oldest first; empty if it has none. */
  readHistorik(projektId: ProjektId): Promise<Uppdatering[]>;
}
