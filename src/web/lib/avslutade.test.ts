import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { avslutatText, delaProjekt } from "./avslutade.js";
import { kontrast, tokens } from "./kontrast.js";

const rad = (namn: string, avslutat: boolean) => ({ namn, avslutat });

describe("Pågående cells first, Avslutade in a list under them (Q4 c, Q11 a)", () => {
  it("splits the Projekt and keeps the alphabetical order within each part", () => {
    const { pågående, avslutade } = delaProjekt([
      rad("Betalningar v2", false),
      rad("Gammal API-gateway", true),
      rad("Loggning och övervakning", false),
      rad("Onboarding-guide", true),
    ]);
    expect(pågående.map((p) => p.namn)).toEqual(["Betalningar v2", "Loggning och övervakning"]);
    expect(avslutade.map((p) => p.namn)).toEqual(["Gammal API-gateway", "Onboarding-guide"]);
  });
});

describe("the date in the Avslutade list", () => {
  it("reads 'Avslutat 12 nov.' in Swedish time", () => {
    expect(avslutatText("2026-11-12T09:00:00.000Z")).toBe("Avslutat 12 nov.");
    // 23:30 UTC on the 2nd is already the 3rd in Stockholm
    expect(avslutatText("2026-11-02T23:30:00.000Z")).toBe("Avslutat 3 nov.");
  });

  it("is just 'Avslutat' when the date is unknown", () => {
    expect(avslutatText(null)).toBe("Avslutat");
  });
});

describe("the light-blue ✦ (--klar) that marks an Avslutat Projekt", () => {
  const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");

  it("is #8fc7ff in natt and #2f6fb8 in dag (DESIGN.md)", () => {
    expect(tokens(css, "natt")["--klar"]).toBe("#8fc7ff");
    expect(tokens(css, "dag")["--klar"]).toBe("#2f6fb8");
  });

  for (const tema of ["natt", "dag"] as const) {
    // DESIGN.md: 10.6:1 natt, 4.6:1 dag on --bg. On the hover background the
    // ✦ is a symbol, not text, so the non-text minimum 3:1 applies.
    it(`reaches 4.5:1 on the background and 3:1 on hover in ${tema}`, () => {
      const t = tokens(css, tema);
      expect(kontrast(t["--klar"]!, t["--bg"]!)).toBeGreaterThanOrEqual(4.5);
      expect(kontrast(t["--klar"]!, t["--sel"]!)).toBeGreaterThanOrEqual(3);
    });
  }
});
