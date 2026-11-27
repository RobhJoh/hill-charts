import { describe, expect, it } from "vitest";
import { föreslagenÄgare } from "./agare.js";

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
