// Stilla (GLOSSARY.md): the one word and its explanation, used the same way on
// every page, and the overview's summary of what needs attention.
import { STILLA_EFTER_DAGAR, type Översikt, type ProjektRad } from "../../core/index.js";

/** The title and screen reader text of every stilla count. */
export const STILLA_FÖRKLARING = `Ingen rörelse på över ${STILLA_EFTER_DAGAR} dagar`;

/** One Scope's stillness, short: "stilla i 21 d". */
export const stillaI = (dagar: number): string => `stilla i ${dagar} d`;

export type SamladStatus = {
  /** Projekt that are not Avslutat (Inte påbörjat ones too). */
  pågående: number;
  /** Stilla Scopes across all Projekt that are not Avslutat. */
  stilla: number;
  /** Projekt not Avslutat that are Över tid. */
  överTid: number;
  /** The Projekt with stilla Scopes, in overview order. */
  stillaProjekt: ProjektRad[];
  /** The Projekt Över tid, in overview order. */
  överTidProjekt: ProjektRad[];
};

/** The overview's one-line status: "5 pågående · 3 stilla · 1 över tid". */
export function samladStatus(översikt: Översikt): SamladStatus {
  const pågående = översikt.flatMap((fo) => fo.projekt).filter((p) => !p.avslutat);
  const stillaProjekt = pågående.filter((p) => p.stilla > 0);
  const överTidProjekt = pågående.filter((p) => p.överTid);
  return {
    pågående: pågående.length,
    stilla: stillaProjekt.reduce((n, p) => n + p.stilla, 0),
    överTid: överTidProjekt.length,
    stillaProjekt,
    överTidProjekt,
  };
}
