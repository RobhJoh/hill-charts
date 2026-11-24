import { describe, expect, it } from "vitest";
import { beskrivProjekt } from "./historik.js";

describe("Historik row text for Projekt-level changes", () => {
  it("tells date changes in plain Swedish", () => {
    expect(
      beskrivProjekt({
        före: { startdatum: null, slutdatum: null },
        efter: { startdatum: "2026-11-02", slutdatum: "2026-12-14" },
      }),
    ).toEqual(["satte Startdatum 2 nov. 2026", "satte Slutdatum 14 dec. 2026"]);
    expect(
      beskrivProjekt({ före: { slutdatum: "2026-12-14" }, efter: { slutdatum: "2026-12-21" } }),
    ).toEqual(["flyttade Slutdatum 14 dec. 2026 → 21 dec. 2026"]);
    expect(beskrivProjekt({ före: { startdatum: "2026-11-02" }, efter: { startdatum: null } })).toEqual([
      "tog bort Startdatum",
    ]);
  });

  it("tells which Milstolpe was added, changed or removed", () => {
    const beta = { id: "m1", namn: "Beta", datum: "2026-12-01" };
    const test = { id: "m2", namn: "Acceptanstest", datum: "2026-11-28" };
    expect(beskrivProjekt({ före: { milstolpar: [beta] }, efter: { milstolpar: [test, beta] } })).toEqual([
      "lade till Milstolpen Acceptanstest 28 nov. 2026",
    ]);
    expect(
      beskrivProjekt({
        före: { milstolpar: [beta] },
        efter: { milstolpar: [{ ...beta, namn: "Betaversion", datum: "2026-12-03" }] },
      }),
    ).toEqual(["döpte om Milstolpen Beta till Betaversion", "flyttade Milstolpen Betaversion 1 dec. 2026 → 3 dec. 2026"]);
    expect(beskrivProjekt({ före: { milstolpar: [test, beta] }, efter: { milstolpar: [beta] } })).toEqual([
      "tog bort Milstolpen Acceptanstest",
    ]);
  });
});
