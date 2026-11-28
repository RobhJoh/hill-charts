import { describe, expect, it } from "vitest";
import { föreslagenÄgare, personNamn } from "./agare.js";

const anna = { id: "a", namn: "Anna", aktiv: true };
const bo = { id: "b", namn: "Bo", aktiv: false };

describe("föreslagenÄgare: the Ägare the Ny Scope form pre-selects", () => {
  it("suggests the Projektledare", () => {
    expect(föreslagenÄgare({ projektledare: anna })).toBe("a");
  });

  it("suggests no one when the Projekt has no Projektledare", () => {
    expect(föreslagenÄgare({ projektledare: null })).toBe("");
  });

  it("suggests no one when the Projektledare is inaktiv, since they cannot own Scopes", () => {
    expect(föreslagenÄgare({ projektledare: bo })).toBe("");
  });
});

describe("personNamn: a Person's name where they are shown as Projektledare, Funktionsansvarig or Ägare", () => {
  it("is just the name for an aktiv Person", () => {
    expect(personNamn(anna)).toBe("Anna");
  });

  it("says (inaktiv) after an inaktiv Person's name", () => {
    expect(personNamn(bo)).toBe("Bo (inaktiv)");
  });
});
