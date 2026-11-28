// Derived status of Projekt and Scopes: Inte påbörjat, Pågående, Avslutat
// and Stilla. Pure functions; "now" is always passed in so the rules are testable.
import type { ProjektFält, Uppdatering } from "./types.js";

/** Projekt-level fields before any Uppdatering. */
export const PROJEKT_START: ProjektFält = { milstolpar: [] };

/** Equality of two Projekt-level field values (deep, for Milstolpar). */
export const fältLika = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The current Projekt-level fields: the fold of the Historik's `projekt` changes. */
export function projektFält(logg: readonly Uppdatering[]): ProjektFält {
  let fält = { ...PROJEKT_START };
  for (const u of logg) if (u.projekt) fält = { ...fält, ...u.projekt.efter };
  return fält;
}

/** A Projekt's or Funktionsområde's status, derived and never set by hand. */
export type Status = "inte påbörjat" | "pågående" | "avslutat";

/**
 * A Projekt's status from its Scopes' Läge alone: Avslutat when it has Scopes
 * and all are at 100, Inte påbörjat when all are at 0 (or there are none),
 * otherwise Pågående.
 */
export function projektStatus(lägen: readonly number[]): Status {
  if (lägen.length > 0 && lägen.every((l) => l === 100)) return "avslutat";
  if (lägen.every((l) => l === 0)) return "inte påbörjat";
  return "pågående";
}

/**
 * A Funktionsområde's status from its Projekt that are not Borttagna:
 * Inte påbörjat when all are (or there are none), Avslutat when all are,
 * otherwise Pågående.
 */
export function funktionsområdeStatus(projekt: readonly Status[]): Status {
  if (projekt.every((s) => s === "inte påbörjat")) return "inte påbörjat";
  if (projekt.every((s) => s === "avslutat")) return "avslutat";
  return "pågående";
}

/**
 * When the Projekt last became Avslutat: the ISO time of the Uppdatering that
 * turned it Avslutat. Null while it is not Avslutat.
 */
export function avslutadTid(logg: readonly Uppdatering[]): string | null {
  const lägen = new Map<string, number>();
  let tid: string | null = null;
  let avslutat = false;
  for (const u of logg) {
    for (const ä of u.ändringar) {
      if (ä.efter === null) lägen.delete(ä.scopeId);
      else lägen.set(ä.scopeId, ä.efter.läge);
    }
    const nu = projektStatus([...lägen.values()]) === "avslutat";
    if (nu && !avslutat) tid = u.tid;
    avslutat = nu;
  }
  return avslutat ? tid : null;
}

/** A Scope is Stilla once strictly more than this many days (of 24 h) pass without a Läge change. */
export const STILLA_EFTER_DAGAR = 14;

const DYGN_MS = 86_400_000;

/** Whole days from `iso` to `nu` (never negative). */
export const dagarSedan = (iso: string, nu: Date): number =>
  Math.max(0, Math.floor((nu.getTime() - Date.parse(iso)) / DYGN_MS));

/**
 * Stilla: strictly more than 14 × 24 h since its Läge last changed (`flyttad`).
 * A Scope at Läge 100 is done, and Scopes of an Avslutat Projekt are not
 * expected to move, so neither is ever Stilla.
 */
export function ärStilla(flyttad: string, nu: Date, läge: number, projektAvslutat: boolean): boolean {
  const stilla = nu.getTime() - Date.parse(flyttad) > STILLA_EFTER_DAGAR * DYGN_MS;
  return stilla && läge < 100 && !projektAvslutat;
}
