import { describe, expect, it } from "vitest";
import { statusText } from "./avslutat.js";

describe("statusText: the Projekt page's status line", () => {
  it("names Inte påbörjat and Pågående", () => {
    expect(statusText({ status: "inte påbörjat", avslutad: null })).toBe("Inte påbörjat");
    expect(statusText({ status: "pågående", avslutad: null })).toBe("Pågående");
  });

  it("an Avslutat Projekt says when, in Stockholm time, like the overview's Avslutade list", () => {
    expect(statusText({ status: "avslutat", avslutad: "2026-11-12T12:00:00Z" })).toBe("Avslutat 12 nov.");
    expect(statusText({ status: "avslutat", avslutad: "2026-11-02T23:30:00.000Z" })).toBe("Avslutat 3 nov.");
  });

  it("an Avslutat Projekt without a known time just says Avslutat", () => {
    expect(statusText({ status: "avslutat", avslutad: null })).toBe("Avslutat");
  });
});
