import { describe, expect, it } from "vitest";
import { PERSON_HÄNDELSE_TYP, type PersonHändelse } from "../../core/index.js";
import { beskrivPersonHändelse } from "./personhistorik.js";

const händelse = (h: Partial<PersonHändelse>): PersonHändelse => ({
  id: "h1",
  typ: PERSON_HÄNDELSE_TYP.ny,
  personId: "p2",
  vem: "p1",
  tid: "2026-11-26T10:00:00.000Z",
  förraNamn: null,
  nyttNamn: "Hana Kim",
  ...h,
});

describe("beskrivPersonHändelse", () => {
  it("names the added Person as the one affected, unmarked", () => {
    expect(beskrivPersonHändelse(händelse({}))).toEqual({ vad: "lade till", berörd: ["Hana Kim"], märkt: false });
  });

  it("marks a removal so it stands out among additions", () => {
    const h = händelse({ typ: PERSON_HÄNDELSE_TYP.taBort, förraNamn: "Hana Kim" });
    expect(beskrivPersonHändelse(h)).toEqual({ vad: "tog bort", berörd: ["Hana Kim"], märkt: true });
  });

  it("marks a rename and gives the name before and after", () => {
    const h = händelse({ typ: PERSON_HÄNDELSE_TYP.bytNamn, förraNamn: "Hana", nyttNamn: "Hana Kim" });
    expect(beskrivPersonHändelse(h)).toEqual({ vad: "bytte namn på", berörd: ["Hana", "Hana Kim"], märkt: true });
  });

  it("leaves a reactivation unmarked", () => {
    const h = händelse({ typ: PERSON_HÄNDELSE_TYP.återaktivera, förraNamn: "Hana Kim" });
    expect(beskrivPersonHändelse(h)).toEqual({ vad: "återaktiverade", berörd: ["Hana Kim"], märkt: false });
  });
});
