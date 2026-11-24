// Server side of the stable links (#40): /p/<id>-<namn>, /f/<id>-<namn> and
// /person/<id>-<namn>. Only the id counts. The server looks the id up so that
// a non-canonical slug redirects, an unknown or Raderad id is a real 404, and
// link previews get Open Graph tags; the SPA renders the page itself.
import {
  DomainError,
  funktionsområdeHref,
  idFrånSegment,
  personHref,
  projektHref,
  type Apogee,
} from "../core/index.js";

/** What a page URL points at, as far as the server needs to know. */
export type Sida =
  | { finns: false }
  | {
      finns: true;
      /** The canonical path (current name). */
      href: string;
      namn: string;
      /** The Open Graph description. */
      beskrivning: string;
      /** Borttagen: the SPA shows the "borttaget" page, with no chart. */
      borttagen: boolean;
    };

/** What a Borttagen page says (the SPA shows the same words). */
export const BORTTAGET = {
  projekt: "Projektet är borttaget",
  funktionsområde: "Funktionsområdet är borttaget",
  /** In the Notion embed, where the page around it gives no context. */
  embed: "Det här Projektet är borttaget",
} as const;

/** The static link-preview image, served from the SPA's public files. */
export const OG_BILD = "/og.png";

const SLAG = ["p", "f", "person"] as const;
type Slag = (typeof SLAG)[number];

/**
 * The kind and id of a page path, or undefined if it is no such page.
 * `embed` marks a Projekt's Notion embed, `/p/<id>-<namn>/embed` (#43).
 */
export function sidaFrånPath(path: string): { slag: Slag; id: string; embed: boolean } | undefined {
  const parts = path.split("/").filter(Boolean);
  const embed = parts.length === 3 && parts[0] === "p" && parts[2] === "embed";
  if (parts.length !== 2 && !embed) return undefined;
  const slag = SLAG.find((s) => s === parts[0]);
  if (!slag) return undefined;
  return { slag, id: idFrånSegment(parts[1]!), embed };
}

export async function slåUpp(apogee: Apogee, slag: Slag, id: string): Promise<Sida> {
  try {
    if (slag === "p") {
      const p = await apogee.getProjekt(id);
      return {
        finns: true,
        href: projektHref(p),
        namn: p.namn,
        beskrivning: p.borttagen ? BORTTAGET.projekt : `Projekt i ${p.funktionsområde.namn}`,
        borttagen: !!p.borttagen,
      };
    }
    if (slag === "f") {
      const fo = await apogee.getFunktionsområde(id);
      return {
        finns: true,
        href: funktionsområdeHref(fo),
        namn: fo.namn,
        beskrivning: fo.borttagen ? BORTTAGET.funktionsområde : `Funktionsområde · ${fo.projekt.length} Projekt`,
        borttagen: !!fo.borttagen,
      };
    }
    const person = (await apogee.listPersoner()).find((p) => p.id === id);
    if (!person) return { finns: false };
    return { finns: true, href: personHref(person), namn: person.namn, beskrivning: "Person i Apogee", borttagen: false };
  } catch (error) {
    if (error instanceof DomainError && error.code === "finns-inte") return { finns: false };
    throw error;
  }
}

/**
 * The SPA's index.html with the page's own title and Open Graph tags.
 * `origin` makes the og:url and og:image absolute, as link previews need.
 * The embed gets a title only: Notion (via Iframely) could turn Open Graph
 * tags into a link card instead of framing the page.
 */
export function medHuvud(index: string, sida: Sida, origin: string, { embed = false } = {}): string {
  if (!sida.finns) return medTitel(index, "Finns inte längre · Apogee", "");
  if (embed) return medTitel(index, `${sida.borttagen ? BORTTAGET.embed : sida.namn} · Apogee`, "");
  const meta = (property: string, content: string) =>
    `<meta property="${property}" content="${escapeHtml(content)}">`;
  const taggar = [
    meta("og:type", "website"),
    meta("og:site_name", "Apogee"),
    meta("og:title", sida.namn),
    meta("og:description", sida.beskrivning),
    meta("og:url", origin + sida.href),
    meta("og:image", origin + OG_BILD),
    `<meta name="twitter:card" content="summary_large_image">`,
  ];
  return medTitel(index, `${sida.borttagen ? sida.beskrivning : sida.namn} · Apogee`, taggar.join("\n    "));
}

function medTitel(index: string, titel: string, taggar: string): string {
  const huvud = `<title>${escapeHtml(titel)}</title>${taggar ? "\n    " + taggar : ""}`;
  return index.replace(/<title>[^<]*<\/title>/, () => huvud);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
