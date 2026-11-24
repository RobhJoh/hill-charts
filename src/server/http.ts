import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";
import { DomainError, type Apogee } from "../core/index.js";

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
};

export type RunningServer = {
  address: AddressInfo;
  close(): Promise<void>;
};

/** Starts the one Apogee process: JSON API plus the SPA. */
export async function startServer(options: ServerOptions): Promise<RunningServer> {
  const server = createServer(createHandler(options));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host ?? "127.0.0.1", resolve);
  });
  let closing: Promise<void> | undefined;
  return {
    address: server.address() as AddressInfo,
    close: () => (closing ??= closeServer(server)),
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

export function createHandler({ apogee, webDir }: ServerOptions) {
  const serialize = createWriteQueue();

  async function api(method: string, path: string, req: IncomingMessage): Promise<Reply> {
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent); // ["api", ...]
    const [, resource, id, sub, subId, ...rest] = parts;
    if (rest.length > 0) throw notFound();

    const vem = signaturFrån(req);

    if (resource === "projekt" && id !== undefined && sub !== undefined) {
      return projektDel(method, id, sub, subId, req, vem);
    }
    if (sub !== undefined) throw notFound();

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
   * A Projekt's Hill chart:
   *   GET    /api/projekt/:id/historik            its Uppdateringar, oldest first
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
    return { status, body: { fel: error.code, meddelande: error.message } };
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
  signatur: 403,
  krock: 409,
};

/** Sub-resources of a Projekt served by `historikDel`. */
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
