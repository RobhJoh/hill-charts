// Hill chart geometry and colour in the Stjärnatlas direction (see the
// prototype/stjarnatlas branch). Pure functions, shared by the Projekt chart,
// mini charts and, later, the embed and the Stjärnkarta.

import { frånOklch, tillOklch } from "./farg.js";

export type Tema = "natt" | "dag";

/** Height of the hill (0–1) at a Läge (0–100): a single smooth crest at 50. */
export const hillY = (läge: number) => (1 - Math.cos((2 * Math.PI * läge) / 100)) / 2;

/**
 * A chart's box: the whole drawing (`bredd` × `höjd`), where the hill sits in
 * it (from `x0`, `w` wide, baseline `bas`, `ht` high, grid top `topp`), and
 * the average advance of a label character (`tecken`) for label placement.
 */
export type Ruta = {
  readonly bredd: number;
  readonly höjd: number;
  readonly x0: number;
  readonly w: number;
  readonly bas: number;
  readonly ht: number;
  readonly topp: number;
  readonly tecken: number;
};

/** The big chart's box, in SVG units (viewBox 0 0 900 640). */
export const RUTA: Ruta = { bredd: 900, höjd: 640, x0: 70, w: 760, bas: 560, ht: 380, topp: 40, tecken: 8.4 };

/** The compact hill's highest height, as a share of the box's width. */
const KULLE_MOT_BREDD = 0.45;

/**
 * The embed's compact hill (prototype/embed): fills a `bredd` × `höjd` pixel
 * box with small margins, no grid, and 13px labels. The hill keeps a minimum
 * height, so a very low box still shows one, and a maximum (about 0.45 × the
 * width), so a tall one does not stretch it into a spire.
 */
export function kompaktRuta(bredd: number, höjd: number): Ruta {
  const x0 = 18;
  const tak = Math.round(KULLE_MOT_BREDD * bredd);
  if (höjd - 46 > tak) {
    // A tall box: the hill stays at most ~0.45 × the width and is centred, so
    // the extra height becomes room for labels instead of a spire.
    const topp = Math.round((höjd - tak) / 2);
    return { bredd, höjd, x0, w: bredd - 2 * x0, bas: topp + tak, ht: tak, topp, tecken: 7.3 };
  }
  const topp = 24;
  const bas = höjd - 22;
  return { bredd, höjd, x0, w: bredd - 2 * x0, bas, ht: Math.max(20, bas - topp), topp, tecken: 7.3 };
}

/** A Läge's point on the orbit. */
export const punkt = (läge: number, ruta: Ruta = RUTA): [number, number] => [
  ruta.x0 + (ruta.w * läge) / 100,
  ruta.bas - ruta.ht * hillY(läge),
];

/** The whole, clamped Läge under an x position (only x matters: a star rides the curve). */
export const lägeFrånX = (x: number, ruta: Ruta = RUTA) =>
  Math.round(Math.min(100, Math.max(0, ((x - ruta.x0) / ruta.w) * 100)));

/**
 * Colour stops of the spectral ramp: warm uphill, gold crest, blue downhill.
 * Läge 0 leans amber so it stays apart from the orange-red accent; the stop
 * at 62 takes the colour from the crest straight into a cool, clean blue.
 */
export const RAMP: Record<Tema, readonly (readonly [number, string])[]> = {
  natt: [
    [0, "#ff9550"],
    [25, "#ffb86b"],
    [50, "#ffe7a8"],
    [62, "#bdd0ff"],
    [75, "#a9c8ff"],
    [100, "#6f9fff"],
  ],
  dag: [
    [0, "#c4580a"],
    [25, "#bc7208"],
    [50, "#b8860b"],
    [62, "#6f86c8"],
    [75, "#5a86d6"],
    [100, "#2f5fc4"],
  ],
};

/** Where, between a warm and a cool stop, the colour passes through neutral. */
const VÄNDPUNKT = 0.25;

/**
 * Interpolates two colours in OKLCH. Neighbouring hues turn along the shorter
 * way; nearly opposite hues (warm crest to cool downhill) would turn through
 * pink or olive, so the chroma fades out early instead, the hue switches at
 * neutral, and the colour comes back in the cool hue (via slate, not grey).
 */
function blanda(a: string, b: string, t: number): string {
  const [la, ca, ha] = tillOklch(a);
  const [lb, cb, hb] = tillOklch(b);
  const l = la + (lb - la) * t;
  const dh = ((hb - ha + 540) % 360) - 180;
  if (Math.abs(dh) > 90) {
    return t < VÄNDPUNKT
      ? frånOklch([l, ca * (1 - t / VÄNDPUNKT), ha])
      : frånOklch([l, (cb * (t - VÄNDPUNKT)) / (1 - VÄNDPUNKT), hb]);
  }
  return frånOklch([l, ca + (cb - ca) * t, (ha + dh * t + 360) % 360]);
}

/** A Scope's colour, derived from its Läge (never stored): piecewise OKLCH between stops. */
export function lägeFärg(läge: number, tema: Tema): string {
  const stops = RAMP[tema];
  const l = Math.min(100, Math.max(0, läge));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]!;
    const [b, cb] = stops[i + 1]!;
    if (l === a) return ca;
    if (l === b) return cb;
    if (l > a && l < b) return blanda(ca, cb, (l - a) / (b - a));
  }
  return stops[stops.length - 1]![1];
}

/** CSS gradient for the legend bar, sampled from the ramp (CSS would blend in sRGB). */
export const rampGradient = (tema: Tema) =>
  `linear-gradient(90deg, ${Array.from({ length: 21 }, (_, i) => `${lägeFärg(i * 5, tema)} ${i * 5}%`).join(", ")})`;

/** Star radius by days since its Läge last changed: recent moves shine bigger. */
export function radie(dagar: number): number {
  if (dagar <= 1) return 9;
  if (dagar <= 6) return 7.5;
  return 5;
}

/**
 * A drop's high point, marked with a short glint: over the crest (from
 * figuring out to doing) or landing on 100 (done). Moving back is not one.
 */
export function höjdpunkt(från: number, till: number): "krön" | "mål" | null {
  if (till === 100 && från < 100) return "mål";
  if (från < 50 && till >= 50) return "krön";
  return null;
}

/**
 * The glint after a saved drop: a high point as above, or, on a chart that
 * confirms every save (the Stjärnkarta), a plain short pulse.
 */
export function glimtVidSpar(från: number, till: number, puls: boolean): "krön" | "mål" | "puls" | null {
  return höjdpunkt(från, till) ?? (puls ? "puls" : null);
}

/** Whole days since a time: the core's rule, so star size and "stuck" agree. */
export { dagarSedan } from "../../core/index.js";

// ---------- labels ----------

export type Etikett = {
  id: string;
  /** Text anchor point and alignment. */
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  /** The label's estimated box, for collision checks. */
  ruta: { x: number; y: number; b: number; h: number };
  /** A leader line from the star to a label moved away from it. */
  ledare?: { x1: number; y1: number; x2: number; y2: number };
};

/**
 * A star's label: the Stjärnkarta's Projekt letter, ✦ for the selected Scope
 * (form, not only colour, tells it from the uphill stars), the name and Läge.
 */
export function etikettText(s: { namn: string; läge: number; märke?: string; vald?: boolean }): string {
  return [s.märke, s.vald ? "✦" : undefined, s.namn, String(s.läge)].filter(Boolean).join(" ");
}

const RAD = 18;

/** A box in chart units: left `x`, top `y`, width `b`, height `h`. */
export type Låda = { x: number; y: number; b: number; h: number };

/** Something a label must keep clear of: a box (a text) or a line (a leader, the orbit). */
export type Hinder = { ruta: Låda } | { linje: { x1: number; y1: number; x2: number; y2: number } };

/**
 * A Stilla star's note on the big chart: a leader from its ring out to
 * "Ingen rörelse på N dagar", turned away from the frame's right edge and the
 * baseline. `hinder` are the leader and the text, for label placement.
 */
export function stillaNot(läge: number, dagar: number, box: Ruta = RUTA) {
  const [x, y] = punkt(läge, box);
  const dx = x > (box.bredd * 2) / 3 ? -1 : 1;
  const dy = y > box.bas - 90 ? -1 : 1;
  const punkter: [number, number][] = [
    [x + 12 * dx, y + 10 * dy],
    [x + 60 * dx, y + 52 * dy],
    [x + 232 * dx, y + 52 * dy],
  ];
  const innehåll = `Ingen rörelse på ${dagar} dagar`;
  const text = { x: x + 64 * dx, y: y + (dy > 0 ? 46 : -58), anchor: (dx > 0 ? "start" : "end") as Etikett["anchor"], innehåll };
  // The note is 14px against the labels' 15px.
  const bredd = (innehåll.length * box.tecken * 14) / 15;
  const hinder: Hinder[] = [
    { ruta: { x: (dx > 0 ? text.x : text.x - bredd) - 2, y: text.y - 13, b: bredd + 4, h: 17 } },
    ...punkter.slice(1).map(([x2, y2], i) => ({ linje: { x1: punkter[i]![0], y1: punkter[i]![1], x2, y2 } })),
  ];
  return { punkter, text, hinder };
}

function ruta(x: number, y: number, anchor: Etikett["anchor"], bredd: number) {
  const vänster = anchor === "start" ? x : anchor === "end" ? x - bredd : x - bredd / 2;
  return { x: vänster - 2, y: y - 14, b: bredd + 4, h: RAD };
}

const krockar = (a: Låda, b: Låda) => a.x < b.x + b.b && b.x < a.x + a.b && a.y < b.y + b.h && b.y < a.y + a.h;

/** Whether a line segment passes through a box (Liang–Barsky clipping). */
function korsar(r: Låda, { x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, x1 - r.x],
    [dx, r.x + r.b - x1],
    [-dy, y1 - r.y],
    [dy, r.y + r.h - y1],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** Whether the orbit runs through a box: checked in half-Läge steps across the box's width. */
function påBanan(r: Låda, box: Ruta): boolean {
  const från = Math.max(0, Math.floor(((r.x - box.x0) / box.w) * 200));
  const till = Math.min(200, Math.ceil(((r.x + r.b - box.x0) / box.w) * 200));
  for (let j = från; j < till; j++) {
    const [x1, y1] = punkt(j / 2, box);
    const [x2, y2] = punkt((j + 1) / 2, box);
    if (korsar(r, { x1, y1, x2, y2 })) return true;
  }
  return false;
}

const träffar = (r: Låda, h: Hinder) => ("ruta" in h ? krockar(r, h.ruta) : korsar(r, h.linje));

/** A label spot: anchor point, alignment, and whether it is stacked away (with a leader). */
type Kandidat = [number, number, Etikett["anchor"], boolean];

/** The prototype's spot for a label, by Läge. */
function grundläge(läge: number, x: number, y: number): [number, number, Etikett["anchor"]] {
  if (läge >= 88) return [x - 14, y - 24, "end"];
  if (läge < 45) return [x - 14, y - 12, "end"];
  if (läge < 56) return [x, y - 22, "middle"];
  return [x + 14, y - 12, "start"];
}

/**
 * Places each star's label so no two labels overlap: first the prototype's
 * spot, then the other sides, then stacked further away with a leader line.
 * Earlier stars in the list get the better spots.
 */
export function placeraEtiketter(
  stjärnor: { id: string; läge: number; text: string }[],
  box: Ruta = RUTA,
  hinder: readonly Hinder[] = [],
): Etikett[] {
  const placerade: Etikett[] = [];
  // Star cores are obstacles too, so a label never covers another star.
  const kärnor = stjärnor.map((s) => {
    const [x, y] = punkt(s.läge, box);
    return { x: x - 7, y: y - 7, b: 14, h: 14 };
  });
  for (const s of stjärnor) {
    const [x, y] = punkt(s.läge, box);
    const bredd = s.text.length * box.tecken;
    const kandidater: Kandidat[] = [
      [...grundläge(s.läge, x, y), false],
      [x + 14, y - 12, "start", false],
      [x - 14, y - 12, "end", false],
      [x, y - 22, "middle", false],
    ];
    const upp = Array.from({ length: 14 }, (_, i): Kandidat => [x, y - 22 - RAD * (i + 1), "middle", true]);
    const ner: Kandidat[] = [
      [x, y + 30, "middle", false],
      ...Array.from({ length: 14 }, (_, i): Kandidat => [x, y + 30 + RAD * (i + 1), "middle", true]),
    ];
    // At the crest a label under its star sits inside the hill, between the
    // slopes: stack upward first. Elsewhere take the nearest free spot.
    if (Math.abs(s.läge - 50) <= 10) kandidater.push(...upp, ...ner);
    else kandidater.push(ner[0]!, ...upp.flatMap((u, i) => [u, ner[i + 1]!]));
    // Inside the chart and above its baseline: below it is the axis.
    const inom = (r: Låda) => r.x >= 0 && r.x + r.b <= box.bredd && r.y >= 0 && r.y + r.h <= box.bas;
    /** A centred label that would cross the chart's side slides in, anchored at that side. */
    const iRutan = ([lx, ly, anchor, långt]: Kandidat): Kandidat => {
      if (anchor !== "middle") return [lx, ly, anchor, långt];
      if (lx - bredd / 2 - 2 < 0) return [2, ly, "start", långt];
      if (lx + bredd / 2 + 2 > box.bredd) return [box.bredd - 2, ly, "end", långt];
      return [lx, ly, anchor, långt];
    };
    const etikett = ([lx, ly, anchor, långt]: Kandidat): Etikett => {
      const r = ruta(lx, ly, anchor, bredd);
      const e: Etikett = { id: s.id, x: lx, y: ly, anchor, ruta: r };
      if (långt) {
        const ovan = ly < y;
        // The leader meets the label straight above or below the star where it can.
        const x2 = Math.min(r.x + r.b - 4, Math.max(r.x + 4, x));
        e.ledare = { x1: x, y1: y + (ovan ? -10 : 10), x2, y2: ovan ? r.y + r.h : r.y };
      }
      return e;
    };
    const iDiagrammet = kandidater.map(iRutan).filter(([lx, ly, anchor]) => inom(ruta(lx, ly, anchor, bredd)));
    const fri = iDiagrammet.find(([lx, ly, anchor]) => {
      const r = ruta(lx, ly, anchor, bredd);
      if (placerade.some((p) => krockar(p.ruta, r)) || kärnor.some((k) => krockar(k, r))) return false;
      if (hinder.some((h) => träffar(r, h))) return false;
      // Under its star a label would sit on the orbit as it falls away.
      return !(ly > y && påBanan(r, box));
    });
    // Nowhere free (a very crowded chart): the first spot inside the chart, overlapping.
    const vald = etikett(fri ?? iDiagrammet[0] ?? [...grundläge(s.läge, x, y), false]);
    placerade.push(vald);
  }
  return placerade;
}

// ---------- the chart on a phone ----------

/** Below this measured width (CSS px) the big chart draws in real pixels instead of scaling its viewBox down. */
export const TELEFON_BREDD = 600;

/** A star's invisible hit circle on a phone, in CSS px: 44 px across. */
export const TELEFON_TRÄFF = 22;

/** The phone box with `över` px of extra room above the grid for stacked labels. */
function telefonRuta(bredd: number, över: number): Ruta {
  const x0 = 16;
  const w = bredd - 2 * x0;
  // The big chart's proportions: the hill half as high as it is wide.
  const ht = Math.round(w / 2);
  const topp = 14 + över;
  const bas = topp + ht;
  // Under the baseline: ticks, the Läge numbers and the phase names.
  return { bredd, höjd: bas + 56, x0, w, bas, ht, topp, tecken: 7.3 };
}

/**
 * Whether every label is clear of the other labels and of the other stars'
 * cores, and sits beside or above its own star: in a phone's narrow hill a
 * label hung under its star lands between the slopes, far from it.
 */
function allaFria(etiketter: Etikett[], stjärnor: { id: string; läge: number }[], box: Ruta): boolean {
  return etiketter.every((a) => {
    const egen = stjärnor.find((s) => s.id === a.id);
    if (egen && a.ruta.y >= punkt(egen.läge, box)[1]) return false;
    return (
      etiketter.every((b) => a === b || !krockar(a.ruta, b.ruta)) &&
      stjärnor.every((s) => {
        if (s.id === a.id) return true;
        const [x, y] = punkt(s.läge, box);
        return !krockar(a.ruta, { x: x - 7, y: y - 7, b: 14, h: 14 });
      })
    );
  });
}

/**
 * The Hill chart on a phone (Q9 a, Q17 b): a box in real pixels at the
 * measured width, keeping grid and axis, with 13px labels. Every label is
 * shown: crowded ones stack with leader lines, and the box grows taller above
 * the grid, one label row at a time, until they all fit clear of each other.
 */
export function telefonDiagram(
  bredd: number,
  stjärnor: { id: string; läge: number; text: string }[],
): { ruta: Ruta; etiketter: Etikett[] } {
  let ruta = telefonRuta(bredd, 0);
  let etiketter = placeraEtiketter(stjärnor, ruta);
  for (let rader = 1; rader <= 20 && !allaFria(etiketter, stjärnor, ruta); rader++) {
    ruta = telefonRuta(bredd, rader * RAD);
    etiketter = placeraEtiketter(stjärnor, ruta);
  }
  return { ruta, etiketter };
}
