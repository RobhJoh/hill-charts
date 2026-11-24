// Derived status of Projekt and Scopes: Avslutat, Pågående and stuck.
// Pure functions; "now" is always passed in so the rules are testable.
import type { ProjektFält, Uppdatering } from "./types.js";

/** Projekt-level fields before any Uppdatering. */
export const PROJEKT_START: ProjektFält = { avslutat: false };

/** The current Projekt-level fields: the fold of the Historik's `projekt` changes. */
export function projektFält(logg: readonly Uppdatering[]): ProjektFält {
  let fält = { ...PROJEKT_START };
  for (const u of logg) if (u.projekt) fält = { ...fält, ...u.projekt.efter };
  return fält;
}

/**
 * Avslutat: marked Avslutat, or every Scope at Läge 100 (or no Scopes at all).
 */
export function ärAvslutat(markerad: boolean, lägen: readonly number[]): boolean {
  return markerad || lägen.every((l) => l === 100);
}

/** Pågående: neither Avslutat nor Borttagen. */
export function ärPågående({ avslutat, borttagen }: { avslutat: boolean; borttagen: boolean }): boolean {
  return !avslutat && !borttagen;
}
