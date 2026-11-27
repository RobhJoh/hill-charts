import { describe, expect, it } from "vitest";
import { frånOklch, kontrast, tillOklch } from "./farg.js";

describe("WCAG contrast", () => {
  it("matches known ratios", () => {
    expect(kontrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(kontrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(kontrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(kontrast("#ffffff", "#767676")).toBeCloseTo(4.54, 2);
  });
});

describe("OKLCH", () => {
  it("reads known colours", () => {
    const [l, c] = tillOklch("#ffffff");
    expect(l).toBeCloseTo(1, 3);
    expect(c).toBeCloseTo(0, 3);
    const [rl, rc, rh] = tillOklch("#ff0000");
    expect(rl).toBeCloseTo(0.628, 3);
    expect(rc).toBeCloseTo(0.2577, 3);
    expect(rh).toBeCloseTo(29.23, 1);
  });

  it("round-trips a hex colour", () => {
    for (const hex of ["#b8860b", "#6f86c8", "#ffe7a8", "#2f5fc4", "#000000"]) {
      expect(frånOklch(tillOklch(hex))).toBe(hex);
    }
  });
});
