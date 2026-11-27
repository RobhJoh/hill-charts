import { describe, expect, it } from "vitest";
import { antal, böj } from "./ord.js";

describe("antal", () => {
  it("uses the singular form for exactly one", () => {
    expect(antal(1, "inaktiv", "inaktiva")).toBe("1 inaktiv");
    expect(antal(1, "avslutat Projekt", "avslutade Projekt")).toBe("1 avslutat Projekt");
  });

  it("uses the plural form for zero and for more than one", () => {
    expect(antal(2, "inaktiv", "inaktiva")).toBe("2 inaktiva");
    expect(antal(0, "inaktiv", "inaktiva")).toBe("0 inaktiva");
    expect(antal(7, "avslutat Projekt", "avslutade Projekt")).toBe("7 avslutade Projekt");
  });
});

describe("böj", () => {
  it("gives the word alone, for a count shown apart from it", () => {
    expect(böj(1, "avslutat Projekt", "avslutade Projekt")).toBe("avslutat Projekt");
    expect(böj(3, "avslutat Projekt", "avslutade Projekt")).toBe("avslutade Projekt");
  });
});
