import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApogee } from "../core/index.js";
import type { Storage } from "../core/index.js";
import { createJsonFileStorage } from "../storage/json-file.js";
import { createMemoryStorage } from "../storage/memory.js";
import { startServer, type RunningServer } from "./http.js";

const running: RunningServer[] = [];
afterEach(async () => {
  await Promise.all(running.splice(0).map((s) => s.close()));
});

async function webDir() {
  const dir = await mkdtemp(join(tmpdir(), "apogee-web-"));
  await writeFile(join(dir, "index.html"), "<!doctype html><title>Apogee</title>");
  await writeFile(join(dir, "app.js"), "console.log('apogee')");
  return dir;
}

async function start(storage: Storage = createMemoryStorage()) {
  let n = 0;
  const apogee = createApogee({
    storage,
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
  const server = await startServer({ apogee, webDir: await webDir(), port: 0 });
  running.push(server);
  const base = `http://127.0.0.1:${(server.address as AddressInfo).port}`;

  const api = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : undefined };
  };
  return { base, api, server };
}

describe("JSON API", () => {
  it("creates, renames and moves Funktionsområden and Projekt", async () => {
    const { api } = await start();

    const ku = await api("POST", "/api/funktionsomraden", { namn: "Kundupplevelse" });
    expect(ku.status).toBe(201);
    const pl = await api("POST", "/api/funktionsomraden", { namn: "Plattfrom" });
    expect((await api("PATCH", `/api/funktionsomraden/${pl.body.id}`, { namn: "Plattform" })).status).toBe(204);

    const p = await api("POST", "/api/projekt", { funktionsområdeId: ku.body.id, namn: "Inlogning" });
    expect(p.status).toBe(201);
    expect((await api("PATCH", `/api/projekt/${p.body.id}`, { namn: "Inloggning" })).status).toBe(204);
    expect(
      (await api("PATCH", `/api/projekt/${p.body.id}`, { funktionsområdeId: pl.body.id })).status,
    ).toBe(204);

    expect((await api("GET", "/api/oversikt")).body).toEqual([
      { id: ku.body.id, namn: "Kundupplevelse", projekt: [] },
      { id: pl.body.id, namn: "Plattform", projekt: [{ id: p.body.id, namn: "Inloggning" }] },
    ]);
    expect((await api("GET", `/api/funktionsomraden/${pl.body.id}`)).body).toEqual({
      id: pl.body.id,
      namn: "Plattform",
      projekt: [{ id: p.body.id, namn: "Inloggning" }],
    });
    expect((await api("GET", `/api/projekt/${p.body.id}`)).body).toEqual({
      id: p.body.id,
      namn: "Inloggning",
      funktionsområde: { id: pl.body.id, namn: "Plattform" },
    });
  });

  it("answers 404 for unknown ids and routes, 400 for invalid input", async () => {
    const { api } = await start();
    expect((await api("GET", "/api/projekt/saknas")).status).toBe(404);
    expect((await api("GET", "/api/funktionsomraden/saknas")).status).toBe(404);
    expect((await api("GET", "/api/finns-inte")).status).toBe(404);
    expect((await api("POST", "/api/funktionsomraden", { namn: "  " })).status).toBe(400);
    expect((await api("POST", "/api/funktionsomraden", {})).status).toBe(400);
    const res = await api("POST", "/api/projekt", { funktionsområdeId: "saknas", namn: "X" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ fel: "finns-inte", meddelande: expect.any(String) });
  });

  it("rejects a body that is not JSON", async () => {
    const { base } = await start();
    const res = await fetch(`${base}/api/funktionsomraden`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{namn:",
    });
    expect(res.status).toBe(400);
  });

  it("serializes concurrent writes so none is lost", async () => {
    // Slow storage widens the window in which unserialized read-modify-write
    // commands would overwrite each other.
    const { api } = await start(createMemoryStorage({ latencyMs: 5 }));
    const namn = Array.from({ length: 20 }, (_, i) => `Område ${String(i).padStart(2, "0")}`);
    const results = await Promise.all(
      namn.map((n) => api("POST", "/api/funktionsomraden", { namn: n })),
    );
    expect(results.map((r) => r.status)).toEqual(namn.map(() => 201));
    expect((await api("GET", "/api/oversikt")).body.map((f: { namn: string }) => f.namn)).toEqual(namn);
  });

  it("keeps data across a restart when backed by JSON files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "apogee-data-"));
    const first = await start(createJsonFileStorage(dir));
    const fo = await first.api("POST", "/api/funktionsomraden", { namn: "Ekonomi" });
    await first.api("POST", "/api/projekt", { funktionsområdeId: fo.body.id, namn: "Fakturering" });
    await first.server.close();

    const second = await start(createJsonFileStorage(dir));
    expect((await second.api("GET", "/api/oversikt")).body).toEqual([
      { id: fo.body.id, namn: "Ekonomi", projekt: [{ id: expect.any(String), namn: "Fakturering" }] },
    ]);
  });
});

describe("the SPA", () => {
  it("serves index.html at the bare root and for every client route", async () => {
    const { base } = await start();
    for (const path of ["/", "/f/id1-ekonomi", "/p/id2-fakturering", "/okand/sida"]) {
      const res = await fetch(base + path);
      expect(res.status, path).toBe(200);
      expect(res.headers.get("content-type"), path).toMatch(/^text\/html/);
      expect(await res.text(), path).toContain("<title>Apogee</title>");
    }
  });

  it("serves built assets with their content type", async () => {
    const { base } = await start();
    const res = await fetch(`${base}/app.js`);
    expect(res.headers.get("content-type")).toMatch(/^text\/javascript/);
    expect(await res.text()).toBe("console.log('apogee')");
  });

  it("never serves files outside the web directory", async () => {
    const { base } = await start();
    const res = await fetch(`${base}/..%2Fpackage.json`);
    expect(await res.text()).toContain("<title>Apogee</title>");
  });
});

describe("headers on every response (ADR 0002)", () => {
  it("are noindex, no-referrer, framable by Notion, and never X-Frame-Options", async () => {
    const { base, api } = await start();
    const fo = await api("POST", "/api/funktionsomraden", { namn: "Ekonomi" });
    const responses = [
      await fetch(`${base}/`),
      await fetch(`${base}/p/x-y`),
      await fetch(`${base}/app.js`),
      await fetch(`${base}/api/oversikt`),
      await fetch(`${base}/api/projekt/saknas`),
      await fetch(`${base}/api/finns-inte`),
      await fetch(`${base}/api/funktionsomraden`, { method: "POST", body: "nope" }),
      await fetch(`${base}/api/funktionsomraden/${fo.body.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ namn: "Ekonomi 2" }),
      }),
    ];
    for (const res of responses) {
      const where = `${res.status} ${res.url}`;
      expect(res.headers.get("x-robots-tag"), where).toBe("noindex, nofollow");
      expect(res.headers.get("referrer-policy"), where).toBe("no-referrer");
      expect(res.headers.get("content-security-policy"), where).toMatch(
        /frame-ancestors [^;]*https:\/\/www\.notion\.so/,
      );
      expect(res.headers.get("content-security-policy"), where).toMatch(
        /frame-ancestors [^;]*https:\/\/\*\.notion\.site/,
      );
      expect(res.headers.has("x-frame-options"), where).toBe(false);
    }
  });
});
