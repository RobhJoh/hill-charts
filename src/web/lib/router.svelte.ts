// A small client router: the current route is derived from location.pathname,
// internal links are intercepted and pushed onto history.
import { idFrånSegment } from "./links.js";

export type Route =
  | { sida: "start" }
  | { sida: "funktionsområde"; id: string }
  | { sida: "projekt"; id: string }
  | { sida: "personer" }
  | { sida: "person"; id: string }
  | { sida: "mina" }
  | { sida: "saknas" };

export function parse(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return { sida: "start" };
  if (parts.length === 2 && parts[0] === "f") return { sida: "funktionsområde", id: idFrånSegment(parts[1]!) };
  if (parts.length === 2 && parts[0] === "p") return { sida: "projekt", id: idFrånSegment(parts[1]!) };
  if (parts.length === 2 && parts[0] === "person") return { sida: "person", id: idFrånSegment(parts[1]!) };
  if (parts.length === 1 && parts[0] === "mina") return { sida: "mina" };
  // Inställningar holds only Personer in v1.
  if (parts[0] === "installningar" && (parts.length === 1 || (parts.length === 2 && parts[1] === "personer"))) {
    return { sida: "personer" };
  }
  return { sida: "saknas" };
}

let pathname = $state(location.pathname);

export const router = {
  get route(): Route {
    return parse(pathname);
  },
  navigate(href: string, { replace = false } = {}) {
    const url = new URL(href, location.href);
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    pathname = url.pathname;
    window.scrollTo(0, 0);
  },
};

addEventListener("popstate", () => {
  pathname = location.pathname;
});

// Plain <a href="/..."> links navigate client-side.
addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const a = (event.target as Element | null)?.closest?.("a");
  if (!a || a.target || a.hasAttribute("download")) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  event.preventDefault();
  router.navigate(url.pathname + url.search + url.hash);
});
