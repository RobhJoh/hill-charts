// Plain-Swedish text for Historik rows (what happened), used by HistorikPanel.
import type { HistorikRad, Milstolpe, PersonVy, Ändring } from "../../core/index.js";
import { visaDatum } from "./datum.js";

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
  for (const fält of ["startdatum", "slutdatum"] as const) {
    if (!(fält in projekt.efter)) continue;
    const före = projekt.före[fält] ?? null;
    const efter = projekt.efter[fält] ?? null;
    const namn = fält === "startdatum" ? "Startdatum" : "Slutdatum";
    if (efter === null) delar.push(`tog bort ${namn}`);
    else if (före === null) delar.push(`satte ${namn} ${visaDatum(efter)}`);
    else delar.push(`flyttade ${namn} ${visaDatum(före)} → ${visaDatum(efter)}`);
  }
  if (projekt.efter.milstolpar) delar.push(...beskrivMilstolpar(projekt.före.milstolpar ?? [], projekt.efter.milstolpar));
  return delar;
}

function beskrivMilstolpar(före: Milstolpe[], efter: Milstolpe[]): string[] {
  const delar: string[] = [];
  for (const m of efter) {
    const förr = före.find((x) => x.id === m.id);
    if (!förr) delar.push(`lade till Milstolpen ${m.namn} ${visaDatum(m.datum)}`);
    else {
      if (förr.namn !== m.namn) delar.push(`döpte om Milstolpen ${förr.namn} till ${m.namn}`);
      if (förr.datum !== m.datum) {
        delar.push(`flyttade Milstolpen ${m.namn} ${visaDatum(förr.datum)} → ${visaDatum(m.datum)}`);
      }
    }
  }
  for (const m of före) if (!efter.some((x) => x.id === m.id)) delar.push(`tog bort Milstolpen ${m.namn}`);
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
  const p = rad.projekt;
  if (p?.efter.startdatum && p.efter.slutdatum && rad.ändringar.length === 0) {
    const verb = p.före.startdatum && p.före.slutdatum ? "flyttade" : "satte";
    return `${verb} datumen till ${visaDatum(p.efter.startdatum)} – ${visaDatum(p.efter.slutdatum)}`;
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
