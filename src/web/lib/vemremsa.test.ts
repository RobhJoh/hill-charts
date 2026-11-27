import { describe, expect, it } from "vitest";
import { sparatKvitto, vemFråga } from "./vemremsa.js";

describe("vemFråga: the Signatur strip's question", () => {
  it("names the held move's Scope", () => {
    expect(vemFråga({ scopeId: "s1", namn: "Felmeddelanden", läge: 11 })).toBe("Vem flyttade Felmeddelanden?");
  });

  it("is a plain Vem? for a held edit that is not a move", () => {
    expect(vemFråga(null)).toBe("Vem?");
  });

  it("asks who you are when opened to change the Signatur, nothing held", () => {
    expect(vemFråga(null, { byter: true })).toBe("Vem är du?");
  });

  it("a held move wins over changing the Signatur", () => {
    expect(vemFråga({ scopeId: "s1", namn: "Betalsteg", läge: 82 }, { byter: true })).toBe("Vem flyttade Betalsteg?");
  });
});

describe("sparatKvitto: the receipt after a saved move", () => {
  it("says what moved where, signed by whom", () => {
    expect(sparatKvitto({ scopeId: "s1", namn: "BankID-flöde", läge: 94 }, "Anna Lind")).toBe(
      "Sparat · BankID-flöde 94 · Anna Lind",
    );
  });

  it("leaves out the name when the Person is unknown", () => {
    expect(sparatKvitto({ scopeId: "s1", namn: "BankID-flöde", läge: 94 })).toBe("Sparat · BankID-flöde 94");
  });
});
