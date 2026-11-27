// Stable, readable URLs (#40): /f/<id>-<namn>, /p/<id>-<namn>, /person/<id>-<namn>.
// Only the id counts; ids never contain "-" (see ids.ts), so the id is
// everything before the first "-". The server redirects any other slug to the
// canonical URL these functions build, and the SPA links only to them.

export function slug(namn: string): string {
  return namn
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const withSlug = (id: string, namn: string) => {
  const s = slug(namn);
  return s ? `${id}-${s}` : id;
};

type Namngiven = { id: string; namn: string };

export const funktionsområdeHref = (fo: Namngiven) => `/f/${withSlug(fo.id, fo.namn)}`;
export const projektHref = (p: Namngiven) => `/p/${withSlug(p.id, p.namn)}`;
export const personHref = (p: Namngiven) => `/person/${withSlug(p.id, p.namn)}`;

/** The id in a path segment like `<id>-<namn>`; the name part is ignored. */
export function idFrånSegment(segment: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }
  return decoded.split("-")[0] ?? "";
}
