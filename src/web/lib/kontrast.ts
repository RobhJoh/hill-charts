// WCAG 2 contrast between two hex colours, and a reader for the theme tokens
// in app.css, so the contrast rules in DESIGN.md are checked by tests.

function kanaler(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function luminans(hex: string): number {
  const [r, g, b] = kanaler(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio, 1 to 21, independent of order. */
export function kontrast(a: string, b: string): number {
  const [hi, lo] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function block(css: string, selektor: string): Record<string, string> {
  const start = css.indexOf(selektor + " {");
  if (start < 0) return {};
  const kropp = css.slice(start, css.indexOf("}", start));
  const ut: Record<string, string> = {};
  for (const [, namn, värde] of kropp.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) ut[namn!] = värde!.trim();
  return ut;
}

/** The custom properties of a theme: `:root` for natt, with the dag overrides on top. */
export function tokens(css: string, tema: "natt" | "dag"): Record<string, string> {
  const natt = block(css, ":root");
  return tema === "natt" ? natt : { ...natt, ...block(css, ':root[data-theme="dag"]') };
}
