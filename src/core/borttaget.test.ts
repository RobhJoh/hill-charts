// Borttaget and back (#76): the Notion sync takes Projekt and
// Funktionsområden away and brings them back (ADR 0003, docs/notion-sync.md).
import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "./test-struktur.js";

/** An Apogee with Funktionsområde Ekonomi holding Projekt Kassan, and Person Anna. */
async function setup() {
  const storage = createMemoryStorage();
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const källa = createMemoryNotion();
  const apogee = createApogee({ storage, notion: källa, now: () => klocka, newId: () => `id${++n}` });
  const notion = notionStruktur(apogee, källa, storage);
  const anna = (await apogee.createPerson("Anna", null)).id;
  const kassan = await notion.projekt("Kassan", "Ekonomi");
  const fo = await notion.funktionsområdeId("Ekonomi");
  const senare = (ms: number) => {
    klocka = new Date(klocka.getTime() + ms);
  };
  const visade = async () => (await apogee.overview()).map((f) => [f.namn, f.projekt.map((p) => p.namn)]);
  return { apogee, storage, källa, notion, anna, fo, kassan, senare, visade };
}

describe("a Projekt missing from Notion", () => {
  it("becomes Borttaget, with its Hill chart and Historik kept, and comes back as it was", async () => {
    const { apogee, notion, anna, fo, kassan, senare, visade } = await setup();
    await notion.projekt("Moms", "Ekonomi");
    const { id } = await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await apogee.moveScope(kassan, id, 40, anna);
    const historik = await apogee.historik(kassan);
    senare(60_000);

    await notion.avbocka("Kassan");

    expect(await visade()).toEqual([["Ekonomi", ["Moms"]]]);
    expect((await apogee.getFunktionsområde(fo)).borttagnaProjekt).toEqual([
      { id: kassan, namn: "Kassan", borttagen: { tid: "2026-11-24T10:01:00.000Z" } },
    ]);
    expect(await apogee.getProjekt(kassan)).toMatchObject({
      borttagen: { tid: "2026-11-24T10:01:00.000Z" },
      scopes: [{ namn: "Kvitton", läge: 40 }],
    });
    expect(await apogee.historik(kassan)).toEqual(historik);

    await notion.projekt("Kassan", "Ekonomi");

    expect(await visade()).toEqual([["Ekonomi", ["Kassan", "Moms"]]]);
    expect(await apogee.getProjekt(kassan)).toMatchObject({ borttagen: null, scopes: [{ namn: "Kvitton", läge: 40 }] });
    expect(await apogee.historik(kassan)).toEqual(historik);
  });
});

describe("Ta bort and Återställ", () => {
  it("are not done by hand: only the Notion sync takes away and brings back", async () => {
    const { apogee } = await setup();
    for (const borttaget of ["taBortProjekt", "återställProjekt", "taBortFunktionsområde", "återställFunktionsområde"]) {
      expect(apogee).not.toHaveProperty(borttaget);
    }
  });
});

describe("Radera", () => {
  it("erases a Borttaget Projekt for good, Historik included, when its exact name is typed", async () => {
    const { apogee, storage, notion, anna, fo, kassan } = await setup();
    await notion.projekt("Moms", "Ekonomi");
    await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await expect(apogee.raderaProjekt(kassan, "Kassan", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await notion.avbocka("Kassan");
    await expect(apogee.raderaProjekt(kassan, "kassan", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.raderaProjekt(kassan, "Kassan", null)).rejects.toMatchObject({ code: "signatur" });

    await apogee.raderaProjekt(kassan, "Kassan", anna);

    await expect(apogee.getProjekt(kassan)).rejects.toMatchObject({ code: "finns-inte" });
    expect((await apogee.getFunktionsområde(fo)).borttagnaProjekt).toEqual([]);
    expect(await storage.readHistorik(kassan)).toEqual([]);
  });

  it("erases a Borttaget Funktionsområde and every Projekt in it; a shown one cannot be erased", async () => {
    const { apogee, storage, notion, anna, fo, kassan } = await setup();
    const moms = await notion.projekt("Moms", "Ekonomi");
    await apogee.addScope(moms, { namn: "Deklaration", ägare: anna }, anna);
    const sök = await notion.projekt("Sök", "Plattform");
    await expect(apogee.raderaFunktionsområde(fo, "Ekonomi", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await notion.avbocka("Kassan");
    await notion.avbocka("Moms");
    await expect(apogee.raderaFunktionsområde(fo, "ekonomi", anna)).rejects.toMatchObject({ code: "ogiltig" });

    await apogee.raderaFunktionsområde(fo, "Ekonomi", anna);

    expect(await apogee.borttagnaFunktionsområden()).toEqual([]);
    await expect(apogee.getFunktionsområde(fo)).rejects.toMatchObject({ code: "finns-inte" });
    for (const p of [kassan, moms]) {
      await expect(apogee.getProjekt(p)).rejects.toMatchObject({ code: "finns-inte" });
      expect(await storage.readHistorik(p)).toEqual([]);
    }
    expect((await storage.listProjekt()).map((p) => p.id)).toEqual([sök]);
  });

  it("then ticking it again in Notion gives a new Projekt with an empty Hill chart", async () => {
    const { apogee, notion, anna, kassan, visade } = await setup();
    await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await notion.avbocka("Kassan");
    await apogee.raderaFunktionsområde(await notion.funktionsområdeId("Ekonomi"), "Ekonomi", anna);

    const igen = await notion.projekt("Kassan", "Ekonomi");

    expect(igen).not.toBe(kassan);
    expect(await visade()).toEqual([["Ekonomi", ["Kassan"]]]);
    expect(await apogee.getProjekt(igen)).toMatchObject({ borttagen: null, scopes: [] });
    expect(await apogee.historik(igen)).toEqual([]);
  });
});

describe("a failed fetch from Notion", () => {
  it("changes nothing and records the error in the sync state until a fetch succeeds", async () => {
    const { apogee, källa, notion, senare, visade } = await setup();
    källa.utan("notion-Kassan");
    källa.misslyckas(new Error("Notion svarar inte"));
    senare(60_000);

    await expect(apogee.synkaFrånNotion()).rejects.toThrow("Notion svarar inte");

    expect(await visade()).toEqual([["Ekonomi", ["Kassan"]]]);
    expect(await apogee.borttagnaFunktionsområden()).toEqual([]);
    expect(apogee.synkStatus()).toEqual({
      senastHämtat: "2026-11-24T10:00:00.000Z",
      fel: { tid: "2026-11-24T10:01:00.000Z", meddelande: "Notion svarar inte" },
    });

    källa.misslyckas(null);
    await notion.projekt("Kassan", "Ekonomi");
    expect(apogee.synkStatus()).toEqual({ senastHämtat: "2026-11-24T10:01:00.000Z", fel: null });
  });
});

describe("a Funktionsområde whose last Projekt leaves", () => {
  it("becomes Borttaget, and returns with a Projekt", async () => {
    const { apogee, notion, fo, kassan, senare, visade } = await setup();
    await notion.projekt("Moms", "Ekonomi");
    await notion.projekt("Sök", "Plattform");
    senare(60_000);

    await notion.avbocka("Kassan");
    expect(await visade()).toEqual([
      ["Ekonomi", ["Moms"]],
      ["Plattform", ["Sök"]],
    ]);
    await notion.avbocka("Moms");

    expect(await visade()).toEqual([["Plattform", ["Sök"]]]);
    expect(await apogee.borttagnaFunktionsområden()).toMatchObject([
      {
        id: fo,
        namn: "Ekonomi",
        borttagen: { tid: "2026-11-24T10:01:00.000Z" },
        projekt: [],
        borttagnaProjekt: [{ namn: "Kassan" }, { namn: "Moms" }],
      },
    ]);

    await notion.projekt("Moms", "Ekonomi");

    expect(await visade()).toEqual([
      ["Ekonomi", ["Moms"]],
      ["Plattform", ["Sök"]],
    ]);
    expect(await apogee.borttagnaFunktionsområden()).toEqual([]);
    expect((await apogee.getFunktionsområde(fo)).borttagnaProjekt).toMatchObject([{ id: kassan }]);
  });

  it("also leaves when its Projekt move to another Funktionsområde in Notion", async () => {
    const { apogee, notion, visade } = await setup();
    await notion.projekt("Sök", "Plattform");
    await notion.ändraProjekt("Kassan", { funktionsområde: "notion-Plattform" });
    expect(await visade()).toEqual([["Plattform", ["Kassan", "Sök"]]]);
    expect((await apogee.borttagnaFunktionsområden()).map((f) => f.namn)).toEqual(["Ekonomi"]);
  });
});
