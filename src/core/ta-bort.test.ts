import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

/** An Apogee with Funktionsområde Ekonomi holding Projekt Kassan, and two Personer. */
async function setup(storage = createMemoryStorage()) {
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const apogee = createApogee({ storage, now: () => klocka, newId: () => `id${++n}` });
  const anna = (await apogee.createPerson("Anna", null)).id;
  const bo = (await apogee.createPerson("Bo", anna)).id;
  const fo = (await apogee.createFunktionsområde("Ekonomi", anna)).id;
  const kassan = (await apogee.createProjekt(fo, "Kassan", anna)).id;
  const senare = (ms: number) => {
    klocka = new Date(klocka.getTime() + ms);
  };
  const projektI = async (f = fo) => (await apogee.getFunktionsområde(f)).projekt.map((p) => p.namn);
  return { apogee, storage, anna, bo, fo, kassan, senare, projektI };
}

describe("Ta bort a Projekt", () => {
  it("hides it from its Funktionsområde and the overview, and lists it as Borttagen with who and when", async () => {
    const { apogee, bo, fo, kassan, senare, projektI } = await setup();
    await apogee.createProjekt(fo, "Moms", bo);
    senare(60_000);
    await apogee.taBortProjekt(kassan, bo);

    expect(await projektI()).toEqual(["Moms"]);
    expect((await apogee.overview())[0]!.projekt.map((p) => p.namn)).toEqual(["Moms"]);
    expect((await apogee.getFunktionsområde(fo)).borttagnaProjekt).toEqual([
      {
        id: kassan,
        namn: "Kassan",
        borttagen: { vem: { id: bo, namn: "Bo", aktiv: true }, tid: "2026-11-24T10:01:00.000Z" },
      },
    ]);
  });
});

describe("a Borttagen Projekt", () => {
  it("keeps its Hill chart, status and Historik, and says who took it away", async () => {
    const { apogee, anna, kassan } = await setup();
    await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await apogee.taBortProjekt(kassan, anna);
    const vy = await apogee.getProjekt(kassan);
    expect(vy).toMatchObject({
      scopes: [{ namn: "Kvitton" }],
      status: "inte påbörjat",
      borttagen: { vem: { id: anna, namn: "Anna" }, tid: "2026-11-24T10:00:00.000Z" },
    });
    expect(await apogee.historik(kassan)).toHaveLength(1);
  });

  it("cannot be taken away twice", async () => {
    const { apogee, anna, kassan } = await setup();
    await apogee.taBortProjekt(kassan, anna);
    await expect(apogee.taBortProjekt(kassan, anna)).rejects.toMatchObject({ code: "ogiltig" });
  });

  it("comes back whole on Återställ", async () => {
    const { apogee, anna, bo, fo, kassan, projektI } = await setup();
    await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await apogee.taBortProjekt(kassan, anna);
    await apogee.återställProjekt(kassan, bo);
    expect(await projektI()).toEqual(["Kassan"]);
    expect((await apogee.getFunktionsområde(fo)).borttagnaProjekt).toEqual([]);
    expect(await apogee.getProjekt(kassan)).toMatchObject({
      scopes: [{ namn: "Kvitton" }],
      borttagen: null,
    });
  });

  it("Återställ needs a Signatur and a Borttagen Projekt", async () => {
    const { apogee, anna, kassan } = await setup();
    await expect(apogee.återställProjekt(kassan, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await apogee.taBortProjekt(kassan, anna);
    await expect(apogee.återställProjekt(kassan, null)).rejects.toMatchObject({ code: "signatur" });
    await expect(apogee.taBortProjekt("okänt", anna)).rejects.toMatchObject({ code: "finns-inte" });
  });
});

describe("Ta bort a Funktionsområde", () => {
  it("is blocked, with a reason naming them, while any of its Projekt is Pågående", async () => {
    const { apogee, anna, fo, kassan } = await setup();
    const { id } = await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await apogee.moveScope(kassan, id, 40, anna);
    await expect(apogee.taBortFunktionsområde(fo, anna)).rejects.toMatchObject({
      code: "ogiltig",
      message: expect.stringContaining("Kassan"),
    });
    expect((await apogee.overview()).map((f) => f.namn)).toEqual(["Ekonomi"]);
    await apogee.moveScope(kassan, id, 100, anna);
    await apogee.taBortFunktionsområde(fo, anna);
    expect(await apogee.overview()).toEqual([]);
  });

  it("is not blocked by a Projekt taken away on its own earlier", async () => {
    const { apogee, anna, fo, kassan } = await setup();
    await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await apogee.taBortProjekt(kassan, anna);
    await apogee.taBortFunktionsområde(fo, anna);
    expect(await apogee.overview()).toEqual([]);
  });

  it("takes its Projekt with it and lists it under Borttagna Funktionsområden with who and when", async () => {
    const { apogee, anna, bo, fo, kassan, senare } = await setup();
    const moms = (await apogee.createProjekt(fo, "Moms", anna)).id;
    await apogee.taBortProjekt(moms, anna);
    senare(60_000);
    await apogee.taBortFunktionsområde(fo, bo);

    expect((await apogee.getProjekt(kassan)).borttagen).toEqual({
      vem: { id: bo, namn: "Bo", aktiv: true },
      tid: "2026-11-24T10:01:00.000Z",
    });
    expect(await apogee.borttagnaFunktionsområden()).toMatchObject([
      {
        id: fo,
        namn: "Ekonomi",
        borttagen: { vem: { id: bo }, tid: "2026-11-24T10:01:00.000Z" },
        projekt: [{ id: kassan, namn: "Kassan" }],
        borttagnaProjekt: [{ id: moms, namn: "Moms", borttagen: { vem: { id: anna } } }],
      },
    ]);
  });

  it("Återställ brings back the Projekt that went with it; one taken away on its own stays Borttagen", async () => {
    const { apogee, anna, fo, kassan, projektI } = await setup();
    const moms = (await apogee.createProjekt(fo, "Moms", anna)).id;
    await apogee.taBortProjekt(moms, anna);
    await apogee.taBortFunktionsområde(fo, anna);

    await expect(apogee.återställProjekt(kassan, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.återställProjekt(moms, anna)).rejects.toMatchObject({ code: "ogiltig" });

    await apogee.återställFunktionsområde(fo, anna);
    expect(await apogee.borttagnaFunktionsområden()).toEqual([]);
    expect((await apogee.overview()).map((f) => f.namn)).toEqual(["Ekonomi"]);
    expect(await projektI()).toEqual(["Kassan"]);
    expect((await apogee.getFunktionsområde(fo)).borttagnaProjekt).toMatchObject([{ id: moms }]);
    expect((await apogee.getProjekt(kassan)).borttagen).toBeNull();

    await apogee.återställProjekt(moms, anna);
    expect(await projektI()).toEqual(["Kassan", "Moms"]);
  });

  it("cannot be taken away twice, nor restored unless Borttaget, and needs a Signatur", async () => {
    const { apogee, anna, fo } = await setup();
    await expect(apogee.återställFunktionsområde(fo, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.taBortFunktionsområde(fo, null)).rejects.toMatchObject({ code: "signatur" });
    await apogee.taBortFunktionsområde(fo, anna);
    await expect(apogee.taBortFunktionsområde(fo, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.taBortFunktionsområde("okänt", anna)).rejects.toMatchObject({ code: "finns-inte" });
  });

  it("a Borttaget Funktionsområde cannot take new or moved Projekt", async () => {
    const { apogee, anna, fo } = await setup();
    const annat = (await apogee.createFunktionsområde("Plattform", anna)).id;
    const sök = (await apogee.createProjekt(annat, "Sök", anna)).id;
    await apogee.taBortFunktionsområde(fo, anna);
    await expect(apogee.createProjekt(fo, "Nytt", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.moveProjekt(sök, fo, anna)).rejects.toMatchObject({ code: "ogiltig" });
  });
});

describe("Radera", () => {
  it("erases a Borttagen Projekt for good, Historik included, when its exact name is typed", async () => {
    const { apogee, storage, anna, fo, kassan } = await setup();
    await apogee.addScope(kassan, { namn: "Kvitton", ägare: anna }, anna);
    await apogee.taBortProjekt(kassan, anna);
    await expect(apogee.raderaProjekt(kassan, "kassan", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.raderaProjekt(kassan, "Kassan", null)).rejects.toMatchObject({ code: "signatur" });

    await apogee.raderaProjekt(kassan, "Kassan", anna);
    await expect(apogee.getProjekt(kassan)).rejects.toMatchObject({ code: "finns-inte" });
    expect((await apogee.getFunktionsområde(fo)).borttagnaProjekt).toEqual([]);
    expect(await storage.readHistorik(kassan)).toEqual([]);
  });

  it("is only for Borttagna: a shown Projekt or Funktionsområde cannot be erased", async () => {
    const { apogee, anna, fo, kassan } = await setup();
    await expect(apogee.raderaProjekt(kassan, "Kassan", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.raderaFunktionsområde(fo, "Ekonomi", anna)).rejects.toMatchObject({ code: "ogiltig" });
    expect((await apogee.getProjekt(kassan)).namn).toBe("Kassan");
  });

  it("a Projekt that went with its Funktionsområde is erased only with it", async () => {
    const { apogee, anna, fo, kassan } = await setup();
    await apogee.taBortFunktionsområde(fo, anna);
    await expect(apogee.raderaProjekt(kassan, "Kassan", anna)).rejects.toMatchObject({ code: "ogiltig" });
  });

  it("on a Funktionsområde erases every Projekt in it, including those taken away on their own", async () => {
    const { apogee, storage, anna, fo, kassan } = await setup();
    const moms = (await apogee.createProjekt(fo, "Moms", anna)).id;
    await apogee.addScope(moms, { namn: "Deklaration", ägare: anna }, anna);
    await apogee.taBortProjekt(moms, anna);
    const annat = (await apogee.createFunktionsområde("Plattform", anna)).id;
    const sök = (await apogee.createProjekt(annat, "Sök", anna)).id;
    await apogee.taBortFunktionsområde(fo, anna);
    await expect(apogee.raderaFunktionsområde(fo, "ekonomi", anna)).rejects.toMatchObject({ code: "ogiltig" });

    await apogee.raderaFunktionsområde(fo, "Ekonomi", anna);
    expect(await apogee.borttagnaFunktionsområden()).toEqual([]);
    await expect(apogee.getFunktionsområde(fo)).rejects.toMatchObject({ code: "finns-inte" });
    for (const p of [kassan, moms]) {
      await expect(apogee.getProjekt(p)).rejects.toMatchObject({ code: "finns-inte" });
      expect(await storage.readHistorik(p)).toEqual([]);
    }
    expect((await storage.listProjekt()).map((p) => p.id)).toEqual([sök]);
    expect((await apogee.overview()).map((f) => f.namn)).toEqual(["Plattform"]);
  });
});
