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

/** A server over `storage`, with no Personer added. */
async function startTom(storage: Storage = createMemoryStorage()) {
  let n = 0;
  const apogee = createApogee({
    storage,
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
  const server = await startServer({ apogee, webDir: await webDir(), port: 0 });
  running.push(server);
  const base = `http://127.0.0.1:${(server.address as AddressInfo).port}`;

  /** Calls the API signed as `vem` (or unsigned when `vem` is null). */
  const apiAs = async (vem: string | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (vem !== null) headers["apogee-signatur"] = vem;
    const res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : undefined };
  };
  return { base, apiAs, server, apogee };
}

/** A server with one Person, `vem`; `api` signs every call as them. */
async function start(storage: Storage = createMemoryStorage()) {
  const s = await startTom(storage);
  const personer = await s.apogee.listPersoner();
  const vem = personer[0]?.id ?? (await s.apogee.createPerson("Testare", null)).id;
  const api = (method: string, path: string, body?: unknown) => s.apiAs(vem, method, path, body);
  return { ...s, api, vem };
}

describe("Personer and Signatur", () => {
  it("adds the first Person unsigned, then lists Personer", async () => {
    const { apiAs } = await startTom();
    expect((await apiAs(null, "GET", "/api/personer")).body).toEqual([]);
    const anna = await apiAs(null, "POST", "/api/personer", { namn: "Anna" });
    expect(anna.status).toBe(201);
    expect(anna.body).toEqual({ id: expect.any(String), namn: "Anna", aktiv: true });
    expect((await apiAs(null, "GET", "/api/personer")).body).toEqual([anna.body]);
  });

  it("rejects a second Person without a valid Signatur, and a duplicate name ignoring case", async () => {
    const { apiAs } = await startTom();
    const anna = await apiAs(null, "POST", "/api/personer", { namn: "Anna" });
    const unsigned = await apiAs(null, "POST", "/api/personer", { namn: "Bo" });
    expect(unsigned.status).toBe(403);
    expect(unsigned.body).toEqual({ fel: "signatur", meddelande: expect.any(String) });
    expect((await apiAs("okänd", "POST", "/api/personer", { namn: "Bo" })).status).toBe(403);
    const dup = await apiAs(anna.body.id, "POST", "/api/personer", { namn: "anna" });
    expect(dup.status).toBe(409);
    expect(dup.body.fel).toBe("finns-redan");
    expect((await apiAs(anna.body.id, "POST", "/api/personer", { namn: "Bo" })).status).toBe(201);
  });

  it("rejects every write to Funktionsområden and Projekt without a valid, active Signatur", async () => {
    const storage = createMemoryStorage();
    const { api, apiAs } = await start(storage);
    await storage.savePersoner([
      ...(await storage.listPersoner()),
      { id: "inaktiv", namn: "Bo", aktiv: false, skapad: "2026-01-01T00:00:00.000Z" },
    ]);
    const fo = await api("POST", "/api/funktionsomraden", { namn: "Ekonomi" });
    const p = await api("POST", "/api/projekt", { funktionsområdeId: fo.body.id, namn: "Fakturering" });
    for (const vem of [null, "", "okänd", "inaktiv"]) {
      const writes = [
        await apiAs(vem, "POST", "/api/funktionsomraden", { namn: "X" }),
        await apiAs(vem, "PATCH", `/api/funktionsomraden/${fo.body.id}`, { namn: "X" }),
        await apiAs(vem, "POST", "/api/projekt", { funktionsområdeId: fo.body.id, namn: "X" }),
        await apiAs(vem, "PATCH", `/api/projekt/${p.body.id}`, { namn: "X" }),
      ];
      expect(writes.map((w) => w.status), String(vem)).toEqual([403, 403, 403, 403]);
    }
    expect((await api("GET", "/api/oversikt")).body).toMatchObject([
      { id: fo.body.id, namn: "Ekonomi", projekt: [{ id: p.body.id, namn: "Fakturering" }] },
    ]);
  });
});

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

    expect((await api("GET", "/api/oversikt")).body).toMatchObject([
      { id: ku.body.id, namn: "Kundupplevelse", projekt: [] },
      { id: pl.body.id, namn: "Plattform", projekt: [{ id: p.body.id, namn: "Inloggning" }] },
    ]);
    expect((await api("GET", `/api/funktionsomraden/${pl.body.id}`)).body).toMatchObject({
      id: pl.body.id,
      namn: "Plattform",
      projekt: [{ id: p.body.id, namn: "Inloggning" }],
    });
    expect((await api("GET", `/api/projekt/${p.body.id}`)).body).toMatchObject({
      id: p.body.id,
      namn: "Inloggning",
      funktionsområde: { id: pl.body.id, namn: "Plattform" },
      scopes: [],
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
    expect((await second.api("GET", "/api/oversikt")).body).toMatchObject([
      { id: fo.body.id, namn: "Ekonomi", projekt: [{ id: expect.any(String), namn: "Fakturering" }] },
    ]);
  });
});

describe("Scopes", () => {
  async function medProjekt() {
    const s = await start();
    const fo = await s.api("POST", "/api/funktionsomraden", { namn: "Ekonomi" });
    const p = await s.api("POST", "/api/projekt", { funktionsområdeId: fo.body.id, namn: "Kassan" });
    return { ...s, projekt: p.body.id as string };
  }

  it("adds, moves, renames, hands over and removes a Scope, each one Uppdatering", async () => {
    const { api, apiAs, vem, projekt } = await medProjekt();
    const erik = (await api("POST", "/api/personer", { namn: "Erik" })).body.id;
    const scopes = `/api/projekt/${projekt}/scopes`;

    const ny = await api("POST", scopes, { namn: "Prislista", ägare: erik });
    expect(ny.status).toBe(201);
    expect(ny.body).toEqual({ id: expect.any(String), uppdatering: expect.objectContaining({ typ: "ny", vem }) });
    const scope = `${scopes}/${ny.body.id}`;

    const flytt = await apiAs(erik, "PATCH", scope, { läge: 140 });
    expect(flytt.status).toBe(200);
    expect(flytt.body.uppdatering).toMatchObject({ typ: "flytt", vem: erik });
    expect((await api("PATCH", scope, { läge: 100 })).body).toEqual({ uppdatering: null });
    expect((await api("PATCH", scope, { namn: "Priser" })).status).toBe(200);
    expect((await api("PATCH", scope, { ägare: vem })).status).toBe(200);

    expect((await api("GET", `/api/projekt/${projekt}`)).body.scopes).toMatchObject([
      {
        id: ny.body.id,
        namn: "Priser",
        läge: 100,
        ägare: { id: vem, namn: "Testare", aktiv: true },
        flyttad: "2026-11-24T10:00:00.000Z",
      },
    ]);

    const bort = await api("DELETE", scope);
    expect(bort.status).toBe(200);
    expect(bort.body.uppdatering).toMatchObject({ typ: "ta bort", ändringar: [{ scopeId: ny.body.id, efter: null }] });
    expect((await api("GET", `/api/projekt/${projekt}`)).body.scopes).toEqual([]);

    const historik = await api("GET", `/api/projekt/${projekt}/historik`);
    expect(historik.body.map((u: { typ: string }) => u.typ)).toEqual(["ny", "flytt", "byt namn", "byt ägare", "ta bort"]);
  });

  it("rejects bad input, missing Ägare, unknown Scopes and unsigned writes", async () => {
    const { api, apiAs, vem, projekt } = await medProjekt();
    const scopes = `/api/projekt/${projekt}/scopes`;
    const id = (await api("POST", scopes, { namn: "Prislista", ägare: vem })).body.id;
    const scope = `${scopes}/${id}`;

    expect((await api("POST", scopes, { namn: "X" })).status).toBe(400);
    expect((await api("POST", scopes, { namn: "X", ägare: "okänd" })).status).toBe(400);
    expect((await api("PATCH", scope, { ägare: "" })).status).toBe(400);
    expect((await api("PATCH", scope, { läge: "högt" })).status).toBe(400);
    expect((await api("PATCH", scope, {})).status).toBe(400);
    expect((await api("PATCH", scope, { namn: "X", läge: 3 })).status).toBe(400);
    expect((await api("PATCH", `${scopes}/saknas`, { läge: 3 })).status).toBe(404);
    expect((await api("POST", "/api/projekt/saknas/scopes", { namn: "X", ägare: vem })).status).toBe(404);
    expect((await api("GET", "/api/projekt/saknas/historik")).status).toBe(404);
    for (const write of [
      apiAs(null, "POST", scopes, { namn: "X", ägare: vem }),
      apiAs(null, "PATCH", scope, { läge: 50 }),
      apiAs("okänd", "DELETE", scope),
    ]) {
      expect((await write).status).toBe(403);
    }
    expect((await api("GET", `/api/projekt/${projekt}/historik`)).body).toHaveLength(1);
  });

  it("serializes concurrent drops so every one is in the Historik", async () => {
    const s = await start(createMemoryStorage({ latencyMs: 2 }));
    const fo = await s.api("POST", "/api/funktionsomraden", { namn: "Ekonomi" });
    const projekt = (await s.api("POST", "/api/projekt", { funktionsområdeId: fo.body.id, namn: "K" })).body.id;
    const scopes = `/api/projekt/${projekt}/scopes`;
    const id = (await s.api("POST", scopes, { namn: "Prislista", ägare: s.vem })).body.id;
    const lägen = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
    await Promise.all(lägen.map((läge) => s.api("PATCH", `${scopes}/${id}`, { läge })));
    const historik = (await s.api("GET", `/api/projekt/${projekt}/historik`)).body;
    expect(historik.map((u: { ändringar: { efter: { läge: number } }[] }) => u.ändringar[0]!.efter.läge)).toEqual([
      0,
      ...lägen,
    ]);
  });
});

describe("Historik, Återställning and Ångra", () => {
  it("lists rows, previews, restores and undoes over HTTP; a blocked Ångra is 409", async () => {
    const { api, apiAs, vem, base } = await start();
    const fo = await api("POST", "/api/funktionsomraden", { namn: "Ekonomi" });
    const projekt = (await api("POST", "/api/projekt", { funktionsområdeId: fo.body.id, namn: "Kassan" })).body.id;
    const p = `/api/projekt/${projekt}`;
    const id = (await api("POST", `${p}/scopes`, { namn: "Prislista", ägare: vem })).body.id;
    const flytt = (await api("PATCH", `${p}/scopes/${id}`, { läge: 40 })).body.uppdatering;
    await api("PATCH", `${p}/scopes/${id}`, { läge: 50 });
    const bort = (await api("DELETE", `${p}/scopes/${id}`)).body.uppdatering;

    const rader = await api("GET", `${p}/historikvy`);
    expect(rader.status).toBe(200);
    expect(rader.body.map((r: { typ: string; antal: number }) => [r.typ, r.antal])).toEqual([
      ["ta bort", 1],
      ["flytt", 2],
      ["ny", 1],
    ]);
    expect(rader.body[0].vem).toEqual({ id: vem, namn: "Testare", aktiv: true });

    const visa = await api("GET", `${p}/historik/${flytt.id}`);
    expect(visa.body).toMatchObject({ scopes: [{ id, läge: 40 }], skiljer: [id], avslutat: false });
    expect((await api("GET", `${p}/historik/saknas`)).status).toBe(404);

    const ångra = await api("POST", `${p}/angra`, { mål: bort.id });
    expect(ångra.status).toBe(200);
    expect(ångra.body.uppdatering).toMatchObject({ typ: "ångra", mål: bort.id });
    expect((await api("GET", p)).body.scopes).toEqual([expect.objectContaining({ id, läge: 50 })]);

    const krock = await api("POST", `${p}/angra`, { mål: flytt.id });
    expect(krock.status).toBe(409);
    expect(krock.body).toEqual({ fel: "krock", meddelande: expect.stringContaining("Återställ hit") });

    const åter = await api("POST", `${p}/aterstallning`, { mål: flytt.id });
    expect(åter.status).toBe(200);
    expect(åter.body.uppdatering).toMatchObject({ typ: "återställning", mål: flytt.id });
    expect((await api("POST", `${p}/aterstallning`, { mål: flytt.id })).body).toEqual({ uppdatering: null });
    expect((await api("GET", p)).body.scopes).toEqual([expect.objectContaining({ id, läge: 40 })]);

    expect((await api("POST", `${p}/angra`, {})).status).toBe(400);
    expect((await apiAs(null, "POST", `${p}/angra`, { mål: flytt.id })).status).toBe(403);
    expect((await apiAs(null, "POST", `${p}/aterstallning`, { mål: bort.id })).status).toBe(403);
    expect((await fetch(`${base}/api/projekt/saknas/historikvy`)).status).toBe(404);
  });
});

describe("Avslutat", () => {
  it("marks a Projekt Avslutat and reopens it, each one Uppdatering; signed", async () => {
    const { api, apiAs, vem } = await start();
    const fo = await api("POST", "/api/funktionsomraden", { namn: "Ekonomi" });
    const projekt = (await api("POST", "/api/projekt", { funktionsområdeId: fo.body.id, namn: "Kassan" })).body.id;
    await api("POST", `/api/projekt/${projekt}/scopes`, { namn: "Prislista", ägare: vem });
    const avslutat = `/api/projekt/${projekt}/avslutat`;

    expect((await apiAs(null, "POST", avslutat)).status).toBe(403);
    const markera = await api("POST", avslutat);
    expect(markera.status).toBe(200);
    expect(markera.body.uppdatering).toMatchObject({ typ: "avslutat", vem });
    expect((await api("POST", avslutat)).body).toEqual({ uppdatering: null });
    expect((await api("GET", `/api/projekt/${projekt}`)).body).toMatchObject({ avslutat: true, markeradAvslutat: true });

    const öppna = await api("DELETE", avslutat);
    expect(öppna.body.uppdatering).toMatchObject({ typ: "öppna igen", vem });
    expect((await api("GET", `/api/projekt/${projekt}`)).body).toMatchObject({ avslutat: false, pågående: true });
    expect((await api("POST", "/api/projekt/nej/avslutat")).status).toBe(404);
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

describe("dates and Milstolpar", () => {
  it("are set on a Projekt (as Uppdateringar) and a Funktionsområde (without)", async () => {
    const { api, apiAs } = await start();
    const fo = (await api("POST", "/api/funktionsomraden", { namn: "Ekonomi" })).body.id;
    const p = (await api("POST", "/api/projekt", { funktionsområdeId: fo, namn: "Kassan" })).body.id;

    const datum = await api("PUT", `/api/projekt/${p}/datum`, { startdatum: "2026-11-02", veckor: 6 });
    expect(datum.status).toBe(200);
    expect(datum.body.uppdatering).toMatchObject({ typ: "datum", projekt: { efter: { slutdatum: "2026-12-14" } } });
    const m = await api("POST", `/api/projekt/${p}/milstolpar`, { namn: "Beta", datum: "2026-12-01" });
    expect(m.status).toBe(201);
    const ändrad = await api("PATCH", `/api/projekt/${p}/milstolpar/${m.body.id}`, { namn: "Betaversion" });
    expect(ändrad.body.uppdatering).toMatchObject({ typ: "milstolpe" });
    expect((await api("GET", `/api/projekt/${p}`)).body.tidsplan).toEqual({
      startdatum: "2026-11-02",
      slutdatum: "2026-12-14",
      milstolpar: [{ id: m.body.id, namn: "Betaversion", datum: "2026-12-01" }],
    });
    expect((await api("DELETE", `/api/projekt/${p}/milstolpar/${m.body.id}`)).status).toBe(200);

    const foDatum = await api("PUT", `/api/funktionsomraden/${fo}/datum`, { startdatum: null, slutdatum: "2026-12-07" });
    expect(foDatum.body).toEqual({ uppdatering: null });
    const foM = await api("POST", `/api/funktionsomraden/${fo}/milstolpar`, { namn: "Release", datum: "2026-12-05" });
    expect(foM.status).toBe(201);
    expect((await api("GET", `/api/funktionsomraden/${fo}`)).body.tidsplan).toEqual({
      startdatum: null,
      slutdatum: "2026-12-07",
      milstolpar: [{ id: foM.body.id, namn: "Release", datum: "2026-12-05" }],
    });
    expect((await api("GET", `/api/projekt/${p}`)).body.datumVarningar).toEqual(["slutar efter Funktionsområdet"]);

    expect((await api("PUT", `/api/projekt/${p}/datum`, { startdatum: "nej", slutdatum: null })).status).toBe(400);
    expect((await api("PUT", `/api/projekt/${p}/datum`, { slutdatum: "2026-12-01" })).status).toBe(400);
    expect((await apiAs(null, "PUT", `/api/funktionsomraden/${fo}/datum`, { startdatum: null, slutdatum: null })).status).toBe(403);
    expect((await api("DELETE", `/api/funktionsomraden/${fo}/milstolpar/okänd`)).status).toBe(404);
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
