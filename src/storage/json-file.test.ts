import { appendFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Funktionsområde, Projekt, Uppdatering } from "../core/types.js";
import { createJsonFileStorage } from "./json-file.js";
import { storageContract } from "./storage.contract.js";

async function tempDir() {
  return mkdtemp(join(tmpdir(), "apogee-test-"));
}

storageContract("JSON files", async () => {
  const dir = await tempDir();
  return { storage: createJsonFileStorage(dir), reopen: () => createJsonFileStorage(dir) };
});

// These tests simulate crashes and old data, so unlike the contract they
// necessarily know the adapter's file layout.

const projekt: Projekt = {
  id: "p1",
  namn: "Sökindex",
  funktionsområdeId: "f1",
  skapad: "2026-11-24T10:00:00.000Z",
};
const fo: Funktionsområde = { id: "f1", namn: "Plattform", skapad: "2026-11-24T10:00:00.000Z" };
const uppdatering = (id: string): Uppdatering => ({
  id,
  typ: "flytt",
  vem: "person1",
  tid: "2026-11-24T10:00:00.000Z",
  ändringar: [],
});

describe("JSON files: crash safety", () => {
  it("skips a half-written last Historik line", async () => {
    const dir = await tempDir();
    const storage = createJsonFileStorage(dir);
    await storage.saveProjekt(projekt);
    await storage.appendUppdatering("p1", uppdatering("u1"));
    await appendFile(join(dir, "projekt", "p1.historik.jsonl"), '{"id":"u2","typ":"fl');

    expect(await createJsonFileStorage(dir).readHistorik("p1")).toEqual([uppdatering("u1")]);
  });

  it("appends after a half-written line without losing or corrupting anything", async () => {
    const dir = await tempDir();
    const storage = createJsonFileStorage(dir);
    await storage.saveProjekt(projekt);
    await storage.appendUppdatering("p1", uppdatering("u1"));
    await appendFile(join(dir, "projekt", "p1.historik.jsonl"), '{"id":"u2","typ":"fl');

    const restarted = createJsonFileStorage(dir);
    await restarted.appendUppdatering("p1", uppdatering("u3"));
    expect(await restarted.readHistorik("p1")).toEqual([uppdatering("u1"), uppdatering("u3")]);
  });

  it("ignores temp files left behind by a write that never got renamed", async () => {
    const dir = await tempDir();
    const storage = createJsonFileStorage(dir);
    await storage.saveFunktionsområden([fo]);
    await storage.saveProjekt(projekt);
    await writeFile(join(dir, "funktionsomraden.json.1a2b3c.tmp"), '{"formatVersion":1,"funkt');
    await writeFile(join(dir, "projekt", "p1.json.1a2b3c.tmp"), '{"formatVersion":1,"proj');
    await writeFile(join(dir, "projekt", "p2.json.4d5e6f.tmp"), '{"formatVersion":1,"proj');

    const restarted = createJsonFileStorage(dir);
    expect(await restarted.listFunktionsområden()).toEqual([fo]);
    expect(await restarted.listProjekt()).toEqual([projekt]);
    expect(await restarted.getProjekt("p2")).toBeUndefined();
  });
});

describe("JSON files: format versions", () => {
  it("upgrades unversioned (version 0) documents on read", async () => {
    const dir = await tempDir();
    await mkdir(join(dir, "projekt"));
    await writeFile(join(dir, "funktionsomraden.json"), JSON.stringify([fo]));
    await writeFile(join(dir, "projekt", "p1.json"), JSON.stringify(projekt));

    const storage = createJsonFileStorage(dir);
    expect(await storage.listFunktionsområden()).toEqual([fo]);
    expect(await storage.getProjekt("p1")).toEqual(projekt);
    expect(await storage.listProjekt()).toEqual([projekt]);
  });

  it("writes format version 2, where a Projekt carries its own dates", async () => {
    const dir = await tempDir();
    await createJsonFileStorage(dir).saveProjekt({ ...projekt, startdatum: "2026-11-02", slutdatum: "2026-12-14" });
    const doc = JSON.parse(await readFile(join(dir, "projekt", "p1.json"), "utf8"));
    expect(doc).toEqual({ formatVersion: 2, projekt: { ...projekt, startdatum: "2026-11-02", slutdatum: "2026-12-14" } });
  });

  it("reads version 1 documents, whose Projekt have no dates of their own", async () => {
    const dir = await tempDir();
    await mkdir(join(dir, "projekt"));
    await writeFile(join(dir, "funktionsomraden.json"), JSON.stringify({ formatVersion: 1, funktionsområden: [fo] }));
    await writeFile(join(dir, "personer.json"), JSON.stringify({ formatVersion: 1, personer: [] }));
    await writeFile(join(dir, "projekt", "p1.json"), JSON.stringify({ formatVersion: 1, projekt }));

    const storage = createJsonFileStorage(dir);
    expect(await storage.listFunktionsområden()).toEqual([fo]);
    expect(await storage.listPersoner()).toEqual([]);
    expect(await storage.getProjekt("p1")).toEqual(projekt);
  });

  it("upgrades a version 1 Borttagen to when it was taken away, dropping who and medFunktionsområde", async () => {
    const dir = await tempDir();
    await mkdir(join(dir, "projekt"));
    const gammal = { vem: "person1", tid: "2026-11-20T10:00:00.000Z" };
    await writeFile(
      join(dir, "funktionsomraden.json"),
      JSON.stringify({ formatVersion: 1, funktionsområden: [{ ...fo, borttagen: gammal }] }),
    );
    await writeFile(
      join(dir, "projekt", "p1.json"),
      JSON.stringify({ formatVersion: 1, projekt: { ...projekt, borttagen: { ...gammal, medFunktionsområde: true } } }),
    );

    const storage = createJsonFileStorage(dir);
    expect(await storage.listFunktionsområden()).toEqual([{ ...fo, borttagen: { tid: gammal.tid } }]);
    expect(await storage.getProjekt("p1")).toEqual({ ...projekt, borttagen: { tid: gammal.tid } });
  });

  it("reads an older Historik without the dates and Avslutat marks Apogee no longer keeps", async () => {
    const dir = await tempDir();
    await mkdir(join(dir, "projekt"));
    const gamla = [
      // A Markera Avslutat: nothing is left of it.
      { ...uppdatering("markerad"), typ: "avslutat", projekt: { före: { avslutat: false }, efter: { avslutat: true } } },
      // Old dates beside a Milstolpe: the Milstolpe stays.
      {
        ...uppdatering("blandad"),
        typ: "milstolpe",
        projekt: {
          före: { slutdatum: null, avslutat: false, milstolpar: [] },
          efter: { slutdatum: "2026-12-14", avslutat: false, milstolpar: [{ id: "m1", namn: "Demo" }] },
        },
      },
      // Only old dates, but Scope changes too: the Uppdatering stays without `projekt`.
      {
        ...uppdatering("återställd"),
        typ: "återställning",
        ändringar: [{ scopeId: "s1", före: null, efter: { namn: "A", läge: 10, ägare: "person1" } }],
        projekt: { före: { slutdatum: null }, efter: { slutdatum: "2026-12-21" } },
      },
    ];
    await writeFile(join(dir, "projekt", "p1.historik.jsonl"), gamla.map((u) => JSON.stringify(u) + "\n").join(""));

    expect(await createJsonFileStorage(dir).readHistorik("p1")).toEqual([
      {
        ...uppdatering("blandad"),
        typ: "milstolpe",
        projekt: { före: { milstolpar: [] }, efter: { milstolpar: [{ id: "m1", namn: "Demo" }] } },
      },
      {
        ...uppdatering("återställd"),
        typ: "återställning",
        ändringar: [{ scopeId: "s1", före: null, efter: { namn: "A", läge: 10, ägare: "person1" } }],
      },
    ]);
  });

  it("an upgraded document saved again reads back the same after a restart", async () => {
    const dir = await tempDir();
    await mkdir(join(dir, "projekt"));
    await writeFile(join(dir, "projekt", "p1.json"), JSON.stringify(projekt));
    const storage = createJsonFileStorage(dir);
    await storage.saveProjekt((await storage.getProjekt("p1"))!);

    expect(await createJsonFileStorage(dir).getProjekt("p1")).toEqual(projekt);
  });

  it("refuses data from a newer format version instead of misreading it", async () => {
    const dir = await tempDir();
    await mkdir(join(dir, "projekt"));
    await writeFile(join(dir, "projekt", "p1.json"), JSON.stringify({ formatVersion: 99, x: {} }));
    await expect(createJsonFileStorage(dir).getProjekt("p1")).rejects.toThrow(/format version 99/);
  });
});

describe("JSON files: ids", () => {
  it("never treats an id as a path", async () => {
    const storage = createJsonFileStorage(await tempDir());
    expect(await storage.getProjekt("../funktionsomraden")).toBeUndefined();
    expect(await storage.readHistorik("../../etc/passwd")).toEqual([]);
    await expect(storage.saveProjekt({ ...projekt, id: "../evil" })).rejects.toThrow();
  });
});
