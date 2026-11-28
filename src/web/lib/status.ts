// Status words (GLOSSARY.md): Inte påbörjat, Pågående, Avslutat. Derived
// from Läge in the core; an Avslutat Projekt also says since when.
import type { Status } from "../../core/index.js";
import { avslutatRad } from "./avslutade.js";

/** The word for a Projekt's or Funktionsområde's status. */
export const STATUS_ORD: Record<Status, string> = {
  "inte påbörjat": "Inte påbörjat",
  pågående: "Pågående",
  avslutat: "Avslutat",
};

/** The Projekt page's status line: "Inte påbörjat", "Pågående" or "Avslutat 12 nov.". */
export function statusText({ status, avslutad }: { status: Status; avslutad: string | null }): string {
  return status === "avslutat" ? avslutatRad(avslutad) : STATUS_ORD[status];
}
