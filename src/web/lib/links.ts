// Flat, readable URLs: /f/<id>-<namn>, /p/<id>-<namn> and /person/<id>-<namn>. Only the id counts;
// ids never contain "-" (see core/ids.ts), so the id is everything before the
// first "-". Canonical-slug redirects arrive with the "Stable links" ticket.

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

export const funktionsområdeHref = (fo: { id: string; namn: string }) => `/f/${withSlug(fo.id, fo.namn)}`;
export const projektHref = (p: { id: string; namn: string }) => `/p/${withSlug(p.id, p.namn)}`;
/** A Person's Stjärnkarta. */
export const personHref = (p: { id: string; namn: string }) => `/person/${withSlug(p.id, p.namn)}`;

export const idFrånSegment = (segment: string) => decodeURIComponent(segment).split("-")[0] ?? "";
