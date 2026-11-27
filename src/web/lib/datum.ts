// Showing calendar dates ("YYYY-MM-DD") in Swedish, e.g. "2 nov. 2026".
import type { Tidsplan } from "../../core/index.js";

const format = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const visaDatum = (datum: string): string => format.format(new Date(`${datum}T00:00:00Z`));

/** The Tidsplan's date button: nothing to change until a date is set. */
export const datumKnapp = ({ startdatum, slutdatum }: Pick<Tidsplan, "startdatum" | "slutdatum">): string =>
  startdatum || slutdatum ? "Ändra datum" : "Sätt datum";
