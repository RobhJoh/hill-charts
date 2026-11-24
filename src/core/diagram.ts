// The Hill chart as the fold of a Projekt's Historik (lifted from the
// prototype/historik branch). Pure functions over Uppdateringar; no storage.
// Återställning, Ångra and the Historik view grouping build on these.
import type { ScopeId, ScopeValues, Uppdatering } from "./types.js";

/** A Hill chart: the current values of every Scope that exists. */
export type Diagram = Record<ScopeId, ScopeValues>;

/** The Scope fields, in a fixed order, for field-wise comparison. */
export const SCOPE_FÄLT = ["namn", "läge", "ägare"] as const satisfies readonly (keyof ScopeValues)[];

/** Field-wise equality of two Scope states (null = does not exist). */
export function lika(a: ScopeValues | null, b: ScopeValues | null): boolean {
  if (a === null || b === null) return a === b;
  return SCOPE_FÄLT.every((k) => a[k] === b[k]);
}

/** The chart after applying one Uppdatering to `diagram` (which is not changed). */
export function tillämpa(diagram: Diagram, upd: Uppdatering): Diagram {
  const ny = { ...diagram };
  for (const ä of upd.ändringar) {
    if (ä.efter === null) delete ny[ä.scopeId];
    else ny[ä.scopeId] = { ...ä.efter };
  }
  return ny;
}

/** The chart right after Uppdatering number `index` (-1 = before the first, empty). */
export function diagramEfter(logg: readonly Uppdatering[], index: number): Diagram {
  let d: Diagram = {};
  for (let i = 0; i <= index && i < logg.length; i++) d = tillämpa(d, logg[i]!);
  return d;
}

/** The current chart: the fold of the whole Historik. */
export const nuvarande = (logg: readonly Uppdatering[]): Diagram => diagramEfter(logg, logg.length - 1);

/**
 * When each Scope's Läge last changed (or it was first added): the ISO time
 * of that Uppdatering. A Scope that is removed and comes back keeps its time.
 * Drives star size and "stuck". May hold removed Scopes; look up by id.
 */
export function senastFlyttad(logg: readonly Uppdatering[]): Record<ScopeId, string> {
  const tid: Record<ScopeId, string> = {};
  const läge: Record<ScopeId, number> = {};
  for (const u of logg) {
    for (const ä of u.ändringar) {
      if (ä.efter === null) continue;
      if (läge[ä.scopeId] !== ä.efter.läge) tid[ä.scopeId] = u.tid;
      läge[ä.scopeId] = ä.efter.läge;
    }
  }
  return tid;
}
