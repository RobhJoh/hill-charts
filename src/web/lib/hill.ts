// Hill chart geometry and colour in the Stjärnatlas direction (see the
// prototype/stjarnatlas branch). Pure functions, shared by the Projekt chart,
// mini charts and, later, the embed and the Stjärnkarta.

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

/**
 * The embed's compact hill (prototype/embed): fills a `bredd` × `höjd` pixel
 * box with small margins, no grid, and 13px labels. The hill keeps a minimum
 * height, so a very low box still shows one.
 */
export function kompaktRuta(bredd: number, höjd: number): Ruta {
  const x0 = 18;
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

/** Colour stops of the spectral ramp: warm uphill, pale gold crest, blue-white downhill. */
export const RAMP: Record<Tema, readonly (readonly [number, string])[]> = {
  natt: [
    [0, "#ff7a4d"],
    [25, "#ffb36b"],
    [50, "#fff1c9"],
    [75, "#cfe0ff"],
    [100, "#8fb8ff"],
  ],
  dag: [
    [0, "#d9481f"],
    [25, "#e08a1e"],
    [50, "#c9a21a"],
    [75, "#5a86d6"],
    [100, "#2f5fc4"],
  ],
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** A Scope's colour, derived from its Läge (never stored): piecewise-linear RGB between stops. */
export function lägeFärg(läge: number, tema: Tema): string {
  const stops = RAMP[tema];
  const l = Math.min(100, Math.max(0, läge));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]!;
    const [b, cb] = stops[i + 1]!;
    if (l >= a && l <= b) {
      const t = (l - a) / (b - a);
      const A = rgb(ca);
      const B = rgb(cb);
      return "#" + A.map((v, k) => Math.round(v + (B[k]! - v) * t).toString(16).padStart(2, "0")).join("");
    }
  }
  return stops[stops.length - 1]![1];
}

/** CSS gradient for the legend bar. */
export const rampGradient = (tema: Tema) =>
  `linear-gradient(90deg, ${RAMP[tema].map(([l, c]) => `${c} ${l}%`).join(", ")})`;

/** Star radius by days since its Läge last changed: recent moves shine bigger. */
export function radie(dagar: number): number {
  if (dagar <= 1) return 9;
  if (dagar <= 6) return 7.5;
  return 5;
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

const RAD = 18;

function ruta(x: number, y: number, anchor: Etikett["anchor"], bredd: number) {
  const vänster = anchor === "start" ? x : anchor === "end" ? x - bredd : x - bredd / 2;
  return { x: vänster - 2, y: y - 14, b: bredd + 4, h: RAD };
}

const krockar = (a: Etikett["ruta"], b: Etikett["ruta"]) =>
  a.x < b.x + b.b && b.x < a.x + a.b && a.y < b.y + b.h && b.y < a.y + a.h;

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
    const kandidater: [number, number, Etikett["anchor"], boolean][] = [
      [...grundläge(s.läge, x, y), false],
      [x + 14, y - 12, "start", false],
      [x - 14, y - 12, "end", false],
      [x, y - 22, "middle", false],
      [x, y + 30, "middle", false],
    ];
    for (let k = 1; k <= 14; k++) {
      kandidater.push([x, y - 22 - RAD * k, "middle", true]);
      kandidater.push([x, y + 30 + RAD * k, "middle", true]);
    }
    const inom = (r: Etikett["ruta"]) => r.x >= 0 && r.x + r.b <= box.bredd && r.y >= 0 && r.y + r.h <= box.höjd;
    let vald: Etikett | undefined;
    for (const [lx, ly, anchor, långt] of kandidater) {
      const r = ruta(lx, ly, anchor, bredd);
      if (!inom(r) || placerade.some((p) => krockar(p.ruta, r)) || kärnor.some((k) => krockar(k, r))) continue;
      vald = { id: s.id, x: lx, y: ly, anchor, ruta: r };
      if (långt) {
        const ovan = ly < y;
        vald.ledare = { x1: x, y1: y + (ovan ? -10 : 10), x2: lx, y2: ovan ? r.y + r.h : r.y };
      }
      break;
    }
    // Nowhere free (a very crowded chart): fall back to the prototype's spot.
    if (!vald) {
      const [lx, ly, anchor] = grundläge(s.läge, x, y);
      vald = { id: s.id, x: lx, y: ly, anchor, ruta: ruta(lx, ly, anchor, bredd) };
    }
    placerade.push(vald);
  }
  return placerade;
}
