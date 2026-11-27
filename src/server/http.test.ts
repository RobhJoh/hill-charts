import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApogee } from "../core/index.js";
import type { Storage } from "../core/index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "../core/test-struktur.js";
import { createWriteQueue, startServer, type RunningServer } from "./http.js";

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
  const källa = createMemoryNotion();
  const apogee = createApogee({
    storage,
    notion: källa,
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
  /** The structure is ticked in a fake Notion and synced (`notion.projekt(...)`). */
  const notion = notionStruktur(apogee, källa, storage);
  return { base, apiAs, server, apogee, källa, notion };
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

  it("renames, removes with handover, reactivates, and lists the Personer-historik", async () => {
    const { api, apiAs, vem, notion } = await start();
    const bo = (await api("POST", "/api/personer", { namn: "Bo" })).body.id;
    const p = await notion.projekt("Kassan", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    await api("POST", `/api/projekt/${p}/scopes`, { namn: "Prislista", ägare: bo });

    const bytt = await api("PATCH", `/api/personer/${bo}`, { namn: "Bosse" });
    expect(bytt).toMatchObject({ status: 200, body: { id: bo, namn: "Bosse", aktiv: true } });

    expect((await apiAs(null, "DELETE", `/api/personer/${bo}`, { nyÄgare: vem })).status).toBe(403);
    const borttagen = await api("DELETE", `/api/personer/${bo}`, { nyÄgare: vem });
    expect(borttagen.status).toBe(200);
    expect(borttagen.body.uppdateringar).toMatchObject([{ typ: "överlämning" }]);
    expect((await api("GET", `/api/projekt/${p}`)).body.scopes[0].ägare.id).toBe(vem);

    const igen = await api("POST", "/api/personer", { namn: "bosse" });
    expect(igen).toMatchObject({
      status: 409,
      body: { fel: "finns-inaktiv", person: { id: bo, namn: "Bosse", aktiv: false } },
    });
    const åter = await api("POST", `/api/personer/${bo}/ateraktivera`);
    expect(åter).toMatchObject({ status: 200, body: { id: bo, namn: "Bosse", aktiv: true } });

    const historik = await api("GET", "/api/personer/historik");
    expect(historik.body.map((h: { typ: string }) => h.typ)).toEqual(["ny", "ny", "byt namn", "ta bort", "återaktivera"]);
  });

  it("rejects every write to what Notion owns, signed or not: create, rename, move and dates", async () => {
    const { api, apiAs, notion } = await start();
    const p = await notion.projekt("Fakturering", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    const datum = { startdatum: null, slutdatum: "2026-12-01" };
    for (const vem of [null, (await api("GET", "/api/personer")).body[0].id]) {
      const writes = [
        await apiAs(vem, "POST", "/api/funktionsomraden", { namn: "X" }),
        await apiAs(vem, "PATCH", `/api/funktionsomraden/${fo}`, { namn: "X" }),
        await apiAs(vem, "PUT", `/api/funktionsomraden/${fo}/datum`, datum),
        await apiAs(vem, "POST", "/api/projekt", { funktionsområdeId: fo, namn: "X" }),
        await apiAs(vem, "PATCH", `/api/projekt/${p}`, { namn: "X" }),
        await apiAs(vem, "PATCH", `/api/projekt/${p}`, { funktionsområdeId: fo }),
        await apiAs(vem, "PUT", `/api/projekt/${p}/datum`, datum),
      ];
      for (const w of writes) expect(w).toMatchObject({ status: 405, body: { fel: "notion" } });
    }
    expect((await api("GET", "/api/oversikt")).body).toMatchObject([
      { id: fo, namn: "Ekonomi", tidsplan: { slutdatum: null }, projekt: [{ id: p, namn: "Fakturering" }] },
    ]);
  });
});

describe("Stjärnkarta and Personer index", () => {
  it("serves a Person's Stjärnkarta and the Personer index; 404 for an inaktiv Person", async () => {
    const { api, vem, notion } = await start();
    const bo = (await api("POST", "/api/personer", { namn: "Bo" })).body.id;
    const p = await notion.projekt("Kassan", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    const scope = (await api("POST", `/api/projekt/${p}/scopes`, { namn: "Prislista", ägare: bo })).body.id;
    await api("PATCH", `/api/projekt/${p}/scopes/${scope}`, { läge: 40 });

    const karta = await api("GET", `/api/personer/${bo}/stjarnkarta`);
    expect(karta).toMatchObject({
      status: 200,
      body: {
        person: { id: bo, namn: "Bo" },
        räkning: { scopes: 1, projekt: 1, stilla: 0, avslutade: 0 },
        projekt: [{ id: p, namn: "Kassan", scopes: [{ id: scope, namn: "Prislista", läge: 40 }] }],
      },
    });

    const index = await api("GET", "/api/personer/oversikt");
    expect(index.body).toMatchObject([
      { id: bo, namn: "Bo", räkning: { scopes: 1 }, lägen: [{ läge: 40, stilla: false }] },
      { id: vem, namn: "Testare", räkning: { scopes: 0 }, lägen: [] },
    ]);

    await api("DELETE", `/api/personer/${bo}`, { nyÄgare: vem });
    expect((await api("GET", `/api/personer/${bo}/stjarnkarta`)).status).toBe(404);
  });
});

describe("JSON API", () => {
  it("serves the structure synced from Notion, with links to its pages in Notion", async () => {
    const { api, notion } = await start();
    const p = await notion.projekt("Inloggning", "Plattform");
    const pl = await notion.funktionsområdeId("Plattform");
    expect((await api("GET", "/api/oversikt")).body).toMatchObject([
      { id: pl, namn: "Plattform", notionUrl: "https://www.notion.so/notion-Plattform", projekt: [{ id: p, namn: "Inloggning" }] },
    ]);
    expect((await api("GET", `/api/projekt/${p}`)).body).toMatchObject({
      id: p,
      namn: "Inloggning",
      notionUrl: "https://www.notion.so/notion-Inloggning",
      funktionsområde: { id: pl, namn: "Plattform" },
      scopes: [],
    });
  });

  it("answers 404 for unknown ids and routes, 400 for invalid input", async () => {
    const { api, notion } = await start();
    expect((await api("GET", "/api/projekt/saknas")).status).toBe(404);
    expect((await api("GET", "/api/funktionsomraden/saknas")).status).toBe(404);
    expect((await api("GET", "/api/finns-inte")).status).toBe(404);
    expect((await api("POST", "/api/personer", { namn: "  " })).status).toBe(400);
    expect((await api("POST", "/api/personer", {})).status).toBe(400);
    const res = await api("POST", "/api/projekt/saknas/scopes", { namn: "X", ägare: (await api("GET", "/api/personer")).body[0].id });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ fel: "finns-inte", meddelande: expect.any(String) });
  });

  it("rejects a body that is not JSON", async () => {
    const { base, notion } = await start();
    const res = await fetch(`${base}/api/personer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{namn:",
    });
    expect(res.status).toBe(400);
  });

  it("serializes concurrent writes so none is lost", async () => {
    // Slow storage widens the window in which unserialized read-modify-write
    // commands would overwrite each other.
    const { api, notion } = await start(createMemoryStorage({ latencyMs: 5 }));
    const namn = Array.from({ length: 20 }, (_, i) => `Person ${String(i).padStart(2, "0")}`);
    const results = await Promise.all(namn.map((n) => api("POST", "/api/personer", { namn: n })));
    expect(results.map((r) => r.status)).toEqual(namn.map(() => 201));
    expect((await api("GET", "/api/personer")).body.map((p: { namn: string }) => p.namn)).toEqual([...namn, "Testare"]);
  });
});

describe("Hämta från Notion", () => {
  it("syncs now, waiting for the result, and reports when Apogee last fetched", async () => {
    const { api, apiAs, källa } = await start();
    expect(await api("GET", "/api/notion/synk")).toEqual(expect.objectContaining({ status: 200, body: { senastHämtat: null, fel: null } }));

    källa.projekt({ notionId: "n1", namn: "Sökindex" });
    const synk = await apiAs(null, "POST", "/api/notion/synk");
    expect(synk).toMatchObject({ status: 200, body: { senastHämtat: "2026-11-24T10:00:00.000Z" } });
    expect((await api("GET", "/api/utan-funktionsomrade")).body).toMatchObject({ projekt: [{ namn: "Sökindex" }] });
    expect((await api("GET", "/api/notion/synk")).body).toEqual({ senastHämtat: "2026-11-24T10:00:00.000Z", fel: null });
  });

  it("answers 502 when Notion cannot be reached, changes nothing and records the error", async () => {
    const { api, källa } = await start();
    källa.projekt({ notionId: "n1", namn: "Sökindex" });
    källa.misslyckas(new Error("Notion svarar inte"));
    expect(await api("POST", "/api/notion/synk")).toMatchObject({ status: 502, body: { fel: "notion" } });
    expect((await api("GET", "/api/utan-funktionsomrade")).body).toBeNull();
    expect((await api("GET", "/api/notion/synk")).body).toEqual({
      senastHämtat: null,
      fel: { tid: "2026-11-24T10:00:00.000Z", meddelande: "Notion svarar inte" },
    });
  });

  it("runs the sync's writes in turn with other writes, so none is lost", async () => {
    const storage = createMemoryStorage({ latencyMs: 2 });
    const skrivkö = createWriteQueue();
    const källa = createMemoryNotion();
    let n = 0;
    const apogee = createApogee({ storage, notion: källa, skrivkö, now: () => new Date("2026-11-24T10:00:00Z"), newId: () => `id${++n}` });
    const server = await startServer({ apogee, skrivkö, webDir: await webDir(), port: 0 });
    running.push(server);
    const notion = notionStruktur(apogee, källa, storage);
    const vem = (await apogee.createPerson("Testare", null)).id;
    await notion.projekt("Kassan", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    const url = `http://127.0.0.1:${(server.address as AddressInfo).port}/api/funktionsomraden/${fo}/milstolpar`;
    const post = (i: number) =>
      fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "apogee-signatur": vem },
        body: JSON.stringify({ namn: `M${i}`, datum: "2026-12-01" }),
      });
    await Promise.all([
      ...[0, 1, 2].map(post),
      notion.ändraFunktionsområde("Ekonomi", { namn: "Ekonomi 2" }),
      ...[3, 4, 5].map(post),
    ]);
    const vy = await apogee.getFunktionsområde(fo);
    expect(vy.namn).toBe("Ekonomi 2");
    expect(vy.tidsplan.milstolpar).toHaveLength(6);
  });
});

describe("Utan funktionsområde", () => {
  it("lists Projekt with no Funktionsområde, or null when there are none", async () => {
    const storage = createMemoryStorage();
    const { api, notion } = await start(storage);
    expect((await api("GET", "/api/utan-funktionsomrade")).body).toBeNull();
    await storage.saveProjekt({ id: "p1", namn: "Sökindex", skapad: "2026-11-01T10:00:00.000Z" });
    const svar = await api("GET", "/api/utan-funktionsomrade");
    expect(svar.status).toBe(200);
    expect(svar.body).toMatchObject({ projekt: [{ id: "p1", namn: "Sökindex" }] });
  });
});

describe("Scopes", () => {
  async function medProjekt() {
    const s = await start();
    return { ...s, projekt: await s.notion.projekt("Kassan", "Ekonomi") };
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
    const projekt = await s.notion.projekt("K", "Ekonomi");
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
    const { api, apiAs, vem, base, notion } = await start();
    const projekt = await notion.projekt("Kassan", "Ekonomi");
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

describe("status", () => {
  it("is derived from Läge and shown for Projekt and Funktionsområden; it cannot be marked or reopened", async () => {
    const { api, vem, notion } = await start();
    const projekt = await notion.projekt("Kassan", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    const scope = (await api("POST", `/api/projekt/${projekt}/scopes`, { namn: "Prislista", ägare: vem })).body.id;
    expect((await api("GET", `/api/projekt/${projekt}`)).body).toMatchObject({ status: "inte påbörjat", avslutat: false });

    await api("PATCH", `/api/projekt/${projekt}/scopes/${scope}`, { läge: 100 });
    expect((await api("GET", `/api/projekt/${projekt}`)).body).toMatchObject({ status: "avslutat", avslutat: true });
    expect((await api("GET", `/api/funktionsomraden/${fo}`)).body).toMatchObject({ status: "avslutat" });
    expect((await api("GET", "/api/oversikt")).body).toMatchObject([{ status: "avslutat", projekt: [{ status: "avslutat" }] }]);

    expect((await api("POST", `/api/projekt/${projekt}/avslutat`)).status).toBe(404);
    expect((await api("DELETE", `/api/projekt/${projekt}/avslutat`)).status).toBe(404);
  });
});

describe("Borttaget and Radera", () => {
  it("takes nothing away or back by hand: Notion does", async () => {
    const { api, notion } = await start();
    const projekt = await notion.projekt("Kassan", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    for (const path of [`/api/projekt/${projekt}/borttagen`, `/api/funktionsomraden/${fo}/borttagen`]) {
      for (const method of ["POST", "DELETE"]) {
        expect(await api(method, path), `${method} ${path}`).toMatchObject({ status: 405, body: { fel: "notion" } });
      }
    }
    expect((await api("GET", `/api/projekt/${projekt}`)).body).toMatchObject({ borttagen: null });
  });

  it("lists a Projekt missing from Notion as Borttaget and erases it when its name is typed; signed", async () => {
    const { api, apiAs, notion } = await start();
    const projekt = await notion.projekt("Kassan", "Ekonomi");
    await notion.projekt("Moms", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");

    expect((await api("DELETE", `/api/projekt/${projekt}`, { namn: "Kassan" })).status).toBe(400);
    await notion.avbocka("Kassan");
    expect((await api("GET", `/api/funktionsomraden/${fo}`)).body).toMatchObject({
      projekt: [{ namn: "Moms" }],
      borttagnaProjekt: [{ id: projekt, namn: "Kassan", borttagen: { tid: "2026-11-24T10:00:00.000Z" } }],
    });
    expect((await api("DELETE", `/api/projekt/${projekt}`, { namn: "kassan" })).status).toBe(400);
    expect((await apiAs(null, "DELETE", `/api/projekt/${projekt}`, { namn: "Kassan" })).status).toBe(403);
    expect((await api("DELETE", `/api/projekt/${projekt}`, { namn: "Kassan" })).status).toBe(204);
    expect((await api("GET", `/api/projekt/${projekt}`)).status).toBe(404);
  });

  it("lists a Funktionsområde whose last Projekt left under Borttagna, and erases it with its Projekt", async () => {
    const { api, notion } = await start();
    const projekt = await notion.projekt("Kassan", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    await notion.avbocka("Kassan");
    expect((await api("GET", "/api/oversikt")).body).toEqual([]);
    expect((await api("GET", "/api/borttagna")).body).toMatchObject([
      { id: fo, namn: "Ekonomi", borttagen: { tid: "2026-11-24T10:00:00.000Z" }, borttagnaProjekt: [{ id: projekt }] },
    ]);

    expect((await api("DELETE", `/api/funktionsomraden/${fo}`, { namn: "Ekonomi" })).status).toBe(204);
    expect((await api("GET", "/api/borttagna")).body).toEqual([]);
    expect((await api("GET", `/api/funktionsomraden/${fo}`)).status).toBe(404);
    expect((await api("GET", `/api/projekt/${projekt}`)).status).toBe(404);
  });
});

describe("stable links (#40)", () => {
  /** A Funktionsområde "Kund & Säljstöd" holding a Projekt "Ny <kassa>". */
  async function seeded() {
    const s = await start();
    const p = await s.notion.projekt("Ny <kassa>", "Kund & Säljstöd");
    const fo = await s.notion.funktionsområdeId("Kund & Säljstöd");
    const get = (path: string) => fetch(s.base + path, { redirect: "manual" });
    return { ...s, fo, p, get };
  }

  it("redirects a wrong, old or missing slug to the canonical URL, keeping the query", async () => {
    const { fo, p, vem, get, notion } = await seeded();
    for (const [path, canonical] of [
      [`/p/${p}`, `/p/${p}-ny-kassa`],
      [`/p/${p}-gammalt-namn`, `/p/${p}-ny-kassa`],
      [`/f/${fo}-x`, `/f/${fo}-kund-saljstod`],
      [`/person/${vem}-vem`, `/person/${vem}-testare`],
    ]) {
      const res = await get(path!);
      expect(res.status, path).toBe(302);
      expect(res.headers.get("location"), path).toBe(canonical);
    }
    expect((await get(`/p/${p}-fel?tema=dag`)).headers.get("location")).toBe(`/p/${p}-ny-kassa?tema=dag`);

    await notion.ändraProjekt("Ny <kassa>", { namn: "Kassan" });
    expect((await get(`/p/${p}-ny-kassa`)).headers.get("location")).toBe(`/p/${p}-kassan`);
    const canonical = await get(`/p/${p}-kassan`);
    expect(canonical.status).toBe(200);
    expect(canonical.headers.get("content-type")).toMatch(/^text\/html/);
  });

  it("answers 404 'Finns inte längre' for unknown and Raderad ids", async () => {
    const { api, fo, p, get, notion } = await seeded();
    await notion.avbocka("Ny <kassa>");
    await api("DELETE", `/api/projekt/${p}`, { namn: "Ny <kassa>" });
    for (const path of [`/p/${p}-ny-kassa`, `/p/okand-x`, `/f/okand`, `/person/okand-anna`]) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
      expect(res.headers.get("content-type"), path).toMatch(/^text\/html/);
      expect(await res.text(), path).toContain("<title>Finns inte längre · Apogee</title>");
    }
    expect((await get(`/f/${fo}`)).status).toBe(302);
  });

  it("renders Open Graph tags with the name, the Funktionsområde and a static image", async () => {
    const { base, fo, p, get } = await seeded();
    const html = await (await get(`/p/${p}-ny-kassa`)).text();
    expect(html).toContain("<title>Ny &lt;kassa&gt; · Apogee</title>");
    expect(html).toContain('<meta property="og:title" content="Ny &lt;kassa&gt;">');
    expect(html).toContain('<meta property="og:description" content="Projekt i Kund &amp; Säljstöd">');
    expect(html).toContain(`<meta property="og:url" content="${base}/p/${p}-ny-kassa">`);
    expect(html).toContain(`<meta property="og:image" content="${base}/og.png">`);
    expect(html).toContain('<meta property="og:site_name" content="Apogee">');

    const foHtml = await (await get(`/f/${fo}-kund-saljstod`)).text();
    expect(foHtml).toContain('<meta property="og:title" content="Kund &amp; Säljstöd">');
    expect(foHtml).toContain('<meta property="og:description" content="Funktionsområde · 1 Projekt">');

    // Behind a TLS-terminating proxy the absolute URLs are https.
    const proxied = await (await fetch(`${base}/p/${p}-ny-kassa`, { headers: { "x-forwarded-proto": "https" } })).text();
    expect(proxied).toContain(`<meta property="og:image" content="${base.replace("http:", "https:")}/og.png">`);
  });

  it("serves a robots.txt without Disallow, so crawlers see the noindex header instead", async () => {
    const { base, notion } = await start();
    const res = await fetch(`${base}/robots.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    const text = await res.text();
    expect(text).toMatch(/^User-agent: \*$/m);
    expect(text).not.toMatch(/disallow/i);
  });

  it("serves a Borttagen Projekt or Funktionsområde as the 'borttaget' page, still at its canonical URL", async () => {
    const { api, fo, p, get, notion } = await seeded();
    await notion.avbocka("Ny <kassa>");
    expect((await get(`/p/${p}`)).headers.get("location")).toBe(`/p/${p}-ny-kassa`);
    const projekt = await get(`/p/${p}-ny-kassa`);
    expect(projekt.status).toBe(200);
    const html = await projekt.text();
    expect(html).toContain("<title>Projektet är borttaget · Apogee</title>");
    expect(html).toContain('<meta property="og:description" content="Projektet är borttaget">');

    const annat = await notion.projekt("Annat", "Kund & Säljstöd");
    await notion.avbocka("Annat");
    const foHtml = await (await get(`/f/${fo}-kund-saljstod`)).text();
    expect(foHtml).toContain('<meta property="og:description" content="Funktionsområdet är borttaget">');
    const följde = await (await get(`/p/${annat}-annat`)).text();
    expect(följde).toContain('<meta property="og:description" content="Projektet är borttaget">');
  });
});

describe("the SPA", () => {
  it("serves index.html at the bare root and for every client route", async () => {
    const { base, notion } = await start();
    for (const path of ["/", "/installningar/personer", "/okand/sida"]) {
      const res = await fetch(base + path);
      expect(res.status, path).toBe(200);
      expect(res.headers.get("content-type"), path).toMatch(/^text\/html/);
      expect(await res.text(), path).toContain("<title>Apogee</title>");
    }
  });

  it("serves built assets with their content type", async () => {
    const { base, notion } = await start();
    const res = await fetch(`${base}/app.js`);
    expect(res.headers.get("content-type")).toMatch(/^text\/javascript/);
    expect(await res.text()).toBe("console.log('apogee')");
  });

  it("never serves files outside the web directory", async () => {
    const { base, notion } = await start();
    const res = await fetch(`${base}/..%2Fpackage.json`);
    expect(await res.text()).toContain("<title>Apogee</title>");
  });
});

describe("dates and Milstolpar", () => {
  it("dates come from Notion; Milstolpar are set on a Projekt and a Funktionsområde, only a Projekt's as Uppdateringar", async () => {
    const { api, apiAs, notion } = await start();
    const p = await notion.projekt("Kassan", "Ekonomi", { startdatum: "2026-11-02", slutdatum: "2026-12-14" });
    await notion.ändraFunktionsområde("Ekonomi", { slutdatum: "2026-12-07" });
    const fo = await notion.funktionsområdeId("Ekonomi");

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

    const foM = await api("POST", `/api/funktionsomraden/${fo}/milstolpar`, { namn: "Release", datum: "2026-12-05" });
    expect(foM.status).toBe(201);
    expect((await api("GET", `/api/funktionsomraden/${fo}`)).body.tidsplan).toEqual({
      startdatum: null,
      slutdatum: "2026-12-07",
      milstolpar: [{ id: foM.body.id, namn: "Release", datum: "2026-12-05" }],
    });
    expect((await api("GET", `/api/projekt/${p}`)).body.datumVarningar).toEqual(["slutar efter Funktionsområdet"]);

    expect((await api("POST", `/api/projekt/${p}/milstolpar`, { namn: "X", datum: "nej" })).status).toBe(400);
    expect((await apiAs(null, "POST", `/api/funktionsomraden/${fo}/milstolpar`, { namn: "X", datum: "2026-12-01" })).status).toBe(403);
    expect((await api("DELETE", `/api/funktionsomraden/${fo}/milstolpar/okänd`)).status).toBe(404);
  });
});

describe("headers on every response (ADR 0002)", () => {
  it("are noindex, no-referrer, framable by Notion, and never X-Frame-Options", async () => {
    const { base, notion } = await start();
    await notion.projekt("Kassan", "Ekonomi");
    const fo = await notion.funktionsområdeId("Ekonomi");
    const responses = [
      await fetch(`${base}/`),
      await fetch(`${base}/p/x-y`),
      await fetch(`${base}/app.js`),
      await fetch(`${base}/api/oversikt`),
      await fetch(`${base}/api/projekt/saknas`),
      await fetch(`${base}/api/finns-inte`),
      await fetch(`${base}/api/funktionsomraden`, { method: "POST", body: "nope" }),
      await fetch(`${base}/api/funktionsomraden/${fo}`, {
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

describe("the Notion embed (#43)", () => {
  async function seeded() {
    const s = await start();
    const p = await s.notion.projekt("Ny <kassa>", "Kund");
    const fo = await s.notion.funktionsområdeId("Kund");
    const get = (path: string) => fetch(s.base + path, { redirect: "manual" });
    return { ...s, fo, p, get };
  }

  it("is the Projekt URL plus /embed; a non-canonical slug redirects to the canonical embed URL", async () => {
    const { p, get } = await seeded();
    const res = await get(`/p/${p}-ny-kassa/embed`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
    expect(await res.text()).toContain("<title>Ny &lt;kassa&gt; · Apogee</title>");

    for (const path of [`/p/${p}/embed`, `/p/${p}-gammalt/embed`]) {
      const r = await get(path);
      expect(r.status, path).toBe(302);
      expect(r.headers.get("location"), path).toBe(`/p/${p}-ny-kassa/embed`);
    }
    expect((await get(`/p/${p}-x/embed?a=1`)).headers.get("location")).toBe(`/p/${p}-ny-kassa/embed?a=1`);
  });

  it("carries no Open Graph tags, so Notion frames the page instead of drawing a link card", async () => {
    const { p, get } = await seeded();
    expect(await (await get(`/p/${p}-ny-kassa/embed`)).text()).not.toContain("og:");
  });

  it("says 'Det här Projektet är borttaget' for a Borttagen Projekt and 404 'Finns inte längre' once Raderad", async () => {
    const { api, p, get, notion } = await seeded();
    await notion.avbocka("Ny <kassa>");
    const borttagen = await get(`/p/${p}-ny-kassa/embed`);
    expect(borttagen.status).toBe(200);
    expect(await borttagen.text()).toContain("<title>Det här Projektet är borttaget · Apogee</title>");

    await api("DELETE", `/api/projekt/${p}`, { namn: "Ny <kassa>" });
    for (const path of [`/p/${p}-ny-kassa/embed`, `/p/okand-x/embed`]) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
      expect(await res.text(), path).toContain("<title>Finns inte längre · Apogee</title>");
    }
  });

  it("may be framed by Notion, whatever the answer", async () => {
    const { p, get, notion } = await seeded();
    const svar = [await get(`/p/${p}-ny-kassa/embed`), await get(`/p/${p}/embed`), await get(`/p/okand/embed`)];
    await notion.avbocka("Ny <kassa>");
    svar.push(await get(`/p/${p}-ny-kassa/embed`));
    for (const res of svar) {
      expect(res.headers.get("content-security-policy"), res.url).toMatch(/frame-ancestors [^;]*https:\/\/www\.notion\.so/);
      expect(res.headers.has("x-frame-options"), res.url).toBe(false);
    }
  });
});
