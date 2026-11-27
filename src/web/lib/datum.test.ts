import { describe, expect, it } from "vitest";
import { datumKnapp } from "./datum.js";

describe("the Tidsplan's date button", () => {
  it("says Sätt datum when there are no dates yet", () => {
    expect(datumKnapp({ startdatum: null, slutdatum: null })).toBe("Sätt datum");
  });

  it("says Ändra datum once a Startdatum or Slutdatum is set", () => {
    expect(datumKnapp({ startdatum: null, slutdatum: "2026-12-01" })).toBe("Ändra datum");
    expect(datumKnapp({ startdatum: "2026-11-02", slutdatum: "2026-12-01" })).toBe("Ändra datum");
  });
});
