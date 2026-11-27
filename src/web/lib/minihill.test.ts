import { describe, expect, it } from "vitest";
import { stapelnivåer } from "./minihill.js";

describe("stacking mini-chart dots that would overlap", () => {
  it("stacks Scopes on the same Läge so three dots show as three", () => {
    expect(stapelnivåer([0, 0, 0])).toEqual([0, 1, 2]);
  });

  it("stacks dots within 2 Läge of each other, and leaves dots further apart on the orbit", () => {
    expect(stapelnivåer([50, 52, 55, 30])).toEqual([0, 1, 0, 0]);
  });

  it("reuses the lowest free level, so a chain of near neighbours does not climb", () => {
    expect(stapelnivåer([0, 2, 4, 6])).toEqual([0, 1, 0, 1]);
  });
});
