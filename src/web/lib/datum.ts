// Showing calendar dates ("YYYY-MM-DD") in Swedish, e.g. "2 nov. 2026".
import type { Nedräkning } from "../../core/index.js";

const format = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const visaDatum = (datum: string): string => format.format(new Date(`${datum}T00:00:00Z`));

/**
 * The last ~15% of a running Appetit: the countdown bar's fill turns to the
 * accent there, so time pressure shows before the Projekt is Över tid.
 */
export const appetitNästanSlut = (nedräkning: Nedräkning | null): boolean =>
  nedräkning?.läge === "pågår" && nedräkning.andel !== null && nedräkning.andel >= 0.85;
