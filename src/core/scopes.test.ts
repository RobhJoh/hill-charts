import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

/** An Apogee with a Projekt and two active Personer, Anna and Erik. */
async function setup(storage = createMemoryStorage()) {
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const apogee = createApogee({ storage, now: () => klocka, newId: () => `id${++n}` });
  const anna = (await apogee.createPerson("Anna", null)).id;
  const erik = (await apogee.createPerson("Erik", anna)).id;
  const fo = await apogee.createFunktionsområde("Ekonomi", anna);
  const projekt = (await apogee.createProjekt(fo.id, "Kassan", anna)).id;
  const senare = (minuter: number) => {
    klocka = new Date(klocka.getTime() + minuter * 60_000);
  };
  return { apogee, storage, anna, erik, projekt, senare };
}

describe("Scopes", () => {
  it("a new Scope starts at Läge 0 with its Ägare, and shows on the Projekt", async () => {
    const { apogee, anna, erik, projekt } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: " Prislista ", ägare: erik }, anna);
    const p = await apogee.getProjekt(projekt);
    expect(p.scopes).toEqual([
      {
        id,
        namn: "Prislista",
        läge: 0,
        ägare: { id: erik, namn: "Erik", aktiv: true },
        flyttad: "2026-11-24T10:00:00.000Z",
        stillaDagar: 0,
        stilla: false,
      },
    ]);
  });

  it("every drop is its own Uppdatering, signed, and Läge is clamped to 0–100", async () => {
    const { apogee, anna, erik, projekt, senare } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    senare(5);
    await apogee.moveScope(projekt, id, 42.4, erik);
    await apogee.moveScope(projekt, id, 140, erik);
    await apogee.moveScope(projekt, id, -3, anna);
    const flytt = (await apogee.historik(projekt)).filter((u) => u.typ === "flytt");
    expect(flytt.map((u) => [u.vem, u.ändringar[0]!.före!.läge, u.ändringar[0]!.efter!.läge])).toEqual([
      [erik, 0, 42],
      [erik, 42, 100],
      [anna, 100, 0],
    ]);
    expect(flytt[0]!.tid).toBe("2026-11-24T10:05:00.000Z");
    expect((await apogee.getProjekt(projekt)).scopes[0]).toMatchObject({ läge: 0, flyttad: "2026-11-24T10:05:00.000Z" });
  });

  it("a drop to where the Scope already is writes nothing", async () => {
    const { apogee, anna, projekt } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    expect(await apogee.moveScope(projekt, id, 0, anna)).toBeNull();
    expect(await apogee.historik(projekt)).toHaveLength(1);
  });

  it("rename and change of Ägare are Uppdateringar; Ägare must be an active Person and is never cleared", async () => {
    const { apogee, storage, anna, erik, projekt } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.renameScope(projekt, id, "Prisvy", erik);
    await apogee.changeScopeÄgare(projekt, id, erik, erik);
    await storage.savePersoner(
      (await storage.listPersoner()).concat({ id: "bo", namn: "Bo", aktiv: false, skapad: "2026-01-01T00:00:00Z" }),
    );
    for (const ogiltig of ["", "okänd", "bo"]) {
      await expect(apogee.changeScopeÄgare(projekt, id, ogiltig, anna)).rejects.toMatchObject({ code: "ogiltig" });
      await expect(apogee.addScope(projekt, { namn: "X", ägare: ogiltig }, anna)).rejects.toMatchObject({
        code: "ogiltig",
      });
    }
    await expect(apogee.renameScope(projekt, id, "  ", anna)).rejects.toMatchObject({ code: "ogiltig" });
    expect((await apogee.historik(projekt)).map((u) => u.typ)).toEqual(["ny", "byt namn", "byt ägare"]);
    expect((await apogee.getProjekt(projekt)).scopes).toEqual([
      expect.objectContaining({ id, namn: "Prisvy", ägare: { id: erik, namn: "Erik", aktiv: true } }),
    ]);
  });

  it("a removed Scope is gone from the chart, keeps its id in the Historik, and can't be edited", async () => {
    const { apogee, anna, projekt } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.moveScope(projekt, id, 30, anna);
    const borttagen = await apogee.removeScope(projekt, id, anna);
    expect(borttagen).toMatchObject({
      typ: "ta bort",
      ändringar: [{ scopeId: id, före: { namn: "Prislista", läge: 30, ägare: anna }, efter: null }],
    });
    expect((await apogee.getProjekt(projekt)).scopes).toEqual([]);
    await expect(apogee.moveScope(projekt, id, 50, anna)).rejects.toMatchObject({ code: "finns-inte" });
    await expect(apogee.removeScope(projekt, id, anna)).rejects.toMatchObject({ code: "finns-inte" });
  });

  it("every Scope command needs a known, active Signatur and an existing Projekt", async () => {
    const { apogee, anna, projekt } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    for (const ogiltig of [null, "okänd"]) {
      const signatur = { code: "signatur" };
      await expect(apogee.addScope(projekt, { namn: "X", ägare: anna }, ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.moveScope(projekt, id, 10, ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.renameScope(projekt, id, "X", ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.changeScopeÄgare(projekt, id, anna, ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.removeScope(projekt, id, ogiltig)).rejects.toMatchObject(signatur);
    }
    await expect(apogee.addScope("nej", { namn: "X", ägare: anna }, anna)).rejects.toMatchObject({
      code: "finns-inte",
    });
    expect(await apogee.historik(projekt)).toHaveLength(1);
  });

  it("the chart is the fold of the Uppdateringar, ordered by Läge", async () => {
    const { apogee, anna, erik, projekt } = await setup();
    const a = (await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna)).id;
    const b = (await apogee.addScope(projekt, { namn: "Kassaflöde", ägare: erik }, erik)).id;
    const c = (await apogee.addScope(projekt, { namn: "Kvittomejl", ägare: anna }, anna)).id;
    await apogee.moveScope(projekt, a, 72, anna);
    await apogee.moveScope(projekt, b, 38, erik);
    await apogee.removeScope(projekt, c, erik);
    await apogee.moveScope(projekt, b, 80, erik);
    await apogee.renameScope(projekt, a, "Priser", anna);

    const vy = (await apogee.getProjekt(projekt)).scopes.map((s) => [s.namn, s.läge, s.ägare.id]);
    expect(vy).toEqual([
      ["Kassaflöde", 80, erik],
      ["Priser", 72, anna],
    ]);
  });
});
