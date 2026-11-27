import { describe, expect, it } from "vitest";
import { menyFokus, taBortSpärr } from "./mer.js";

describe("taBortSpärr: why a Funktionsområde can't be taken away yet", () => {
  it("allows Ta bort when no Projekt is Pågående (Inte påbörjat or Avslutat)", () => {
    expect(taBortSpärr([{ status: "avslutat" }, { status: "inte påbörjat" }])).toBeNull();
  });

  it("allows Ta bort with no Projekt at all", () => {
    expect(taBortSpärr([])).toBeNull();
  });

  it("explains the block and counts the Pågående Projekt", () => {
    expect(taBortSpärr([{ status: "pågående" }, { status: "avslutat" }, { status: "pågående" }])).toBe(
      "Kan tas bort när inget Projekt är Pågående (2 pågår)",
    );
  });

  it("says the same for a single Pågående Projekt", () => {
    expect(taBortSpärr([{ status: "pågående" }])).toBe("Kan tas bort när inget Projekt är Pågående (1 pågår)");
  });
});

describe("menyFokus: arrow keys in the Mer menu", () => {
  it("moves down and wraps to the first item", () => {
    expect(menyFokus(0, 4, "ArrowDown")).toBe(1);
    expect(menyFokus(3, 4, "ArrowDown")).toBe(0);
  });

  it("moves up and wraps to the last item", () => {
    expect(menyFokus(2, 4, "ArrowUp")).toBe(1);
    expect(menyFokus(0, 4, "ArrowUp")).toBe(3);
  });

  it("jumps to the ends with Home and End", () => {
    expect(menyFokus(2, 4, "Home")).toBe(0);
    expect(menyFokus(1, 4, "End")).toBe(3);
  });

  it("starts from the top when nothing has focus yet", () => {
    expect(menyFokus(-1, 4, "ArrowDown")).toBe(0);
    expect(menyFokus(-1, 4, "ArrowUp")).toBe(3);
  });

  it("ignores other keys", () => {
    expect(menyFokus(2, 4, "a")).toBeNull();
  });
});
