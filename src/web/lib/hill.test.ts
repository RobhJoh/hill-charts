import { describe, expect, it } from "vitest";
import { lägeFärg, placeraEtiketter, punkt, lägeFrånX, type Etikett } from "./hill.js";

describe("colour from Läge", () => {
  it("follows the Stjärnatlas ramp for each theme", () => {
    expect(lägeFärg(0, "natt")).toBe("#ff7a4d");
    expect(lägeFärg(25, "natt")).toBe("#ffb36b");
    expect(lägeFärg(12.5, "natt")).toBe("#ff975c");
    expect(lägeFärg(100, "natt")).toBe("#8fb8ff");
    expect(lägeFärg(0, "dag")).toBe("#d9481f");
    expect(lägeFärg(50, "dag")).toBe("#c9a21a");
    expect(lägeFärg(100, "dag")).toBe("#2f5fc4");
  });
});

describe("chart geometry", () => {
  it("puts Läge 0 and 100 on the baseline and the crest at 50", () => {
    expect(punkt(0)).toEqual([70, 560]);
    expect(punkt(50)).toEqual([450, 180]);
    expect(punkt(100)).toEqual([830, 560]);
  });

  it("turns an x position back into a whole, clamped Läge", () => {
    expect(lägeFrånX(450)).toBe(50);
    expect(lägeFrånX(77.6)).toBe(1);
    expect(lägeFrånX(0)).toBe(0);
    expect(lägeFrånX(900)).toBe(100);
  });
});

describe("label placement", () => {
  const överlappar = (a: Etikett, b: Etikett) =>
    a.ruta.x < b.ruta.x + b.ruta.b && b.ruta.x < a.ruta.x + a.ruta.b && a.ruta.y < b.ruta.y + b.ruta.h && b.ruta.y < a.ruta.y + a.ruta.h;

  it("places a lone star's label beside it, as in the prototype", () => {
    const [e] = placeraEtiketter([{ id: "a", läge: 20, text: "Prislista 20" }]);
    const [x, y] = punkt(20);
    expect(e).toMatchObject({ id: "a", x: x - 14, y: y - 12, anchor: "end" });
    expect(e!.ledare).toBeUndefined();
  });

  it("keeps labels of close stars from colliding", () => {
    const stjärnor = [20, 21, 21, 22, 23, 50, 50, 51, 95, 96].map((läge, i) => ({
      id: `s${i}`,
      läge,
      text: `Scope nummer ${i} ${läge}`,
    }));
    const etiketter = placeraEtiketter(stjärnor);
    expect(etiketter.map((e) => e.id)).toEqual(stjärnor.map((s) => s.id));
    for (const a of etiketter) {
      for (const b of etiketter) {
        if (a !== b) expect(överlappar(a, b), `${a.id} / ${b.id}`).toBe(false);
      }
    }
  });
});
