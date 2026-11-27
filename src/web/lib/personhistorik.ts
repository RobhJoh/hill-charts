// Plain-Swedish text for Personer-historik rows. Only the affected Person is
// bold; removals and renames are marked so they stand out among additions
// (the historik is there to spot misuse, story 44).
import { PERSON_HÄNDELSE_TYP, type PersonHändelse } from "../../core/index.js";

export type PersonHändelseText = {
  /** The verb, e.g. "lade till". */
  vad: string;
  /** The affected Person's name; before and after on a rename. */
  berörd: string[];
  /** True for the unusual changes: "tog bort" and "bytte namn på". */
  märkt: boolean;
};

const VAD: Record<PersonHändelse["typ"], string> = {
  [PERSON_HÄNDELSE_TYP.ny]: "lade till",
  [PERSON_HÄNDELSE_TYP.bytNamn]: "bytte namn på",
  [PERSON_HÄNDELSE_TYP.taBort]: "tog bort",
  [PERSON_HÄNDELSE_TYP.återaktivera]: "återaktiverade",
};

export function beskrivPersonHändelse(h: PersonHändelse): PersonHändelseText {
  const bytNamn = h.typ === PERSON_HÄNDELSE_TYP.bytNamn;
  return {
    vad: VAD[h.typ],
    berörd: bytNamn ? [h.förraNamn ?? h.nyttNamn, h.nyttNamn] : [h.nyttNamn],
    märkt: bytNamn || h.typ === PERSON_HÄNDELSE_TYP.taBort,
  };
}
