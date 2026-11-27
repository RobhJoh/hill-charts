import { describe, expect, it } from "vitest";
import { avslutatStatus } from "./avslutat.js";

const bo = { id: "p1", namn: "Bo Ek", aktiv: true };

describe("avslutatStatus: the Projekt page's status line", () => {
  it("a Pågående Projekt says so", () => {
    expect(avslutatStatus({ avslutat: false, avslutadAv: null })).toBe("Pågående");
  });

  it("a marked Projekt ends quietly with when and by whom", () => {
    expect(avslutatStatus({ avslutat: true, avslutadAv: { tid: "2026-11-12T12:00:00Z", vem: bo } })).toBe(
      "Avslutat 12 nov. av Bo Ek",
    );
  });

  it("an inaktiv marker is shown as such, a legacy unsigned one without a name", () => {
    expect(
      avslutatStatus({ avslutat: true, avslutadAv: { tid: "2026-11-12T12:00:00Z", vem: { ...bo, aktiv: false } } }),
    ).toBe("Avslutat 12 nov. av Bo Ek (inaktiv)");
    expect(avslutatStatus({ avslutat: true, avslutadAv: { tid: "2026-11-12T12:00:00Z", vem: null } })).toBe(
      "Avslutat 12 nov.",
    );
  });

  it("names the day in Stockholm time, like the overview's Avslutade list", () => {
    expect(avslutatStatus({ avslutat: true, avslutadAv: { tid: "2026-11-02T23:30:00.000Z", vem: bo } })).toBe(
      "Avslutat 3 nov. av Bo Ek",
    );
  });

  it("a Projekt Avslutat through Läge says why", () => {
    expect(avslutatStatus({ avslutat: true, avslutadAv: null })).toBe("Avslutat · alla Scopes på Läge 100");
  });
});
