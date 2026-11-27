import { describe, expect, it } from "vitest";
import { initialer } from "./initialer.js";

describe("initialer: the Signatur button on phone", () => {
  it("takes the first letter of the first and last name", () => {
    expect(initialer("Anna Lind")).toBe("AL");
  });

  it("uses one letter for a single-word name", () => {
    expect(initialer("Anna")).toBe("A");
  });

  it("skips middle names and stray spaces, and upper-cases Swedish letters", () => {
    expect(initialer("  åsa maria   öberg ")).toBe("ÅÖ");
  });
});
