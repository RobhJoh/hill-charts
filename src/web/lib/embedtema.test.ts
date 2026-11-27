import { describe, expect, it } from "vitest";
import { embedTema } from "./embedtema.js";

describe("the Notion embed's theme", () => {
  it("follows the computer's theme (Q2 b)", () => {
    expect(embedTema("", true)).toBe("natt");
    expect(embedTema("", false)).toBe("dag");
  });

  it("lets ?tema in the link override it", () => {
    expect(embedTema("?tema=dag", true)).toBe("dag");
    expect(embedTema("?tema=natt", false)).toBe("natt");
    expect(embedTema("?tema=rosa", true)).toBe("natt");
  });
});
