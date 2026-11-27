import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { createApogee, type Uppdatering } from "../core/index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "../core/test-struktur.js";
import { följProjekt } from "../web/lib/live.js";
import { startServer, type RunningServer } from "./http.js";

const running: RunningServer[] = [];
const sockets: WebSocket[] = [];
afterEach(async () => {
  for (const s of sockets.splice(0)) s.terminate();
  await Promise.all(running.splice(0).map((s) => s.close()));
});

/** A server with one Person and two Projekt, `a` and `b`. */
async function start() {
  let n = 0;
  const storage = createMemoryStorage();
  const källa = createMemoryNotion();
  const apogee = createApogee({
    storage,
    notion: källa,
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
  const dir = await mkdtemp(join(tmpdir(), "apogee-web-"));
  await writeFile(join(dir, "index.html"), "<!doctype html><title>Apogee</title>");
  const server = await startServer({ apogee, webDir: dir, port: 0 });
  running.push(server);
  const host = `127.0.0.1:${server.address.port}`;
  const vem = (await apogee.createPerson("Anna", null)).id;
  const notion = notionStruktur(apogee, källa, storage);
  const a = await notion.projekt("Alfa", "Kassa");
  const b = await notion.projekt("Beta", "Kassa");

  const api = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`http://${host}${path}`, {
      method,
      headers: { "content-type": "application/json", "apogee-signatur": vem },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  };

  /** Subscribes to one Projekt; collects every message it is sent. */
  const följ = async (projektId: string) => {
    const ws = new WebSocket(`ws://${host}/api/projekt/${projektId}/live`);
    sockets.push(ws);
    const meddelanden: unknown[] = [];
    ws.on("message", (data) => meddelanden.push(JSON.parse(String(data))));
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    return { ws, meddelanden };
  };

  return { api, följ, vem, a, b, apogee, server, host };
}

const tills = async (villkor: () => boolean, ms = 2000) => {
  const slut = Date.now() + ms;
  while (!villkor()) {
    if (Date.now() > slut) throw new Error("Timeout");
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe("Live sync of the open Hill chart", () => {
  it("broadcasts an accepted Uppdatering to subscribers of that Projekt only", async () => {
    const { api, följ, vem, a, b } = await start();
    const påA1 = await följ(a);
    const påA2 = await följ(a);
    const påB = await följ(b);

    const ny = await api("POST", `/api/projekt/${a}/scopes`, { namn: "Betalning", ägare: vem });
    expect(ny.status).toBe(201);

    const väntat = { typ: "uppdatering", projektId: a, uppdatering: ny.body.uppdatering };
    await tills(() => påA1.meddelanden.length > 0 && påA2.meddelanden.length > 0);
    expect(påA1.meddelanden).toEqual([väntat]);
    expect(påA2.meddelanden).toEqual([väntat]);
    // Give a stray broadcast time to arrive before asserting there was none.
    await new Promise((r) => setTimeout(r, 50));
    expect(påB.meddelanden).toEqual([]);
  });

  it("broadcasts every write command, and nothing when a command changes nothing", async () => {
    const { api, följ, vem, a } = await start();
    const ny = await api("POST", `/api/projekt/${a}/scopes`, { namn: "Betalning", ägare: vem });
    const scope = `/api/projekt/${a}/scopes/${ny.body.id}`;
    const påA = await följ(a);

    const flytt = await api("PATCH", scope, { läge: 40 });
    const oförändrad = await api("PATCH", scope, { läge: 40 });
    expect(oförändrad.body).toEqual({ uppdatering: null });
    const bort = await api("DELETE", scope);

    await tills(() => påA.meddelanden.length >= 2);
    await new Promise((r) => setTimeout(r, 50));
    expect(påA.meddelanden).toEqual([
      { typ: "uppdatering", projektId: a, uppdatering: flytt.body.uppdatering },
      { typ: "uppdatering", projektId: a, uppdatering: bort.body.uppdatering },
    ]);
  });

  it("refuses to subscribe to a Projekt that does not exist", async () => {
    const { följ } = await start();
    await expect(följ("finnsinte")).rejects.toThrow(/404/);
  });

  it("the client re-fetches on connect, on each Uppdatering, and catches up after a dropped connection", async () => {
    const { api, apogee, vem, a, server, host } = await start();
    const ny = await api("POST", `/api/projekt/${a}/scopes`, { namn: "Betalning", ägare: vem });
    let hämtningar = 0;
    let senast: unknown;
    const hämta = async () => {
      hämtningar++;
      senast = (await api("GET", `/api/projekt/${a}`)).body.scopes.map((s: { läge: number }) => s.läge);
    };
    const följ = följProjekt(`ws://${host}/api/projekt/${a}/live`, {
      onÄndring: () => void hämta(),
      WebSocket: WebSocket as unknown as typeof globalThis.WebSocket,
      väntaMs: () => 10,
    });
    try {
      await tills(() => hämtningar === 1); // on connect
      await api("PATCH", `/api/projekt/${a}/scopes/${ny.body.id}`, { läge: 30 });
      await tills(() => hämtningar === 2 && (senast as number[])[0] === 30);

      // Drop: the server goes away; an edit lands while this client is offline.
      const port = server.address.port;
      await server.close();
      await apogee.moveScope(a, ny.body.id, 70, vem);
      const dir = await mkdtemp(join(tmpdir(), "apogee-web-"));
      running.push(await startServer({ apogee, webDir: dir, port }));

      await tills(() => hämtningar === 3);
      await tills(() => (senast as number[])[0] === 70);
    } finally {
      följ.stäng();
    }
  });
});
