import { describe, expect, it } from "vitest";
import { tillOklch, kontrast } from "./farg.js";
import { etikettText, kompaktRuta, lägeFärg, placeraEtiketter, punkt, lägeFrånX, type Etikett } from "./hill.js";

describe("colour from Läge", () => {
  const heltal = Array.from({ length: 101 }, (_, i) => i);
  const kall = (hex: string) => {
    const [, , h] = tillOklch(hex);
    return h >= 230 && h <= 290;
  };

  it("hits the ramp's stops in each theme", () => {
    expect(lägeFärg(50, "natt")).toBe("#ffe7a8");
    expect(lägeFärg(75, "natt")).toBe("#a9c8ff");
    expect(lägeFärg(100, "natt")).toBe("#6f9fff");
    expect(lägeFärg(50, "dag")).toBe("#b8860b");
    expect(lägeFärg(62, "dag")).toBe("#6f86c8");
    expect(lägeFärg(75, "dag")).toBe("#5a86d6");
    expect(lägeFärg(100, "dag")).toBe("#2f5fc4");
  });

  it("clamps Läge outside 0–100", () => {
    expect(lägeFärg(-5, "dag")).toBe(lägeFärg(0, "dag"));
    expect(lägeFärg(120, "natt")).toBe(lägeFärg(100, "natt"));
  });

  it("keeps every whole Läge in dag at least 3:1 against white", () => {
    for (const l of heltal) expect(kontrast(lägeFärg(l, "dag"), "#ffffff"), `Läge ${l}`).toBeGreaterThanOrEqual(3);
  });

  it("keeps dag's mid colours clean: amber up to the crest, then cool slate, never olive or grey", () => {
    for (const l of heltal.filter((l) => l <= 50)) expect(tillOklch(lägeFärg(l, "dag"))[1], `Läge ${l}`).toBeGreaterThan(0.12);
    // Interpolating in RGB made 55 #b39c40 (olive) and 65 about #86918b (grey).
    for (const l of heltal.filter((l) => l >= 55)) expect(kall(lägeFärg(l, "dag")), `Läge ${l}`).toBe(true);
    for (const l of heltal.filter((l) => l >= 60)) expect(tillOklch(lägeFärg(l, "dag"))[1], `Läge ${l}`).toBeGreaterThan(0.07);
  });

  it("keeps natt's downhill blue, so white only shows just past the crest", () => {
    // RGB from #fff1c9 to #cfe0ff made everything between about 45 and 85 near white.
    for (const l of heltal.filter((l) => l >= 56)) expect(kall(lägeFärg(l, "natt")), `Läge ${l}`).toBe(true);
    for (const l of heltal.filter((l) => l >= 60)) expect(tillOklch(lägeFärg(l, "natt"))[1], `Läge ${l}`).toBeGreaterThan(0.05);
    for (const l of heltal.filter((l) => l <= 50)) expect(tillOklch(lägeFärg(l, "natt"))[1], `Läge ${l}`).toBeGreaterThan(0.08);
  });

  it("starts uphill toward amber, apart from the orange-red accent", () => {
    // The accent (#48) is about #f0602e at natt and #c44a1c at dag.
    for (const [tema, accent] of [["natt", "#f0602e"], ["dag", "#c44a1c"]] as const) {
      expect(tillOklch(lägeFärg(0, tema))[2] - tillOklch(accent)[2], tema).toBeGreaterThan(8);
    }
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

  it("fits the embed's compact hill to whatever box it gets, in pixels", () => {
    const ruta = kompaktRuta(600, 270);
    expect(punkt(0, ruta)).toEqual([18, 248]);
    expect(punkt(50, ruta)).toEqual([300, 24]);
    expect(punkt(100, ruta)).toEqual([582, 248]);
    expect(lägeFrånX(18 + 564 / 4, ruta)).toBe(25);
    expect(lägeFrånX(599, ruta)).toBe(100);
    // A very low box still has a hill.
    const låg = kompaktRuta(300, 40);
    expect(låg.bas - punkt(50, låg)[1]).toBe(20);
  });

  it("keeps a tall embed's hill at about 0.45 × its width, centred, instead of a spire", () => {
    const ruta = kompaktRuta(720, 600);
    expect(ruta.ht).toBe(324);
    // Centred: the space above the crest equals the space below the baseline.
    expect(punkt(50, ruta)[1]).toBe(600 - ruta.bas);
    expect(ruta.bas - punkt(0, ruta)[1]).toBe(0);
    const smal = kompaktRuta(400, 600);
    expect(smal.ht).toBe(180);
    expect(punkt(50, smal)[1]).toBe(600 - smal.bas);
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

  it("keeps labels inside a compact box, sized for its smaller type", () => {
    const ruta = kompaktRuta(400, 260);
    const etiketter = placeraEtiketter(
      [2, 30, 50, 70, 98].map((läge, i) => ({ id: `s${i}`, läge, text: `Scope ${i} ${läge}` })),
      ruta,
    );
    for (const e of etiketter) {
      expect(e.ruta.x, e.id).toBeGreaterThanOrEqual(0);
      expect(e.ruta.x + e.ruta.b, e.id).toBeLessThanOrEqual(400);
      expect(e.ruta.y, e.id).toBeGreaterThanOrEqual(0);
    }
    // 13px labels are narrower than the big chart's 15px ones.
    const [stor] = placeraEtiketter([{ id: "a", läge: 70, text: "Prislista 70" }]);
    const [liten] = placeraEtiketter([{ id: "a", läge: 70, text: "Prislista 70" }], ruta);
    expect(liten!.ruta.b).toBeLessThan(stor!.ruta.b);
  });
});

describe("a star's label text", () => {
  it("is the name and Läge", () => {
    expect(etikettText({ namn: "Sessionshantering", läge: 40 })).toBe("Sessionshantering 40");
  });

  it("puts the Stjärnkarta's Projekt letter first", () => {
    expect(etikettText({ namn: "Sessionshantering", läge: 40, märke: "B" })).toBe("B Sessionshantering 40");
  });

  it("marks the selected Scope with ✦ before its name (Q15 a)", () => {
    expect(etikettText({ namn: "Sessionshantering", läge: 40, vald: true })).toBe("✦ Sessionshantering 40");
    expect(etikettText({ namn: "Sessionshantering", läge: 40, märke: "B", vald: true })).toBe(
      "B ✦ Sessionshantering 40",
    );
  });
});
