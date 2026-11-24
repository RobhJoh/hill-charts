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

/** A Scope is stuck after more than this many whole days without a Läge change. */
export const STILLA_EFTER_DAGAR = 14;

/** Whole days from `iso` to `nu` (never negative). */
export const dagarSedan = (iso: string, nu: Date): number =>
  Math.max(0, Math.floor((nu.getTime() - Date.parse(iso)) / 86_400_000));

/**
 * Stuck: no Läge change for more than 14 whole days. A Scope at Läge 100 is
 * done, and Scopes of an Avslutat Projekt are not expected to move, so
 * neither is ever stuck.
 */
export function ärStilla(dagar: number, läge: number, projektAvslutat: boolean): boolean {
  return dagar > STILLA_EFTER_DAGAR && läge < 100 && !projektAvslutat;
}

/** Pågående: neither Avslutat nor Borttagen. */
export function ärPågående({ avslutat, borttagen }: { avslutat: boolean; borttagen: boolean }): boolean {
  return !avslutat && !borttagen;
}
