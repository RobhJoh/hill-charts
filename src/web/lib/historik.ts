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

/** A Projekt-level change, e.g. "markerade Projektet Avslutat". */
export function beskrivProjekt(projekt: HistorikRad<PersonVy>["projekt"]): string[] {
  if (!projekt) return [];
  const delar: string[] = [];
  if (projekt.efter.avslutat === true) delar.push("markerade Projektet Avslutat");
  if (projekt.efter.avslutat === false) delar.push("öppnade Projektet igen");
  return delar;
}

/** Every change in a row, as text lines. */
export const beskrivAlla = (rad: HistorikRad<PersonVy>, namn: Namn): string[] => [
  ...beskrivProjekt(rad.projekt),
  ...rad.ändringar.map((ä) => beskrivÄndring(ä, namn)),
];

/** The row's title after who did it, e.g. "flyttade Prislista 38 → 64". */
export function beskrivRad(rad: HistorikRad<PersonVy>, namn: Namn): string {
  if (rad.typ === "återställning") return "återställde diagrammet";
  if (rad.typ === "ångra") return "ångrade en Uppdatering";
  if (rad.typ === "överlämning" && rad.ändringar[0]?.före && rad.ändringar[0].efter) {
    const { före, efter } = rad.ändringar[0];
    const n = rad.ändringar.length;
    return `lämnade över ${n === 1 ? före.namn : `${n} Scopes`} från ${namn(före.ägare)} till ${namn(efter.ägare)}`;
  }
  const alla = beskrivAlla(rad, namn);
  return alla.length === 1 ? alla[0]! : `${alla.length} ändringar`;
}

const tidFormat = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const visaTid = (iso: string) => tidFormat.format(new Date(iso));
