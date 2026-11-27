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

  // Its value and 4.5:1 on --bg are checked in kontrast.test.ts (#57). On the
  // list's hover background the ✦ is a symbol, not text: non-text 3:1 applies.
  for (const tema of ["natt", "dag"] as const) {
    it(`stays visible on the hovered row in ${tema}`, () => {
      const t = tokens(css, tema);
      expect(kontrast(t["--klar"]!, t["--sel"]!)).toBeGreaterThanOrEqual(3);
    });
  }
});
