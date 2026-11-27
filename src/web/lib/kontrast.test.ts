import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kontrast, tokens } from "./kontrast.js";

describe("WCAG contrast ratio", () => {
  it("matches the known extremes and is symmetric", () => {
    expect(kontrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(kontrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(kontrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(kontrast("#ffffff", "#777777")).toBeCloseTo(4.48, 2);
  });

  it("reads three-digit hex", () => {
    expect(kontrast("#fff", "#000")).toBeCloseTo(21, 5);
  });
});

describe("app.css tokens (#48: accent and contrast)", () => {
  const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");

  it("parses the natt and dag token blocks", () => {
    expect(tokens(css, "natt")["--bg"]).toBe("#081026");
    expect(tokens(css, "dag")["--bg"]).toBe("#eef2f9");
    // dag inherits what it does not override
    expect(tokens(css, "dag")["--chart"]).toBe("#ffffff");
  });

  for (const tema of ["natt", "dag"] as const) {
    describe(tema, () => {
      const t = tokens(css, tema);

      it("primary button text on the accent reaches 4.5:1", () => {
        expect(kontrast(t["--red-on"]!, t["--red"]!)).toBeGreaterThanOrEqual(4.5);
      });

      it("accent text reaches 4.5:1 on background and panel", () => {
        expect(kontrast(t["--redtx"]!, t["--bg"]!)).toBeGreaterThanOrEqual(4.5);
        expect(kontrast(t["--redtx"]!, t["--panel"]!)).toBeGreaterThanOrEqual(4.5);
      });

      it("button and field borders reach 3:1 on background and panel", () => {
        expect(kontrast(t["--btn"]!, t["--bg"]!)).toBeGreaterThanOrEqual(3);
        expect(kontrast(t["--btn"]!, t["--panel"]!)).toBeGreaterThanOrEqual(3);
      });

      it("the orbit reaches 3:1 on the chart ground", () => {
        expect(kontrast(t["--orbit"]!, t["--chart"]!)).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it("uses the DESIGN.md accent (Q13 a)", () => {
    expect(tokens(css, "natt")["--red"]).toBe("#f0602e");
    expect(tokens(css, "natt")["--red-on"]).toBe("#081026");
    expect(tokens(css, "dag")["--red"]).toBe("#c44a1c");
    expect(tokens(css, "dag")["--red-on"]).toBe("#ffffff");
  });
});
