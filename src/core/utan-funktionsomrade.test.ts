// Utan funktionsområde (#74): Projekt that belong to no Funktionsområde.
import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import type { Projekt } from "./types.js";

const skapad = "2026-11-01T10:00:00.000Z";

/**
 * An Apogee with one active Person, Anna. Projekt without a Funktionsområde
 * only arrive through the Notion sync, so tests put them straight into storage.
 */
async function setup() {
  const storage = createMemoryStorage();
  let n = 0;
  const apogee = createApogee({ storage, now: () => new Date("2026-11-24T10:00:00Z"), newId: () => `id${++n}` });
  const anna = (await apogee.createPerson("Anna", null)).id;
  const utan = async (id: string, namn: string, extra: Partial<Projekt> = {}) =>
    storage.saveProjekt({ id, namn, skapad, ...extra });
  return { apogee, storage, anna, utan };
}

describe("a Projekt without a Funktionsområde", () => {
  it("opens, and its Hill chart works as usual", async () => {
    const { apogee, anna, utan } = await setup();
    await utan("p1", "Sökindex");
    const { id } = await apogee.addScope("p1", { namn: "Indexering", ägare: anna }, anna);
    await apogee.moveScope("p1", id, 60, anna);

    const p = await apogee.getProjekt("p1");
    expect(p).toMatchObject({ id: "p1", namn: "Sökindex", funktionsområde: null, datumVarningar: [] });
    expect(p.scopes.map((s) => [s.namn, s.läge])).toEqual([["Indexering", 60]]);
    expect((await apogee.historik("p1")).map((u) => u.typ)).toContain("flytt");
  });

  it("is listed under Utan funktionsområde, in name order, and in no Funktionsområde", async () => {
    const { apogee, anna, utan } = await setup();
    const fo = await apogee.createFunktionsområde("Ekonomi", anna);
    await apogee.createProjekt(fo.id, "Kassan", anna);
    await utan("p1", "Sökindex");
    await utan("p2", "Arkiv");

    expect((await apogee.overview()).map((f) => [f.namn, f.projekt.map((p) => p.namn)])).toEqual([
      ["Ekonomi", ["Kassan"]],
    ]);
    const grupp = await apogee.utanFunktionsområde();
    expect(grupp?.projekt.map((p) => [p.id, p.namn])).toEqual([
      ["p2", "Arkiv"],
      ["p1", "Sökindex"],
    ]);
  });

  it("the group has no dates, status or Över tid of its own", async () => {
    const { apogee, utan } = await setup();
    await utan("p1", "Sökindex");
    expect(Object.keys((await apogee.utanFunktionsområde())!)).toEqual(["projekt"]);
  });

  it("there is no Utan funktionsområde group when every Projekt has a Funktionsområde", async () => {
    const { apogee, anna, utan } = await setup();
    expect(await apogee.utanFunktionsområde()).toBeNull();
    const fo = await apogee.createFunktionsområde("Ekonomi", anna);
    await apogee.createProjekt(fo.id, "Kassan", anna);
    expect(await apogee.utanFunktionsområde()).toBeNull();
    await utan("p1", "Sökindex");
    await apogee.taBortProjekt("p1", anna);
    expect(await apogee.utanFunktionsområde()).toBeNull();
  });

  it("can be taken away and brought back", async () => {
    const { apogee, anna, utan } = await setup();
    await utan("p1", "Sökindex");
    await apogee.taBortProjekt("p1", anna);
    expect((await apogee.getProjekt("p1")).borttagen).not.toBeNull();
    await apogee.återställProjekt("p1", anna);
    expect((await apogee.getProjekt("p1")).borttagen).toBeNull();
  });
});
