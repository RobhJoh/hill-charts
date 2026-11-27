import { describe, expect, it } from "vitest";
import { avslutatText } from "./avslutat.js";

const bo = { id: "p1", namn: "Bo Ek", aktiv: true };

describe("avslutatText: the Projekt page's status line", () => {
  it("a Pågående Projekt says so", () => {
    expect(avslutatText({ avslutat: false, avslutadAv: null })).toBe("Pågående");
  });

  it("a marked Projekt ends quietly with when and by whom", () => {
    expect(avslutatText({ avslutat: true, avslutadAv: { tid: "2026-11-12T12:00:00Z", vem: bo } })).toBe(
      "Avslutat 12 nov. av Bo Ek",
    );
  });

  it("an inaktiv marker is shown as such, a legacy unsigned one without a name", () => {
    expect(
      avslutatText({ avslutat: true, avslutadAv: { tid: "2026-11-12T12:00:00Z", vem: { ...bo, aktiv: false } } }),
    ).toBe("Avslutat 12 nov. av Bo Ek (inaktiv)");
    expect(avslutatText({ avslutat: true, avslutadAv: { tid: "2026-11-12T12:00:00Z", vem: null } })).toBe(
      "Avslutat 12 nov.",
    );
  });

  it("a Projekt Avslutat through Läge says why", () => {
    expect(avslutatText({ avslutat: true, avslutadAv: null })).toBe("Avslutat · alla Scopes på Läge 100");
  });
});
