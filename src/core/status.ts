// Derived status of Projekt and Scopes: Avslutat, Pågående and stuck.
// Pure functions; "now" is always passed in so the rules are testable.
import type { ProjektFält, Uppdatering } from "./types.js";

/** Projekt-level fields before any Uppdatering. */
export const PROJEKT_START: ProjektFält = { avslutat: false, startdatum: null, slutdatum: null, milstolpar: [] };

/** Equality of two Projekt-level field values (deep, for Milstolpar). */
export const fältLika = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

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

/**
 * When the Projekt last became Avslutat: the ISO time of the Uppdatering that
 * turned it Avslutat (by Läge or by marking). Null while Pågående, and for a
 * Projekt that is Avslutat without ever having had an Uppdatering.
 */
export function avslutadTid(logg: readonly Uppdatering[]): string | null {
  const lägen = new Map<string, number>();
  let markerad = false;
  let tid: string | null = null;
  let avslutat = ärAvslutat(markerad, []);
  for (const u of logg) {
    for (const ä of u.ändringar) {
      if (ä.efter === null) lägen.delete(ä.scopeId);
      else lägen.set(ä.scopeId, ä.efter.läge);
    }
    if (u.projekt?.efter.avslutat !== undefined) markerad = u.projekt.efter.avslutat;
    const nu = ärAvslutat(markerad, [...lägen.values()]);
    if (nu && !avslutat) tid = u.tid;
    avslutat = nu;
  }
  return avslutat ? tid : null;
}

/** A Scope is stuck once strictly more than this many days (of 24 h) pass without a Läge change. */
export const STILLA_EFTER_DAGAR = 14;

const DYGN_MS = 86_400_000;

/** Whole days from `iso` to `nu` (never negative). */
export const dagarSedan = (iso: string, nu: Date): number =>
  Math.max(0, Math.floor((nu.getTime() - Date.parse(iso)) / DYGN_MS));

/**
 * Stuck: strictly more than 14 × 24 h since its Läge last changed (`flyttad`).
 * A Scope at Läge 100 is done, and Scopes of an Avslutat Projekt are not
 * expected to move, so neither is ever stuck.
 */
export function ärStilla(flyttad: string, nu: Date, läge: number, projektAvslutat: boolean): boolean {
  const stilla = nu.getTime() - Date.parse(flyttad) > STILLA_EFTER_DAGAR * DYGN_MS;
  return stilla && läge < 100 && !projektAvslutat;
}

/** Pågående: neither Avslutat nor Borttagen. */
export function ärPågående({ avslutat, borttagen }: { avslutat: boolean; borttagen: boolean }): boolean {
  return !avslutat && !borttagen;
}
