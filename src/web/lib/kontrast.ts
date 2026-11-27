// A reader for the theme tokens in app.css, so the contrast rules in
// DESIGN.md are checked by tests. The contrast maths is `kontrast` in farg.ts.

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
