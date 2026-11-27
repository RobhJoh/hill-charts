import { describe, expect, it } from "vitest";
import { kartansProjekt } from "./stjarnkarta.js";

const p = (namn: string, avslutat = false) => ({ namn, avslutat });

describe("the Projekt on a Stjärnkarta (#67, Q12 a)", () => {
  it("never shows Avslutade Projekt", () => {
    const visade = kartansProjekt([p("Kassan"), p("Arkiv", true), p("Moms")]);
    expect(visade.map(({ p }) => p.namn)).toEqual(["Kassan", "Moms"]);
  });

  it("letters each Projekt in order when more than one is shown", () => {
    expect(kartansProjekt([p("Kassan"), p("Moms"), p("Skatt")]).map(({ glyf }) => glyf)).toEqual(["A", "B", "C"]);
  });

  it("gives no letter when only one Projekt is shown, even if Avslutade were left out", () => {
    expect(kartansProjekt([p("Kassan"), p("Arkiv", true)]).map(({ glyf }) => glyf)).toEqual([undefined]);
  });

  it("goes past Z with a number", () => {
    const många = Array.from({ length: 28 }, (_, i) => p(`P${i}`));
    expect(kartansProjekt(många).slice(25).map(({ glyf }) => glyf)).toEqual(["Z", "A1", "B1"]);
  });
});
