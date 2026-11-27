import { delaProjekt } from "./avslutade.js";

/**
 * The other Projekt in a Projekt's side menu (Q12 a): every Projekt in the
 * Funktionsområde except the one shown, Avslutade last, otherwise in the
 * Funktionsområde's order.
 */
export function grannar<P extends { id: string; avslutat: boolean }>(projekt: readonly P[], visat: string): P[] {
  const { pågående, avslutade } = delaProjekt(projekt.filter((p) => p.id !== visat));
  return [...pågående, ...avslutade];
}
