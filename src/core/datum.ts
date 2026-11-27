// Dates, Appetit, Milstolpar and the countdown. Pure functions over calendar
// dates ("YYYY-MM-DD"); "today" is always passed in so the rules are testable.
import { DomainError } from "./errors.js";
import type { Datum, Milstolpe, MilstolpeId, Tidsplan } from "./types.js";

/** No dates and no Milstolpar. */
export const TOM_TIDSPLAN: Tidsplan = { startdatum: null, slutdatum: null, milstolpar: [] };

const DAG_MS = 86_400_000;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar dates are counted in Swedish time, whatever the server's zone. */
const STOCKHOLM = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in Stockholm. */
export const idagFrån = (nu: Date): Datum => STOCKHOLM.format(nu);

const dagnummer = (d: Datum): number => Date.parse(`${d}T00:00:00Z`) / DAG_MS;

/** Calendar days from `från` to `till` (negative when `till` is earlier). */
export const dagarMellan = (från: Datum, till: Datum): number => Math.round(dagnummer(till) - dagnummer(från));

/** The date `dagar` calendar days after `d`. */
export const plusDagar = (d: Datum, dagar: number): Datum =>
  new Date((dagnummer(d) + dagar) * DAG_MS).toISOString().slice(0, 10);

/** A real calendar date "YYYY-MM-DD"; anything else is `ogiltig`. */
export function datumFrån(input: unknown): Datum {
  const d = String(input ?? "");
  if (!DATUM.test(d) || plusDagar(d, 0) !== d) throw new DomainError("ogiltig", `${d || "Datumet"} är inget datum`);
  return d;
}

/**
 * How dates are entered: two dates (either may be null to clear it), a
 * Startdatum plus a number of weeks, or a new Startdatum that keeps the Appetit
 * (the Slutdatum moves with it).
 */
export type DatumInput =
  | { startdatum: Datum | null; slutdatum: Datum | null }
  | { startdatum: Datum; veckor: number }
  | { startdatum: Datum; behållAppetit: true };

/** The Startdatum and Slutdatum after applying `input` to the current ones. */
export function nyaDatum(
  nu: Pick<Tidsplan, "startdatum" | "slutdatum">,
  input: DatumInput,
): Pick<Tidsplan, "startdatum" | "slutdatum"> {
  let startdatum: Datum | null;
  let slutdatum: Datum | null;
  if ("veckor" in input) {
    const veckor = input.veckor;
    if (typeof veckor !== "number" || !Number.isInteger(veckor) || veckor < 1) {
      throw new DomainError("ogiltig", "Antal veckor måste vara ett heltal från 1");
    }
    startdatum = datumFrån(input.startdatum);
    slutdatum = plusDagar(startdatum, veckor * 7);
  } else if ("behållAppetit" in input) {
    startdatum = datumFrån(input.startdatum);
    slutdatum =
      nu.startdatum && nu.slutdatum ? plusDagar(startdatum, dagarMellan(nu.startdatum, nu.slutdatum)) : nu.slutdatum;
  } else {
    startdatum = input.startdatum === null ? null : datumFrån(input.startdatum);
    slutdatum = input.slutdatum === null ? null : datumFrån(input.slutdatum);
  }
  if (startdatum && !slutdatum) throw new DomainError("ogiltig", "Ange ett Slutdatum eller antal veckor");
  if (startdatum && slutdatum && slutdatum < startdatum) {
    throw new DomainError("ogiltig", "Slutdatum kan inte vara före Startdatum");
  }
  return { startdatum, slutdatum };
}

/** Milstolpar in date order (then name). */
export const iOrdning = (milstolpar: readonly Milstolpe[]): Milstolpe[] =>
  [...milstolpar].sort((a, b) => a.datum.localeCompare(b.datum) || a.namn.localeCompare(b.namn, "sv"));

/** A Milstolpe's values changed; unknown id is `finns-inte`. */
export function ändraMilstolpe(
  milstolpar: readonly Milstolpe[],
  id: MilstolpeId,
  ändring: (m: Milstolpe) => Milstolpe | null,
): Milstolpe[] {
  const finns = milstolpar.find((m) => m.id === id);
  if (!finns) throw new DomainError("finns-inte", `Milstolpen ${id} finns inte`);
  return iOrdning(milstolpar.flatMap((m) => (m.id === id ? (ändring(m) ?? []) : [m])));
}

/** Över tid: the Slutdatum has passed and the work is not Avslutat. */
export const ärÖverTid = (slutdatum: Datum | null, avslutat: boolean, idag: Datum): boolean =>
  slutdatum !== null && idag > slutdatum && !avslutat;

const dagar = (n: number) => (n === 1 ? "1 dag" : `${n} dagar`);

/** The countdown shown above a Hill chart and on each Projekt in lists. */
export type Nedräkning = {
  läge: "startar" | "pågår" | "över tid" | "avslutat";
  /**
   * E.g. "Startar om 5 dagar", "22 dagar kvar", "Över tid · 4 dagar", "Avslutat".
   * Always in days: the bar carries the share of the Appetit, and the Appetit itself
   * is shown with the dates.
   */
  text: string;
  /** Share of the Appetit used, 0–1; null when there is no bar (no Appetit, not started, or Avslutat). */
  andel: number | null;
};

/**
 * The countdown, in calendar days. Null when there is no Slutdatum (and it
 * is not Avslutat). The Slutdatum is the last day: the day after it is Över tid.
 */
export function nedräkning(
  { startdatum, slutdatum }: Pick<Tidsplan, "startdatum" | "slutdatum">,
  avslutat: boolean,
  idag: Datum,
): Nedräkning | null {
  if (avslutat) return { läge: "avslutat", text: "Avslutat", andel: null };
  if (!slutdatum) return null;
  if (startdatum && idag < startdatum) {
    return { läge: "startar", text: `Startar om ${dagar(dagarMellan(idag, startdatum))}`, andel: null };
  }
  const kvar = dagarMellan(idag, slutdatum);
  if (kvar < 0) return { läge: "över tid", text: `Över tid · ${dagar(-kvar)}`, andel: 1 };
  if (!startdatum) return { läge: "pågår", text: `${dagar(kvar)} kvar`, andel: null };
  const appetit = dagarMellan(startdatum, slutdatum);
  return {
    läge: "pågår",
    text: `${dagar(kvar)} kvar`,
    andel: appetit === 0 ? 1 : (appetit - kvar) / appetit,
  };
}

/** The next Milstolpe from today on, e.g. "Acceptanstest om 4 dagar". */
export type NästaMilstolpe = Milstolpe & { text: string };

export function nästaMilstolpe(milstolpar: readonly Milstolpe[], idag: Datum): NästaMilstolpe | null {
  const m = iOrdning(milstolpar).find((x) => x.datum >= idag);
  if (!m) return null;
  const n = dagarMellan(idag, m.datum);
  const när = n === 0 ? "i dag" : n === 1 ? "i morgon" : `om ${n} dagar`;
  return { ...m, text: `${m.namn} ${när}` };
}

/** Quiet warnings when a Projekt's dates fall outside its Funktionsområde's. Never blocks saving. */
export function datumVarningar(projekt: Tidsplan, fo: Tidsplan): string[] {
  const varningar: string[] = [];
  if (projekt.startdatum && fo.startdatum && projekt.startdatum < fo.startdatum) {
    varningar.push("börjar före Funktionsområdet");
  }
  if (projekt.slutdatum && fo.slutdatum && projekt.slutdatum > fo.slutdatum) {
    varningar.push("slutar efter Funktionsområdet");
  }
  return varningar;
}
