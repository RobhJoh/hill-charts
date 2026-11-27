// The Historik panel's read model: rows grouped for the view, with the
// "bortåterställd" and "ångrad" tags. Pure; the core resolves Personer.
import { bortåterställda, gruppera } from "./diagram.js";
import { UPPDATERING_TYP } from "./typer.js";
import type { PersonId, Uppdatering, UppdateringId, Ändring } from "./types.js";

/** One row in the Historik panel: one Uppdatering, or a merged run of moves ("N drag"). */
export type HistorikRad<V> = {
  /** The row's newest Uppdatering: what Visa and Återställ hit target. */
  id: UppdateringId;
  /** Every Uppdatering in the row, oldest first. */
  ids: UppdateringId[];
  /** Number of Uppdateringar in the row; > 1 is shown as "N drag". */
  antal: number;
  typ: string;
  /** The Signatur; null = legacy edit, shown as "Någon utan namn". */
  vem: V | null;
  /** ISO time of the newest Uppdatering in the row. */
  tid: string;
  /** Target of an Återställning or Ångra. */
  mål?: UppdateringId;
  /** For a merged row: one change from the first före to the last efter. */
  ändringar: Ändring[];
  /** Changed Projekt-level fields (e.g. Avslutat), if any. */
  projekt?: Uppdatering["projekt"];
  /** Skipped by a later Återställning (for a merged row: its newest Uppdatering). */
  bortåterställd: boolean;
  /** Targeted by a later Ångra. */
  ångrad: boolean;
  /** "Ångra bara denna" is offered: never on a merged row. */
  kanÅngras: boolean;
};

/** The Historik rows, newest first. `vem` resolves a Signatur for display. */
export function historikRader<V>(logg: readonly Uppdatering[], vem: (id: PersonId) => V): HistorikRad<V>[] {
  const skippade = bortåterställda(logg);
  const ångrade = new Set(logg.filter((u) => u.typ === UPPDATERING_TYP.ångra).map((u) => u.mål));
  return gruppera(logg)
    .map(({ start, slut }): HistorikRad<V> => {
      const del = logg.slice(start, slut + 1);
      const första = del[0]!;
      const sista = del.at(-1)!;
      const antal = del.length;
      const ändringar =
        antal === 1
          ? sista.ändringar
          : [{ ...sista.ändringar[0]!, före: första.ändringar[0]!.före }];
      return {
        id: sista.id,
        ids: del.map((u) => u.id),
        antal,
        typ: sista.typ,
        vem: sista.vem === null ? null : vem(sista.vem),
        tid: sista.tid,
        ...(sista.mål ? { mål: sista.mål } : {}),
        ändringar,
        ...(sista.projekt ? { projekt: sista.projekt } : {}),
        bortåterställd: skippade.has(sista.id),
        ångrad: del.some((u) => ångrade.has(u.id)),
        kanÅngras: antal === 1,
      };
    })
    .reverse();
}
