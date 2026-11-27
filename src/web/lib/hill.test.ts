import { describe, expect, it } from "vitest";
import { tillOklch, kontrast } from "./farg.js";
import { glimtVidSpar } from "./hill.js";
import {
  etikettText,
  etiketterSomFår,
  höjdpunkt,
  kompaktRuta,
  lägeFärg,
  placeraEtiketter,
  punkt,
  lägeFrånX,
  riktigaPixlar,
  stillaNot,
  telefonDiagram,
  type Etikett,
  type Hinder,
} from "./hill.js";

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

  /** Whether a label's box touches an obstacle (independent of the placement code). */
  const krockarHinder = (e: Etikett, h: Hinder) => {
    const r = e.ruta;
    if ("ruta" in h) return r.x < h.ruta.x + h.ruta.b && h.ruta.x < r.x + r.b && r.y < h.ruta.y + h.ruta.h && h.ruta.y < r.y + r.h;
    // Sample the line densely.
    const { x1, y1, x2, y2 } = h.linje;
    for (let t = 0; t <= 1; t += 1 / 400) {
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      if (px > r.x && px < r.x + r.b && py > r.y && py < r.y + r.h) return true;
    }
    return false;
  };

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

  it("keeps clear of other drawings: a text's box and a leader line", () => {
    const [x, y] = punkt(20);
    // Both sit right on the lone star's usual spot, up and to the left.
    const text: Hinder = { ruta: { x: x - 80, y: y - 30, b: 60, h: 20 } };
    const linje: Hinder = { linje: { x1: x - 120, y1: y - 20, x2: x - 20, y2: y - 20 } };
    for (const hinder of [text, linje]) {
      const [e] = placeraEtiketter([{ id: "a", läge: 20, text: "Prislista 20" }], undefined, [hinder]);
      expect(e!.x === x - 14 && e!.anchor === "end" && e!.y === y - 12).toBe(false);
      expect(krockarHinder(e!, hinder)).toBe(false);
    }
  });

  /** The orbit as short segments, sampled independently of the placement code. */
  const bana = (ruta?: ReturnType<typeof kompaktRuta>) =>
    Array.from({ length: 400 }, (_, j): Hinder => {
      const [x1, y1] = punkt(j / 4, ruta);
      const [x2, y2] = punkt((j + 1) / 4, ruta);
      return { linje: { x1, y1, x2, y2 } };
    });

  it("keeps a label put under its star off the orbit", () => {
    const [, y] = punkt(30);
    // Everything above and beside the star is taken.
    const tak: Hinder = { ruta: { x: 0, y: 0, b: 900, h: y + 5 } };
    const [e] = placeraEtiketter([{ id: "a", läge: 30, text: "Sessionshantering 30" }], undefined, [tak]);
    expect(e!.ruta.y).toBeGreaterThan(y);
    for (const h of bana()) expect(krockarHinder(e!, h)).toBe(false);
  });

  it("stacks crowded labels at the crest upward, with leader lines, rather than under the stars", () => {
    const stjärnor = [50, 45, 55, 48, 52].map((läge, i) => ({ id: `s${i}`, läge, text: `Lösenordsåterställning ${läge}` }));
    const etiketter = placeraEtiketter(stjärnor);
    for (const e of etiketter) {
      const [, y] = punkt(stjärnor.find((s) => s.id === e.id)!.läge);
      expect(e.ruta.y + e.ruta.h, e.id).toBeLessThanOrEqual(y);
    }
    expect(etiketter.filter((e) => e.ledare).length).toBeGreaterThan(0);
  });

  it("prefers stacking a short label at the crest upward to putting it under", () => {
    const [, y] = punkt(50);
    // The spots beside and just above are taken; under the star is free.
    const band: Hinder = { ruta: { x: 0, y: y - 50, b: 900, h: 55 } };
    const [e] = placeraEtiketter([{ id: "a", läge: 50, text: "UX 50" }], undefined, [band]);
    expect(e!.ruta.y + e!.ruta.h).toBeLessThanOrEqual(y - 50);
    expect(e!.ledare).toBeDefined();
  });

  it("anchors a label at Läge 0 to the right of its star, and mirrors it at 100", () => {
    const [x0] = punkt(0);
    const [x100] = punkt(100);
    const [vänster] = placeraEtiketter([{ id: "a", läge: 0, text: "B Export till PDF 0" }]);
    const [höger] = placeraEtiketter([{ id: "a", läge: 100, text: "B Export till PDF 100" }]);
    expect(vänster).toMatchObject({ x: x0 + 14, anchor: "start" });
    expect(höger).toMatchObject({ x: x100 - 14, anchor: "end" });
  });

  it("keeps crowded labels at both ends inside the chart (the Stjärnkarta's many Scopes)", () => {
    const namn = ["Export till PDF", "Prislista", "Inloggning", "Kvitton", "Kortbetalning", "Sessionshantering"];
    for (const ruta of [undefined, kompaktRuta(360, 300)]) {
      const bredd = ruta?.bredd ?? 900;
      const stjärnor = [0, 0, 1, 2, 3, 4, 96, 97, 98, 99, 100, 100].map((läge, i) => ({
        id: `s${i}`,
        läge,
        text: `${"ABCD"[i % 4]} ${namn[i % namn.length]} ${läge}`,
      }));
      for (const e of placeraEtiketter(stjärnor, ruta)) {
        expect(e.ruta.x, e.id).toBeGreaterThanOrEqual(0);
        expect(e.ruta.x + e.ruta.b, e.id).toBeLessThanOrEqual(bredd);
        expect(e.ruta.y, e.id).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("lays out a crowded Projekt clear of each other, the Stilla note, the orbit and the axis", () => {
    // Two at the crest, two at the end, and a Stilla star near the crest.
    const stjärnor = [
      { id: "tillg", läge: 45, text: "Tillgänglighetsgranskning 45" },
      { id: "lösen", läge: 55, text: "Lösenordsåterställning 55" },
      { id: "kort", läge: 95, text: "Kortbetalning 95" },
      { id: "kvitto", läge: 100, text: "Kvitton 100" },
      { id: "sess", läge: 38, text: "Sessionshantering 38" },
    ];
    const not = stillaNot(38, 21);
    const etiketter = placeraEtiketter(stjärnor, undefined, not.hinder);
    for (const a of etiketter) {
      const [, y] = punkt(stjärnor.find((s) => s.id === a.id)!.läge);
      for (const b of etiketter) if (a !== b) expect(överlappar(a, b), `${a.id} / ${b.id}`).toBe(false);
      for (const h of not.hinder) expect(krockarHinder(a, h), `${a.id} on the note`).toBe(false);
      if (a.ruta.y > y) for (const h of bana()) expect(krockarHinder(a, h), `${a.id} on the orbit`).toBe(false);
      // Below the baseline is the axis.
      expect(a.ruta.y + a.ruta.h, a.id).toBeLessThanOrEqual(560);
      // A label sits by its own star or has a leader to it.
      if (!a.ledare) expect(Math.abs(a.y - y), a.id).toBeLessThan(40);
      expect(a.ruta.x, a.id).toBeGreaterThanOrEqual(0);
      expect(a.ruta.x + a.ruta.b, a.id).toBeLessThanOrEqual(900);
    }
  });

  it("never puts a label at the end below the baseline, onto the axis", () => {
    const [, y] = punkt(97);
    const tak: Hinder = { ruta: { x: 0, y: 0, b: 900, h: y + 3 } };
    const [e] = placeraEtiketter([{ id: "a", läge: 97, text: "Kvitton 97" }], undefined, [tak]);
    expect(e!.ruta.y + e!.ruta.h).toBeLessThanOrEqual(560);
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

describe("labels that fit (the wide embed, Q3 b)", () => {
  const överlappar = (a: Etikett, b: Etikett) =>
    a.ruta.x < b.ruta.x + b.ruta.b && b.ruta.x < a.ruta.x + a.ruta.b && a.ruta.y < b.ruta.y + b.ruta.h && b.ruta.y < a.ruta.y + a.ruta.h;
  const fem = [
    { id: "felmeddelanden", läge: 10, text: "Felmeddelanden 10" },
    { id: "sessionshantering", läge: 30, text: "Sessionshantering 30" },
    { id: "losenord", läge: 55, text: "Lösenordsåterställning 55" },
    { id: "tillganglighet", läge: 71, text: "Tillgänglighetsgranskning 71" },
    { id: "bankid", läge: 85, text: "BankID-flöde 85" },
  ];

  it("shows all five of today's Scopes beside the list, even 220 px high", () => {
    // 720 px wide embed with a 230 px list leaves 490 px for the hill.
    const etiketter = etiketterSomFår(fem, kompaktRuta(490, 220));
    expect(etiketter.map((e) => e.id).sort()).toEqual(fem.map((s) => s.id).sort());
  });

  it("leaves out the labels that would collide, instead of overlapping them", () => {
    const trängsel = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, läge: 20 + 2 * i, text: `Scope nummer ${i}` }));
    const etiketter = etiketterSomFår(trängsel, kompaktRuta(300, 160));
    expect(etiketter.length).toBeGreaterThan(0);
    expect(etiketter.length).toBeLessThan(trängsel.length);
    for (const a of etiketter) for (const b of etiketter) if (a !== b) expect(överlappar(a, b), `${a.id} / ${b.id}`).toBe(false);
  });

  it("always shows the selected or pointed-at Scope's label, even when crowded", () => {
    const trängsel = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, läge: 20 + 2 * i, text: `Scope nummer ${i}` }));
    const utan = etiketterSomFår(trängsel, kompaktRuta(300, 160)).map((e) => e.id);
    const saknas = trängsel.map((s) => s.id).find((id) => !utan.includes(id))!;
    const med = etiketterSomFår(trängsel, kompaktRuta(300, 160), [], [saknas]).map((e) => e.id);
    expect(med).toContain(saknas);
  });
});

describe("a Stilla star's note", () => {
  it("leads from the ring to the text, turned away from the frame's edges", () => {
    const [x, y] = punkt(30);
    const not = stillaNot(30, 21);
    expect(not.text).toMatchObject({ x: x + 64, y: y + 46, anchor: "start", innehåll: "Ingen rörelse på 21 dagar" });
    expect(not.punkter).toEqual([
      [x + 12, y + 10],
      [x + 60, y + 52],
      [x + 232, y + 52],
    ]);
    // Near the right edge and the baseline it turns left and up.
    const [x2, y2] = punkt(92);
    const höger = stillaNot(92, 30);
    expect(höger.text).toMatchObject({ x: x2 - 64, y: y2 - 58, anchor: "end" });
    expect(höger.punkter[2]).toEqual([x2 - 232, y2 - 52]);
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

describe("a drop's high point", () => {
  it("marks a drop over the crest and one that lands on 100", () => {
    expect(höjdpunkt(40, 60)).toBe("krön");
    expect(höjdpunkt(49, 50)).toBe("krön");
    expect(höjdpunkt(70, 100)).toBe("mål");
    // All the way from uphill to done: the landing is the bigger moment.
    expect(höjdpunkt(20, 100)).toBe("mål");
  });

  it("leaves ordinary moves, and moves back, unmarked", () => {
    expect(höjdpunkt(20, 40)).toBeNull();
    expect(höjdpunkt(60, 90)).toBeNull();
    expect(höjdpunkt(60, 40)).toBeNull();
    expect(höjdpunkt(100, 100)).toBeNull();
    expect(höjdpunkt(50, 70)).toBeNull();
  });
});

describe("the chart on a phone (Q9 a, Q17 b)", () => {
  it("draws in real pixels whenever the scaled 900-wide chart would shrink its 13px labels", () => {
    expect(riktigaPixlar(358)).toBe(true);
    expect(riktigaPixlar(600)).toBe(true);
    expect(riktigaPixlar(899)).toBe(true);
    expect(riktigaPixlar(900)).toBe(false);
    expect(riktigaPixlar(1200)).toBe(false);
    // Not measured yet: keep the scaled chart.
    expect(riktigaPixlar(0)).toBe(false);
  });

  // The crowded Projekt from the design review, on a 390 px phone (358 px inside the page's margins).
  const ny = [
    { id: "tillg", läge: 45, text: "Tillgänglighetsgranskning 45" },
    { id: "lösen", läge: 55, text: "Lösenordsåterställning 55" },
    { id: "kort", läge: 95, text: "Kortbetalning 95" },
    { id: "kvitto", läge: 100, text: "Kvitton 100" },
    { id: "start", läge: 0, text: "Inloggningssida 0" },
    { id: "sess", läge: 3, text: "Sessionshantering 3 · 21 d" },
  ];
  type Box = { x: number; y: number; b: number; h: number };
  const krockar = (a: Box, b: Box) => a.x < b.x + b.b && b.x < a.x + a.b && a.y < b.y + b.h && b.y < a.y + a.h;

  it("draws in real pixels at the measured width, with room under the baseline for the axis", () => {
    const { ruta } = telefonDiagram(358, ny);
    expect(ruta.bredd).toBe(358);
    expect(ruta.x0).toBeGreaterThanOrEqual(12);
    expect(ruta.x0 + ruta.w).toBeLessThanOrEqual(358 - 12);
    expect(ruta.höjd - ruta.bas).toBeGreaterThanOrEqual(48);
  });

  it("shows every label, clear of each other and of the stars, inside the box", () => {
    const { ruta, etiketter } = telefonDiagram(358, ny);
    expect(etiketter.map((e) => e.id).sort()).toEqual(ny.map((s) => s.id).sort());
    const kärnor = ny.map((s) => {
      const [x, y] = punkt(s.läge, ruta);
      return { id: s.id, x: x - 7, y: y - 7, b: 14, h: 14 };
    });
    for (const a of etiketter) {
      for (const b of etiketter) if (a !== b) expect(krockar(a.ruta, b.ruta), `${a.id} / ${b.id}`).toBe(false);
      for (const k of kärnor) if (k.id !== a.id) expect(krockar(a.ruta, k), `${a.id} on ${k.id}`).toBe(false);
      expect(a.ruta.x, a.id).toBeGreaterThanOrEqual(0);
      expect(a.ruta.x + a.ruta.b, a.id).toBeLessThanOrEqual(358);
      expect(a.ruta.y, a.id).toBeGreaterThanOrEqual(0);
      expect(a.ruta.y + a.ruta.h, a.id).toBeLessThanOrEqual(ruta.bas);
      // Beside or stacked above its star, never hung down into the hill.
      const [, y] = punkt(ny.find((s) => s.id === a.id)!.läge, ruta);
      expect(a.ruta.y, a.id).toBeLessThan(y);
    }
  });

  it("grows taller only as far as crowded labels need (about 1.5 × with six Scopes)", () => {
    const ensam = telefonDiagram(358, [{ id: "a", läge: 70, text: "Prislista 70" }]).ruta;
    const trång = telefonDiagram(358, ny).ruta;
    expect(trång.höjd).toBeGreaterThan(ensam.höjd);
    expect(trång.höjd).toBeLessThanOrEqual(ensam.höjd * 1.7);
    // The hill itself keeps its size: the extra room is above it.
    expect(trång.ht).toBe(ensam.ht);
  });
});

describe("a saved drop's glint on the Stjärnkarta (#67)", () => {
  it("pulses every saved drop when the chart asks for it, keeping the high points", () => {
    expect(glimtVidSpar(20, 40, true)).toBe("puls");
    expect(glimtVidSpar(60, 40, true)).toBe("puls");
    expect(glimtVidSpar(40, 60, true)).toBe("krön");
    expect(glimtVidSpar(70, 100, true)).toBe("mål");
  });

  it("marks only the high points otherwise", () => {
    expect(glimtVidSpar(20, 40, false)).toBeNull();
    expect(glimtVidSpar(40, 60, false)).toBe("krön");
  });
});
