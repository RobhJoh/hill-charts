import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

function setupTom(storage = createMemoryStorage()) {
  let n = 0;
  return createApogee({
    storage,
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
}

/** The Signatur used by tests that are not about Signatur. */
let vem: string;

/** An Apogee with one active Person, `vem`, to sign edits with. */
async function setup() {
  const apogee = setupTom();
  vem = (await apogee.createPerson("Testare", null)).id;
  return apogee;
}

describe("Signatur", () => {
  it("every write to Funktionsområden and Projekt needs a known, active Signatur", async () => {
    const storage = createMemoryStorage();
    const apogee = setupTom(storage);
    const anna = await apogee.createPerson("Anna", null);
    await storage.savePersoner([
      ...(await storage.listPersoner()),
      { id: "bortgången", namn: "Bo", aktiv: false, skapad: "2026-01-01T00:00:00.000Z" },
    ]);
    const fo = await apogee.createFunktionsområde("Ekonomi", anna.id);
    const p = await apogee.createProjekt(fo.id, "Fakturering", anna.id);
    const fo2 = await apogee.createFunktionsområde("Plattform", anna.id);

    for (const ogiltig of [null, "okänd", "bortgången"]) {
      const signatur = { code: "signatur" };
      await expect(apogee.createFunktionsområde("X", ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.renameFunktionsområde(fo.id, "X", ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.createProjekt(fo.id, "X", ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.renameProjekt(p.id, "X", ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.moveProjekt(p.id, fo2.id, ogiltig)).rejects.toMatchObject(signatur);
      await expect(apogee.createPerson("Cia", ogiltig)).rejects.toMatchObject(signatur);
    }
    expect(await apogee.overview()).toEqual([
      { id: fo.id, namn: "Ekonomi", projekt: [{ id: p.id, namn: "Fakturering" }] },
      { id: fo2.id, namn: "Plattform", projekt: [] },
    ]);
    expect((await apogee.listPersoner()).map((p) => p.namn)).toEqual(["Anna", "Bo"]);
  });
});

describe("Personer", () => {
  it("the first Person can be added to an empty list without a Signatur", async () => {
    const apogee = setupTom();
    const anna = await apogee.createPerson("Anna", null);
    expect(await apogee.listPersoner()).toEqual([{ id: anna.id, namn: "Anna", aktiv: true }]);
  });

  it("every Person after the first needs a known Signatur", async () => {
    const apogee = setupTom();
    const anna = await apogee.createPerson("Anna", null);
    await expect(apogee.createPerson("Bo", null)).rejects.toMatchObject({ code: "signatur" });
    await expect(apogee.createPerson("Bo", "okänd")).rejects.toMatchObject({ code: "signatur" });
    const bo = await apogee.createPerson("Bo", anna.id);
    expect((await apogee.listPersoner()).map((p) => p.id)).toEqual([anna.id, bo.id]);
  });

  it("names are unique ignoring letter case", async () => {
    const apogee = setupTom();
    const anna = await apogee.createPerson("Anna", null);
    await expect(apogee.createPerson(" ANNA ", anna.id)).rejects.toMatchObject({ code: "finns-redan" });
    expect(await apogee.listPersoner()).toHaveLength(1);
  });

  it("are listed in Swedish alphabetical order", async () => {
    const apogee = setupTom();
    const ö = await apogee.createPerson("Örjan", null);
    const å = await apogee.createPerson("Åsa", ö.id);
    const b = await apogee.createPerson("bo", ö.id);
    expect((await apogee.listPersoner()).map((p) => p.id)).toEqual([b.id, å.id, ö.id]);
  });
});

describe("Funktionsområden", () => {
  it("a created Funktionsområde appears in the overview", async () => {
    const apogee = await setup();
    const fo = await apogee.createFunktionsområde("Kundupplevelse", vem);
    expect(await apogee.overview()).toEqual([
      { id: fo.id, namn: "Kundupplevelse", projekt: [] },
    ]);
  });
});

describe("Projekt", () => {
  it("a Projekt created inside a Funktionsområde is listed under it", async () => {
    const apogee = await setup();
    const fo = await apogee.createFunktionsområde("Kundupplevelse", vem);
    const p = await apogee.createProjekt(fo.id, "Nytt bokningsflöde", vem);
    expect(await apogee.overview()).toEqual([
      { id: fo.id, namn: "Kundupplevelse", projekt: [{ id: p.id, namn: "Nytt bokningsflöde" }] },
    ]);
    expect(await apogee.getFunktionsområde(fo.id)).toEqual({
      id: fo.id,
      namn: "Kundupplevelse",
      projekt: [{ id: p.id, namn: "Nytt bokningsflöde" }],
    });
  });

  it("a Projekt page shows its name and its Funktionsområde for the breadcrumb", async () => {
    const apogee = await setup();
    const fo = await apogee.createFunktionsområde("Plattform", vem);
    const p = await apogee.createProjekt(fo.id, "Sökindex", vem);
    expect(await apogee.getProjekt(p.id)).toMatchObject({
      id: p.id,
      namn: "Sökindex",
      funktionsområde: { id: fo.id, namn: "Plattform" },
      scopes: [],
    });
  });

  it("renaming a Projekt changes its name everywhere it is shown", async () => {
    const apogee = await setup();
    const fo = await apogee.createFunktionsområde("Plattform", vem);
    const p = await apogee.createProjekt(fo.id, "Sökindx", vem);
    await apogee.renameProjekt(p.id, "Sökindex", vem);
    expect((await apogee.getProjekt(p.id)).namn).toBe("Sökindex");
    expect((await apogee.getFunktionsområde(fo.id)).projekt).toEqual([
      { id: p.id, namn: "Sökindex" },
    ]);
  });

  it("a Projekt moved to another Funktionsområde is listed there and its breadcrumb follows", async () => {
    const apogee = await setup();
    const från = await apogee.createFunktionsområde("Plattform", vem);
    const till = await apogee.createFunktionsområde("Ekonomi", vem);
    const p = await apogee.createProjekt(från.id, "Betaltjänst", vem);
    await apogee.moveProjekt(p.id, till.id, vem);
    expect((await apogee.getFunktionsområde(från.id)).projekt).toEqual([]);
    expect((await apogee.getFunktionsområde(till.id)).projekt).toEqual([
      { id: p.id, namn: "Betaltjänst" },
    ]);
    expect((await apogee.getProjekt(p.id)).funktionsområde).toEqual({ id: till.id, namn: "Ekonomi" });
  });
});

describe("names", () => {
  it("are trimmed", async () => {
    const apogee = await setup();
    const fo = await apogee.createFunktionsområde("  Ekonomi ", vem);
    const p = await apogee.createProjekt(fo.id, " Fakturering  ", vem);
    expect(await apogee.getProjekt(p.id)).toMatchObject({
      namn: "Fakturering",
      funktionsområde: { namn: "Ekonomi" },
    });
  });

  it("must not be blank, whether creating or renaming", async () => {
    const apogee = await setup();
    await expect(apogee.createFunktionsområde("   ", vem)).rejects.toMatchObject({ code: "ogiltig" });
    const fo = await apogee.createFunktionsområde("Ekonomi", vem);
    await expect(apogee.renameFunktionsområde(fo.id, "", vem)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.createProjekt(fo.id, " ", vem)).rejects.toMatchObject({ code: "ogiltig" });
    const p = await apogee.createProjekt(fo.id, "Fakturering", vem);
    await expect(apogee.renameProjekt(p.id, "\t", vem)).rejects.toMatchObject({ code: "ogiltig" });
    expect(await apogee.overview()).toEqual([
      { id: fo.id, namn: "Ekonomi", projekt: [{ id: p.id, namn: "Fakturering" }] },
    ]);
  });

  it("must not be longer than 200 characters", async () => {
    const apogee = await setup();
    await expect(apogee.createFunktionsområde("x".repeat(201), vem)).rejects.toMatchObject({
      code: "ogiltig",
    });
  });
});

describe("unknown ids", () => {
  it("are rejected as finns-inte by every command and query", async () => {
    const apogee = await setup();
    const fo = await apogee.createFunktionsområde("Ekonomi", vem);
    const p = await apogee.createProjekt(fo.id, "Fakturering", vem);
    const finnsInte = { code: "finns-inte" };
    await expect(apogee.getFunktionsområde("saknas")).rejects.toMatchObject(finnsInte);
    await expect(apogee.renameFunktionsområde("saknas", "X", vem)).rejects.toMatchObject(finnsInte);
    await expect(apogee.getProjekt("saknas")).rejects.toMatchObject(finnsInte);
    await expect(apogee.renameProjekt("saknas", "X", vem)).rejects.toMatchObject(finnsInte);
    await expect(apogee.createProjekt("saknas", "X", vem)).rejects.toMatchObject(finnsInte);
    await expect(apogee.moveProjekt("saknas", fo.id, vem)).rejects.toMatchObject(finnsInte);
    await expect(apogee.moveProjekt(p.id, "saknas", vem)).rejects.toMatchObject(finnsInte);
    expect((await apogee.getProjekt(p.id)).funktionsområde.id).toBe(fo.id);
  });
});

describe("ordering", () => {
  it("lists Funktionsområden and their Projekt alphabetically in Swedish order", async () => {
    const apogee = await setup();
    const ö = await apogee.createFunktionsområde("Övrigt", vem);
    const a = await apogee.createFunktionsområde("ekonomi", vem);
    const z = await apogee.createFunktionsområde("Zebra", vem);
    const p1 = await apogee.createProjekt(a.id, "Årsbokslut", vem);
    const p2 = await apogee.createProjekt(a.id, "Budget", vem);
    const overview = await apogee.overview();
    expect(overview.map((f) => f.id)).toEqual([a.id, z.id, ö.id]);
    expect(overview[0]!.projekt.map((p) => p.id)).toEqual([p2.id, p1.id]);
  });
});

describe("renaming a Funktionsområde", () => {
  it("changes its name on its page, in the overview and in its Projekts' breadcrumbs", async () => {
    const apogee = await setup();
    const fo = await apogee.createFunktionsområde("HR", vem);
    const p = await apogee.createProjekt(fo.id, "Rekrytering", vem);
    await apogee.renameFunktionsområde(fo.id, "HR & Personal", vem);
    expect((await apogee.getFunktionsområde(fo.id)).namn).toBe("HR & Personal");
    expect((await apogee.overview()).map((f) => f.namn)).toEqual(["HR & Personal"]);
    expect((await apogee.getProjekt(p.id)).funktionsområde.namn).toBe("HR & Personal");
  });
});
