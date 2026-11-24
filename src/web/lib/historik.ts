// Plain-Swedish text for Historik rows (what happened), used by HistorikPanel.
import type { HistorikRad, PersonVy, Ändring } from "../../core/index.js";

/** Shown for legacy edits without a Signatur. */
export const UTAN_NAMN = "Någon utan namn";

type Namn = (personId: string) => string;

/** One change, e.g. "Prislista 38 → 64" or "tog bort Prislista". */
export function beskrivÄndring({ före, efter }: Ändring, namn: Namn): string {
  if (före === null && efter === null) return "";
  if (före === null) return `lade till ${efter!.namn}`;
  if (efter === null) return `tog bort ${före.namn}`;
  const delar: string[] = [];
  if (före.namn !== efter.namn) delar.push(`döpte om ${före.namn} till ${efter.namn}`);
  if (före.läge !== efter.läge) delar.push(`flyttade ${efter.namn} ${före.läge} → ${efter.läge}`);
  if (före.ägare !== efter.ägare) delar.push(`gav ${efter.namn} till ${namn(efter.ägare)}`);
  return delar.join(", ");
}

/** The row's title after who did it, e.g. "flyttade Prislista 38 → 64". */
export function beskrivRad(rad: HistorikRad<PersonVy>, namn: Namn): string {
  if (rad.typ === "återställning") return "återställde diagrammet";
  if (rad.typ === "ångra") return "ångrade en Uppdatering";
  if (rad.ändringar.length === 1) return beskrivÄndring(rad.ändringar[0]!, namn);
  return `${rad.ändringar.length} ändringar`;
}

const tidFormat = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const visaTid = (iso: string) => tidFormat.format(new Date(iso));
