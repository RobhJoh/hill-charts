import { describe, expect, it } from "vitest";
import type { HistorikRad, PersonVy } from "../../core/index.js";
import { beskrivProjekt, beskrivRad, skillnaderMotNu } from "./historik.js";

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

  it("titles a row changing both dates as one change", () => {
    const rad = {
      id: "u1",
      typ: "datum",
      vem: null,
      tid: "2026-11-24T10:00:00Z",
      ändringar: [],
      projekt: {
        före: { startdatum: "2026-11-02", slutdatum: "2026-12-28" },
        efter: { startdatum: "2026-11-09", slutdatum: "2027-01-04" },
      },
    } as unknown as HistorikRad<PersonVy>;
    expect(beskrivRad(rad, () => "")).toBe("flyttade datumen till 9 nov. 2026 – 4 jan. 2027");
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

describe("Visa banner: what differs from now", () => {
  const vy = { skiljer: [], fältSkiljer: [], milstolparSkiljer: [], sammaSomNu: false, markeradAvslutat: false };

  it("inflects Scopes by number, like Milstolpar", () => {
    expect(skillnaderMotNu({ ...vy, skiljer: ["s1"] })).toEqual(["1 Scope skiljer sig från nu (streckad ring)."]);
    expect(skillnaderMotNu({ ...vy, skiljer: ["s1", "s2", "s3"] })).toEqual([
      "3 Scopes skiljer sig från nu (streckad ring).",
    ]);
    expect(skillnaderMotNu({ ...vy, milstolparSkiljer: ["m1"] })).toEqual(["1 Milstolpe skiljer sig från nu."]);
    expect(skillnaderMotNu({ ...vy, milstolparSkiljer: ["m1", "m2"] })).toEqual(["2 Milstolpar skiljer sig från nu."]);
  });

  it("says when the view is the same as now, and when the Avslutat mark or dates differ", () => {
    expect(skillnaderMotNu({ ...vy, sammaSomNu: true })).toEqual(["Samma som nu."]);
    expect(
      skillnaderMotNu({ ...vy, fältSkiljer: ["avslutat", "slutdatum"], markeradAvslutat: true, skiljer: ["s1", "s2"] }),
    ).toEqual([
      "2 Scopes skiljer sig från nu (streckad ring).",
      "Projektet var markerat Avslutat då.",
      "Datumen skiljer sig från nu.",
    ]);
  });
});
