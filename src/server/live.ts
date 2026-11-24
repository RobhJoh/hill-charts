import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { DomainError, type Apogee, type ProjektId, type Uppdatering } from "../core/index.js";

/**
 * Live sync of the open Hill chart (#36). A client subscribes to one Projekt
 * with a WebSocket on `/api/projekt/:id/live`; every Uppdatering written to
 * that Projekt's Historik, by any command, is sent to its subscribers only.
 * The socket is one-way: writes stay plain HTTP. On (re)connect the client
 * re-fetches state itself, so nothing is replayed here.
 */
export type LiveMeddelande = { typ: "uppdatering"; projektId: ProjektId; uppdatering: Uppdatering };

const LIVE_PATH = /^\/api\/projekt\/([^/]+)\/live$/;
/** Ping interval: keeps idle sockets open through proxies and finds dead ones. */
const PING_MS = 30_000;

export function attachLive(server: Server, apogee: Apogee, headers: Record<string, string>) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const rum = new Map<ProjektId, Set<WebSocket>>();
  const levande = new WeakSet<WebSocket>();

  const sluta = apogee.påUppdatering((projektId, uppdatering) => {
    const mottagare = rum.get(projektId);
    if (!mottagare) return;
    const data = JSON.stringify({ typ: "uppdatering", projektId, uppdatering } satisfies LiveMeddelande);
    for (const ws of mottagare) if (ws.readyState === ws.OPEN) ws.send(data);
  });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    void uppgradera(req, socket, head);
  });

  async function uppgradera(req: IncomingMessage, socket: Duplex, head: Buffer) {
    socket.on("error", () => socket.destroy());
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const träff = LIVE_PATH.exec(path);
    let projektId: string;
    try {
      if (!träff) return avvisa(socket, 404, "Not Found", headers);
      projektId = decodeURIComponent(träff[1]!);
      await apogee.getProjekt(projektId);
    } catch (error) {
      if (error instanceof DomainError && error.code === "finns-inte") {
        return avvisa(socket, 404, "Not Found", headers);
      }
      console.error(error);
      return avvisa(socket, 500, "Internal Server Error", headers);
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      let mottagare = rum.get(projektId);
      if (!mottagare) rum.set(projektId, (mottagare = new Set()));
      mottagare.add(ws);
      levande.add(ws);
      ws.on("pong", () => levande.add(ws));
      ws.on("error", () => ws.terminate());
      ws.on("close", () => {
        mottagare.delete(ws);
        if (mottagare.size === 0) rum.delete(projektId);
      });
    });
  }

  const pingare = setInterval(() => {
    for (const ws of wss.clients) {
      if (!levande.has(ws)) {
        ws.terminate();
        continue;
      }
      levande.delete(ws);
      ws.ping();
    }
  }, PING_MS);
  pingare.unref();

  return {
    /** Drops every subscriber; used when the server closes. */
    close() {
      clearInterval(pingare);
      sluta();
      for (const ws of wss.clients) ws.terminate();
      wss.close();
    },
  };
}

function avvisa(socket: Duplex, status: number, text: string, headers: Record<string, string>) {
  const rader = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
  socket.end([`HTTP/1.1 ${status} ${text}`, "Connection: close", "Content-Length: 0", ...rader, "", ""].join("\r\n"));
}
