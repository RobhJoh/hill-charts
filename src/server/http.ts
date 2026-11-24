import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";
import { DomainError, type Apogee, type DatumInput, type Mål } from "../core/index.js";
import { attachLive } from "./live.js";
import { medHuvud, sidaFrånPath, slåUpp } from "./sidor.js";

/**
 * Every response carries these (ADR 0002): stay out of search engines, leak no
 * referrer, and allow Notion to frame the site. Never send X-Frame-Options.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "frame-ancestors 'self' https://www.notion.so https://*.notion.so https://*.notion.site https://*.notion.com https://embed.notion.co",
};

const MAX_BODY_BYTES = 64 * 1024;

const ROBOTS_TXT = Buffer.from("User-agent: *\nAllow: /\n");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

export type ServerOptions = {
  apogee: Apogee;
  /** Directory holding the built SPA (index.html and assets). */
  webDir: string;
  port: number;
  host?: string;
  /**
   * The public origin, e.g. "https://apogeechart.com", for absolute URLs in
   * Open Graph tags. Without it the request's Host (and X-Forwarded-Proto) is used.
   */
  publicUrl?: string;
};

export type RunningServer = {
  address: AddressInfo;
  close(): Promise<void>;
};

/** Starts the one Apogee process: JSON API plus the SPA. */
export async function startServer(options: ServerOptions): Promise<RunningServer> {
  const server = createServer(createHandler(options));
  const live = attachLive(server, options.apogee, SECURITY_HEADERS);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host ?? "127.0.0.1", resolve);
  });
  let closing: Promise<void> | undefined;
  return {
    address: server.address() as AddressInfo,
    close: () => {
      live.close();
      return (closing ??= closeServer(server));
    },
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly fel: string,
    message: string,
  ) {
    super(message);
  }
}

type Reply = { status: number; body?: unknown };

export function createHandler({ apogee, webDir, publicUrl }: ServerOptions) {
  const serialize = createWriteQueue();

  async function api(method: string, path: string, req: IncomingMessage): Promise<Reply> {
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent); // ["api", ...]
    const [, resource, id, sub, subId, ...rest] = parts;
    if (rest.length > 0) throw notFound();

    const vem = signaturFrån(req);

    if (id !== undefined && sub !== undefined && TIDSPLAN_DELAR.has(sub)) {
      if (resource === "projekt") return tidsplanDel(method, { projekt: id }, sub, subId, req, vem);
      if (resource === "funktionsomraden") return tidsplanDel(method, { funktionsområde: id }, sub, subId, req, vem);
    }
    // Ta bort (POST) and Återställ (DELETE) a Projekt or Funktionsområde.
    if (
      (resource === "projekt" || resource === "funktionsomraden") &&
      id !== undefined &&
      sub === "borttagen" &&
      subId === undefined &&
      (method === "POST" || method === "DELETE")
    ) {
      await serialize(() =>
        resource === "projekt"
          ? method === "POST"
            ? apogee.taBortProjekt(id, vem)
            : apogee.återställProjekt(id, vem)
          : method === "POST"
            ? apogee.taBortFunktionsområde(id, vem)
            : apogee.återställFunktionsområde(id, vem),
      );
      return { status: 204 };
    }
    if (resource === "projekt" && id !== undefined && sub !== undefined) {
      return projektDel(method, id, sub, subId, req, vem);
    }
    if (resource === "personer" && id !== undefined) return personDel(method, id, sub, subId, req, vem);
    if (sub !== undefined) throw notFound();

    // Radera a Borttagen Projekt or Funktionsområde: { namn } typed to confirm.
    if ((resource === "projekt" || resource === "funktionsomraden") && id !== undefined && method === "DELETE") {
      const namn = text((await readJson(req)).namn);
      await serialize(() =>
        resource === "projekt" ? apogee.raderaProjekt(id, namn, vem) : apogee.raderaFunktionsområde(id, namn, vem),
      );
      return { status: 204 };
    }
    if (method === "GET" && resource === "borttagna" && id === undefined) {
      return { status: 200, body: await apogee.borttagnaFunktionsområden() };
    }

    if (resource === "personer" && id === undefined) {
      if (method === "GET") return { status: 200, body: await apogee.listPersoner() };
      if (method === "POST") {
        const body = await readJson(req);
        const person = await serialize(() => apogee.createPerson(text(body.namn), vem));
        return { status: 201, body: person };
      }
    }
    if (method === "GET" && resource === "oversikt" && id === undefined) {
      return { status: 200, body: await apogee.overview() };
    }
    if (resource === "funktionsomraden") {
      if (method === "GET" && id !== undefined) {
        return { status: 200, body: await apogee.getFunktionsområde(id) };
      }
      if (method === "POST" && id === undefined) {
        const body = await readJson(req);
        const fo = await serialize(() => apogee.createFunktionsområde(text(body.namn), vem));
        return { status: 201, body: fo };
      }
      if (method === "PATCH" && id !== undefined) {
        const body = await readJson(req);
        await serialize(() => apogee.renameFunktionsområde(id, text(body.namn), vem));
        return { status: 204 };
      }
    }
    if (resource === "projekt") {
      if (method === "GET" && id !== undefined) {
        return { status: 200, body: await apogee.getProjekt(id) };
      }
      if (method === "POST" && id === undefined) {
        const body = await readJson(req);
        const p = await serialize(() =>
          apogee.createProjekt(text(body.funktionsområdeId), text(body.namn), vem),
        );
        return { status: 201, body: p };
      }
      if (method === "PATCH" && id !== undefined) {
        const body = await readJson(req);
        await serialize(async () => {
          if (body.namn !== undefined) await apogee.renameProjekt(id, text(body.namn), vem);
          if (body.funktionsområdeId !== undefined) {
            await apogee.moveProjekt(id, text(body.funktionsområdeId), vem);
          }
        });
        return { status: 204 };
      }
    }
    throw notFound();
  }

  /**
   * Managing Personer:
   *   GET    /api/personer/historik               the Personer-historik, oldest first
   *   GET    /api/personer/oversikt               the Personer index → PersonRad[]
   *   GET    /api/personer/:id/stjarnkarta        → StjärnkartaVy (404 when inaktiv)
   *   PATCH  /api/personer/:id                    { namn } → 200 Person
   *   DELETE /api/personer/:id                    { nyÄgare } → 200 { uppdateringar } (handover; inaktiv)
   *   POST   /api/personer/:id/ateraktivera       → 200 Person
   */
  async function personDel(
    method: string,
    id: string,
    sub: string | undefined,
    subId: string | undefined,
    req: IncomingMessage,
    vem: string | null,
  ): Promise<Reply> {
    if (subId !== undefined) throw notFound();
    if (sub === undefined && id === "historik" && method === "GET") {
      return { status: 200, body: await apogee.personerHistorik() };
    }
    if (sub === undefined && id === "oversikt" && method === "GET") {
      return { status: 200, body: await apogee.personerÖversikt() };
    }
    if (sub === "stjarnkarta" && method === "GET") {
      return { status: 200, body: await apogee.stjärnkarta(id) };
    }
    if (sub === undefined && method === "PATCH") {
      const body = await readJson(req);
      return { status: 200, body: await serialize(() => apogee.renamePerson(id, text(body.namn), vem)) };
    }
    if (sub === undefined && method === "DELETE") {
      const body = await readJson(req);
      const uppdateringar = await serialize(() => apogee.removePerson(id, text(body.nyÄgare), vem));
      return { status: 200, body: { uppdateringar } };
    }
    if (sub === "ateraktivera" && method === "POST") {
      return { status: 200, body: await serialize(() => apogee.reactivatePerson(id, vem)) };
    }
    throw notFound();
  }

  /**
   * A Projekt's Hill chart (Ta bort/Återställ at /api/projekt/:id/borttagen is handled in `api`):
   *   GET    /api/projekt/:id/historik            its Uppdateringar, oldest first
   *   POST   /api/projekt/:id/avslutat            mark Avslutat → 200 { uppdatering } (null if already)
   *   DELETE /api/projekt/:id/avslutat            "Öppna igen" → 200 { uppdatering } (null if not marked)
   *   POST   /api/projekt/:id/scopes              { namn, ägare } → 201 { id, uppdatering }
   *   PATCH  /api/projekt/:id/scopes/:scopeId     exactly one of { läge } | { namn } | { ägare }
   *                                                → 200 { uppdatering } (null if nothing changed)
   *   DELETE /api/projekt/:id/scopes/:scopeId     → 200 { uppdatering }
   */
  async function projektDel(
    method: string,
    projektId: string,
    sub: string,
    scopeId: string | undefined,
    req: IncomingMessage,
    vem: string | null,
  ): Promise<Reply> {
    if (sub === "historik" && scopeId === undefined && method === "GET") {
      return { status: 200, body: await apogee.historik(projektId) };
    }
    if (HISTORIK_DELAR.has(sub)) return historikDel(method, projektId, sub, scopeId, req, vem);
    if (sub === "avslutat" && scopeId === undefined && (method === "POST" || method === "DELETE")) {
      const uppdatering = await serialize(() =>
        method === "POST" ? apogee.markAvslutat(projektId, vem) : apogee.reopenProjekt(projektId, vem),
      );
      return { status: 200, body: { uppdatering } };
    }
    if (sub !== "scopes") throw notFound();
    if (scopeId === undefined && method === "POST") {
      const body = await readJson(req);
      const ny = await serialize(() =>
        apogee.addScope(projektId, { namn: text(body.namn), ägare: text(body.ägare) }, vem),
      );
      return { status: 201, body: ny };
    }
    if (scopeId !== undefined && method === "PATCH") {
      const body = await readJson(req);
      const fält = (["läge", "namn", "ägare"] as const).filter((k) => body[k] !== undefined);
      if (fält.length !== 1) {
        throw new HttpError(400, "ogiltig", "Ändra precis ett av läge, namn och ägare");
      }
      const uppdatering = await serialize(() => {
        switch (fält[0]) {
          case "läge":
            return apogee.moveScope(projektId, scopeId, number(body.läge), vem);
          case "namn":
            return apogee.renameScope(projektId, scopeId, text(body.namn), vem);
          default:
            return apogee.changeScopeÄgare(projektId, scopeId, text(body.ägare), vem);
        }
      });
      return { status: 200, body: { uppdatering } };
    }
    if (scopeId !== undefined && method === "DELETE") {
      const uppdatering = await serialize(() => apogee.removeScope(projektId, scopeId, vem));
      return { status: 200, body: { uppdatering } };
    }
    throw notFound();
  }

  /**
   * A Projekt's Historik panel (#35):
   *   GET  /api/projekt/:id/historikvy             rows newest first, drags merged → HistorikRad[]
   *   GET  /api/projekt/:id/historik/:uppdatering  Visa → { scopes, skiljer }
   *   POST /api/projekt/:id/aterstallning          { mål } → 200 { uppdatering } (null if nothing to do)
   *   POST /api/projekt/:id/angra                  { mål } → 200 { uppdatering }; 409 krock if blocked
   */
  async function historikDel(
    method: string,
    projektId: string,
    sub: string,
    subId: string | undefined,
    req: IncomingMessage,
    vem: string | null,
  ): Promise<Reply> {
    if (sub === "historikvy" && subId === undefined && method === "GET") {
      return { status: 200, body: await apogee.historikVy(projektId) };
    }
    if (sub === "historik" && subId !== undefined && method === "GET") {
      return { status: 200, body: await apogee.förhandsvisa(projektId, subId) };
    }
    if ((sub === "aterstallning" || sub === "angra") && subId === undefined && method === "POST") {
      const mål = text((await readJson(req)).mål);
      const uppdatering = await serialize(() =>
        sub === "angra" ? apogee.ångra(projektId, mål, vem) : apogee.återställHit(projektId, mål, vem),
      );
      return { status: 200, body: { uppdatering } };
    }
    throw notFound();
  }

  /**
   * Dates and Milstolpar of a Projekt (Uppdateringar) or Funktionsområde
   * (saved without Historik; `uppdatering` is always null):
   *   PUT    /api/{projekt|funktionsomraden}/:id/datum                  DatumInput → 200 { uppdatering }
   *   POST   /api/{projekt|funktionsomraden}/:id/milstolpar             { namn, datum } → 201 { id, uppdatering }
   *   PATCH  /api/{projekt|funktionsomraden}/:id/milstolpar/:mid        { namn?, datum? } → 200 { uppdatering }
   *   DELETE /api/{projekt|funktionsomraden}/:id/milstolpar/:mid        → 200 { uppdatering }
   */
  async function tidsplanDel(
    method: string,
    mål: Mål,
    sub: string,
    subId: string | undefined,
    req: IncomingMessage,
    vem: string | null,
  ): Promise<Reply> {
    if (sub === "datum" && subId === undefined && method === "PUT") {
      const input = datumInput(await readJson(req));
      const uppdatering = await serialize(() => apogee.setDatum(mål, input, vem));
      return { status: 200, body: { uppdatering } };
    }
    if (sub !== "milstolpar") throw notFound();
    if (subId === undefined && method === "POST") {
      const body = await readJson(req);
      const ny = await serialize(() => apogee.addMilstolpe(mål, { namn: text(body.namn), datum: text(body.datum) }, vem));
      return { status: 201, body: ny };
    }
    if (subId !== undefined && method === "PATCH") {
      const body = await readJson(req);
      const ändring = {
        ...(body.namn !== undefined && { namn: text(body.namn) }),
        ...(body.datum !== undefined && { datum: text(body.datum) }),
      };
      const uppdatering = await serialize(() => apogee.changeMilstolpe(mål, subId, ändring, vem));
      return { status: 200, body: { uppdatering } };
    }
    if (subId !== undefined && method === "DELETE") {
      const uppdatering = await serialize(() => apogee.removeMilstolpe(mål, subId, vem));
      return { status: 200, body: { uppdatering } };
    }
    throw notFound();
  }

  async function web(path: string): Promise<{ file: string; type: string }> {
    const index = { file: join(webDir, "index.html"), type: CONTENT_TYPES[".html"]! };
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return index;
    }
    const file = normalize(join(webDir, decoded));
    if (!file.startsWith(normalize(webDir) + sep)) return index;
    const info = await stat(file).catch(() => undefined);
    if (!info?.isFile()) return index;
    return { file, type: CONTENT_TYPES[extname(file)] ?? "application/octet-stream" };
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    const method = req.method ?? "GET";
    const path = new URL(req.url ?? "/", "http://localhost").pathname;

    try {
      if (path === "/api" || path.startsWith("/api/")) {
        const reply = await api(method, path, req);
        sendJson(res, reply.status, reply.body);
        return;
      }
      if (method !== "GET" && method !== "HEAD") throw new HttpError(405, "metod", "Metoden stöds inte");
      if (path === "/robots.txt") {
        // No Disallow (ADR 0002): crawlers may fetch pages and then obey X-Robots-Tag.
        res.writeHead(200, { "Content-Type": CONTENT_TYPES[".txt"]!, "Content-Length": ROBOTS_TXT.length });
        res.end(method === "HEAD" ? undefined : ROBOTS_TXT);
        return;
      }
      const sida = sidaFrånPath(path);
      if (sida) {
        const svar = await slåUpp(apogee, sida.slag, sida.id);
        const href = svar.finns ? svar.href + (sida.embed ? "/embed" : "") : undefined;
        if (href !== undefined && href !== path) {
          const search = new URL(req.url ?? "/", "http://localhost").search;
          res.writeHead(302, { Location: href + search, "Cache-Control": "no-store" });
          res.end();
          return;
        }
        const index = await readFile(join(webDir, "index.html"), "utf8");
        const html = Buffer.from(medHuvud(index, svar, publicUrl?.replace(/\/+$/, "") ?? origin(req), sida));
        res.writeHead(svar.finns ? 200 : 404, {
          "Content-Type": CONTENT_TYPES[".html"]!,
          "Content-Length": html.length,
          "Cache-Control": "no-store",
        });
        res.end(method === "HEAD" ? undefined : html);
        return;
      }
      const { file, type } = await web(path);
      const content = await readFile(file);
      res.writeHead(200, { "Content-Type": type, "Content-Length": content.length });
      res.end(method === "HEAD" ? undefined : content);
    } catch (error) {
      const { status, body } = errorReply(error);
      if (status === 500) console.error(error);
      if (!res.headersSent) sendJson(res, status, body);
      else res.end();
    }
  };
}

function errorReply(error: unknown): Reply {
  if (error instanceof HttpError) {
    return { status: error.status, body: { fel: error.fel, meddelande: error.message } };
  }
  if (error instanceof DomainError) {
    const status = DOMAIN_STATUS[error.code];
    const person = error.person ? { person: error.person } : {};
    return { status, body: { fel: error.code, meddelande: error.message, ...person } };
  }
  return { status: 500, body: { fel: "serverfel", meddelande: "Något gick fel" } };
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  if (body === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

/** HTTP status per domain error code. */
const DOMAIN_STATUS: Record<DomainError["code"], number> = {
  "finns-inte": 404,
  ogiltig: 400,
  "finns-redan": 409,
  "finns-inaktiv": 409,
  signatur: 403,
  krock: 409,
};

/** Sub-resources of a Projekt served by `historikDel`. */
const TIDSPLAN_DELAR = new Set(["datum", "milstolpar"]);

/** `{ startdatum, slutdatum }` (each a date or null), `{ startdatum, veckor }` or `{ startdatum, behållAppetit: true }`. */
function datumInput(body: Record<string, unknown>): DatumInput {
  if (body.veckor !== undefined) return { startdatum: text(body.startdatum), veckor: number(body.veckor) };
  if (body.behållAppetit === true) return { startdatum: text(body.startdatum), behållAppetit: true };
  const datumEllerNull = (v: unknown) => (v === null ? null : text(v));
  return { startdatum: datumEllerNull(body.startdatum), slutdatum: datumEllerNull(body.slutdatum) };
}

const HISTORIK_DELAR = new Set(["historik", "historikvy", "aterstallning", "angra"]);

/**
 * The Signatur of a write: the signing Person's id, sent in the
 * `Apogee-Signatur` header. The core decides whether it is valid.
 */
export const SIGNATUR_HEADER = "apogee-signatur";

function signaturFrån(req: IncomingMessage): string | null {
  const value = req.headers[SIGNATUR_HEADER];
  return typeof value === "string" && value !== "" ? value : null;
}

/** The origin the client used, as far as the request (and a proxy) tells. */
function origin(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-proto"];
  const proto = typeof forwarded === "string" && forwarded.split(",")[0]!.trim() === "https" ? "https" : "http";
  return `${proto}://${req.headers.host ?? "localhost"}`;
}

const notFound = () => new HttpError(404, "finns-inte", "Finns inte");

/** A required string field; anything else is a 400. */
function text(value: unknown): string {
  if (typeof value !== "string") throw new HttpError(400, "ogiltig", "Ett textfält saknas");
  return value;
}

/** A required number field; anything else is a 400. */
function number(value: unknown): number {
  if (typeof value !== "number") throw new HttpError(400, "ogiltig", "Ett talfält saknas");
  return value;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "for-stor", "För stor begäran");
    chunks.push(chunk as Buffer);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "ogiltig", "Ogiltig JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "ogiltig", "Ogiltig JSON");
  }
  return parsed as Record<string, unknown>;
}

/**
 * Runs write commands one at a time, in arrival order (ADR 0001: one process
 * serializes all writes). A failed command does not block the ones after it.
 */
function createWriteQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function serialize<T>(command: () => Promise<T>): Promise<T> {
    const run = tail.then(command, command);
    tail = run.catch(() => undefined);
    return run;
  };
}
