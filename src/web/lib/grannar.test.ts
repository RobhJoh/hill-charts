import { describe, expect, it } from "vitest";
import { grannar } from "./grannar.js";

const p = (id: string, avslutat = false) => ({ id, avslutat });

describe("the other Projekt in the side menu (#57, Q12 a)", () => {
  it("leaves out the Projekt being shown", () => {
    expect(grannar([p("a"), p("b"), p("c")], "b").map((g) => g.id)).toEqual(["a", "c"]);
  });

  it("lists Avslutade last, otherwise in the Funktionsområde's order", () => {
    const lista = [p("a", true), p("b"), p("c", true), p("d"), p("e")];
    expect(grannar(lista, "e").map((g) => g.id)).toEqual(["b", "d", "a", "c"]);
  });
});
