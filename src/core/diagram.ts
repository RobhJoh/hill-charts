// The Hill chart as the fold of a Projekt's Historik (lifted from the
// prototype/historik branch). Pure functions over Uppdateringar; no storage.
// Återställning, Ångra and the Historik view grouping build on these.
import { projektFält } from "./status.js";
import type { ProjektFält, ScopeId, ScopeValues, Uppdatering, UppdateringId, Ändring } from "./types.js";

/** What an Återställning or Ångra writes: Scope changes and, if any, Projekt-field changes. */
export type Ändringar = Pick<Uppdatering, "ändringar" | "projekt">;

/** The Projekt-field changes from `från` to `till`, only fields that differ; undefined if none. */
function projektSkillnad(från: ProjektFält, till: ProjektFält): Uppdatering["projekt"] {
  const fält = (Object.keys(till) as (keyof ProjektFält)[]).filter((k) => från[k] !== till[k]);
  if (fält.length === 0) return undefined;
  const del = (f: ProjektFält) => Object.fromEntries(fält.map((k) => [k, f[k]])) as Partial<ProjektFält>;
  return { före: del(från), efter: del(till) };
}

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

/**
 * Återställning: the changes that put the whole chart back to right after
 * Uppdatering number `index`: every Scope and Projekt field that differs.
 * Null when the chart already looks like that.
 */
export function återställHit(logg: readonly Uppdatering[], index: number): Ändringar | null {
  const från = nuvarande(logg);
  const till = diagramEfter(logg, index);
  const ändringar: Ändring[] = [];
  for (const scopeId of new Set([...Object.keys(från), ...Object.keys(till)])) {
    const före = från[scopeId] ?? null;
    const efter = till[scopeId] ?? null;
    if (!lika(före, efter)) ändringar.push({ scopeId, före, efter });
  }
  const projekt = projektSkillnad(projektFält(logg), projektFält(logg.slice(0, index + 1)));
  if (ändringar.length === 0 && !projekt) return null;
  return projekt ? { ändringar, projekt } : { ändringar };
}

/** Why a Scope (or, with scopeId null, the Projekt) blocks an Ångra; `namn` is its latest known name. */
export type Krock = { scopeId: ScopeId | null; namn: string; varför: string };

export type ÅngraResultat = ({ ok: true } & Ändringar) | { ok: false; krockar: Krock[] };

/**
 * Ångra bara denna: the changes that revert only the fields Uppdatering
 * number `index` changed. Blocked (krockar) if any of those fields has
 * changed since, or the Scope it added/removed is already gone/back.
 */
export function ångraEn(logg: readonly Uppdatering[], index: number): ÅngraResultat {
  const nu = nuvarande(logg);
  const ändringar: Ändring[] = [];
  const krockar: Krock[] = [];
  for (const ä of logg[index]!.ändringar) {
    const just = nu[ä.scopeId] ?? null;
    const namn = (just ?? ä.efter ?? ä.före)!.namn;
    const krock = (varför: string) => krockar.push({ scopeId: ä.scopeId, namn, varför });
    if (ä.före === null) {
      // It added the Scope: take it away.
      if (just === null) krock("är redan borttaget");
      else ändringar.push({ scopeId: ä.scopeId, före: just, efter: null });
    } else if (ä.efter === null) {
      // It removed the Scope: bring it back, same id.
      if (just !== null) krock("finns redan");
      else ändringar.push({ scopeId: ä.scopeId, före: null, efter: { ...ä.före } });
    } else {
      if (just === null) {
        krock("har tagits bort sedan dess");
        continue;
      }
      const { före, efter } = ä;
      const fält = SCOPE_FÄLT.filter((k) => före[k] !== efter[k]);
      const ändrade = fält.filter((k) => just[k] !== efter[k]);
      if (ändrade.length > 0) {
        krock(`har ändrats igen sedan dess (${ändrade.join(", ")})`);
        continue;
      }
      const tillbaka = { ...just };
      for (const k of fält) (tillbaka as Record<string, unknown>)[k] = före[k];
      ändringar.push({ scopeId: ä.scopeId, före: just, efter: tillbaka });
    }
  }
  // Projekt fields, field-wise like a Scope's.
  let projekt: Uppdatering["projekt"];
  const p = logg[index]!.projekt;
  if (p) {
    const nuFält = projektFält(logg);
    const fält = (Object.keys(p.efter) as (keyof ProjektFält)[]).filter((k) => p.före[k] !== p.efter[k]);
    const ändrade = fält.filter((k) => nuFält[k] !== p.efter[k]);
    if (ändrade.length > 0) {
      krockar.push({ scopeId: null, namn: "Projektet", varför: `har ändrats igen sedan dess (${ändrade.join(", ")})` });
    } else {
      projekt = projektSkillnad(nuFält, { ...nuFält, ...p.före });
    }
  }
  if (krockar.length > 0) return { ok: false, krockar };
  return projekt ? { ok: true, ändringar, projekt } : { ok: true, ändringar };
}

/** A run of Uppdateringar shown as one Historik row: indexes `start`..`slut` (inclusive). */
export type Grupp = { start: number; slut: number };

/** Uppdatering types written by Återställning and Ångra. */
export const HISTORIK_TYP = {
  återställning: "återställning",
  ångra: "ångra",
} as const;

/** The Uppdatering type of a move (SCOPE_TYP.flytt); only moves are merged in the Historik view. */
const FLYTT = "flytt";
/** How close in time consecutive moves must be to merge ("N drag"). */
export const DRAG_FÖNSTER_MS = 10 * 60_000;

/**
 * The Historik view grouping (view only; storage keeps every drop):
 * consecutive moves of the same Scope by the same Signatur, each within
 * `fönsterMs` of the previous one, become one Grupp. Oldest first.
 */
export function gruppera(logg: readonly Uppdatering[], fönsterMs = DRAG_FÖNSTER_MS): Grupp[] {
  const grupper: Grupp[] = [];
  const ärFlytt = (u: Uppdatering) => u.typ === FLYTT && u.ändringar.length === 1;
  logg.forEach((u, i) => {
    const g = grupper.at(-1);
    const förra = g && logg[g.slut]!;
    if (
      förra &&
      ärFlytt(u) &&
      ärFlytt(förra) &&
      förra.vem === u.vem &&
      förra.ändringar[0]!.scopeId === u.ändringar[0]!.scopeId &&
      Date.parse(u.tid) - Date.parse(förra.tid) <= fönsterMs
    ) {
      g.slut = i;
    } else grupper.push({ start: i, slut: i });
  });
  return grupper;
}

/** Uppdateringar skipped by a later Återställning: strictly between its target and itself. */
export function bortåterställda(logg: readonly Uppdatering[]): Set<UppdateringId> {
  const ids = new Set<UppdateringId>();
  logg.forEach((u, i) => {
    if (u.typ !== HISTORIK_TYP.återställning) return;
    const m = logg.findIndex((x) => x.id === u.mål);
    for (let k = m + 1; k < i; k++) ids.add(logg[k]!.id);
  });
  return ids;
}
