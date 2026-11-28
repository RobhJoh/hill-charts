import { describe, expect, it } from "vitest";
import { appetitNästanSlut } from "./datum.js";

describe("Appetit almost used up", () => {
  it("is the last ~15% of a running Appetit", () => {
    expect(appetitNästanSlut({ läge: "pågår", text: "4 dagar kvar", andel: 52 / 56 })).toBe(true);
    expect(appetitNästanSlut({ läge: "pågår", text: "9 dagar kvar", andel: 47 / 56 })).toBe(false);
    expect(appetitNästanSlut({ läge: "pågår", text: "49 dagar kvar", andel: 7 / 56 })).toBe(false);
  });

  it("is not Över tid (that has its own red), nor a countdown without an Appetit", () => {
    expect(appetitNästanSlut({ läge: "över tid", text: "Över tid · 2 dagar", andel: 1 })).toBe(false);
    expect(appetitNästanSlut({ läge: "pågår", text: "2 dagar kvar", andel: null })).toBe(false);
    expect(appetitNästanSlut(null)).toBe(false);
  });
});
