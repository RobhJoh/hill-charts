// Avslutade Projekt in the overview and on the Funktionsområde page: Pågående
// stay as cells, Avslutade go to a compact list under them (Q4 c, Q11 a).

/** Pågående and Avslutade apart, each keeping the order it came in (alphabetical). */
export function delaProjekt<P extends { avslutat: boolean }>(
  projekt: readonly P[],
): { pågående: P[]; avslutade: P[] } {
  return { pågående: projekt.filter((p) => !p.avslutat), avslutade: projekt.filter((p) => p.avslutat) };
}

const dag = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" });

/** "Avslutat 12 nov.": the day a Projekt was Avslutat, in Stockholm time. Shared by the list and the Projekt page. */
export const avslutatDen = (tid: string): string => `Avslutat ${dag.format(new Date(tid))}`;

/** An Avslutade list row's date: "Avslutat 12 nov.", or just "Avslutat" when it is not known when. */
export const avslutatRad = (avslutad: string | null): string => (avslutad ? avslutatDen(avslutad) : "Avslutat");
