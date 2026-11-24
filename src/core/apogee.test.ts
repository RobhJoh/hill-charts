import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

function setup() {
  let n = 0;
  return createApogee({
    storage: createMemoryStorage(),
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
}

describe("Funktionsområden", () => {
  it("a created Funktionsområde appears in the overview", async () => {
    const apogee = setup();
    const fo = await apogee.createFunktionsområde("Kundupplevelse");
    expect(await apogee.overview()).toEqual([
      { id: fo.id, namn: "Kundupplevelse", projekt: [] },
    ]);
  });
});

describe("Projekt", () => {
  it("a Projekt created inside a Funktionsområde is listed under it", async () => {
    const apogee = setup();
    const fo = await apogee.createFunktionsområde("Kundupplevelse");
    const p = await apogee.createProjekt(fo.id, "Nytt bokningsflöde");
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
    const apogee = setup();
    const fo = await apogee.createFunktionsområde("Plattform");
    const p = await apogee.createProjekt(fo.id, "Sökindex");
    expect(await apogee.getProjekt(p.id)).toEqual({
      id: p.id,
      namn: "Sökindex",
      funktionsområde: { id: fo.id, namn: "Plattform" },
    });
  });

  it("renaming a Projekt changes its name everywhere it is shown", async () => {
    const apogee = setup();
    const fo = await apogee.createFunktionsområde("Plattform");
    const p = await apogee.createProjekt(fo.id, "Sökindx");
    await apogee.renameProjekt(p.id, "Sökindex");
    expect((await apogee.getProjekt(p.id)).namn).toBe("Sökindex");
    expect((await apogee.getFunktionsområde(fo.id)).projekt).toEqual([
      { id: p.id, namn: "Sökindex" },
    ]);
  });

  it("a Projekt moved to another Funktionsområde is listed there and its breadcrumb follows", async () => {
    const apogee = setup();
    const från = await apogee.createFunktionsområde("Plattform");
    const till = await apogee.createFunktionsområde("Ekonomi");
    const p = await apogee.createProjekt(från.id, "Betaltjänst");
    await apogee.moveProjekt(p.id, till.id);
    expect((await apogee.getFunktionsområde(från.id)).projekt).toEqual([]);
    expect((await apogee.getFunktionsområde(till.id)).projekt).toEqual([
      { id: p.id, namn: "Betaltjänst" },
    ]);
    expect((await apogee.getProjekt(p.id)).funktionsområde).toEqual({ id: till.id, namn: "Ekonomi" });
  });
});

describe("names", () => {
  it("are trimmed", async () => {
    const apogee = setup();
    const fo = await apogee.createFunktionsområde("  Ekonomi ");
    const p = await apogee.createProjekt(fo.id, " Fakturering  ");
    expect(await apogee.getProjekt(p.id)).toMatchObject({
      namn: "Fakturering",
      funktionsområde: { namn: "Ekonomi" },
    });
  });

  it("must not be blank, whether creating or renaming", async () => {
    const apogee = setup();
    await expect(apogee.createFunktionsområde("   ")).rejects.toMatchObject({ code: "ogiltig" });
    const fo = await apogee.createFunktionsområde("Ekonomi");
    await expect(apogee.renameFunktionsområde(fo.id, "")).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.createProjekt(fo.id, " ")).rejects.toMatchObject({ code: "ogiltig" });
    const p = await apogee.createProjekt(fo.id, "Fakturering");
    await expect(apogee.renameProjekt(p.id, "\t")).rejects.toMatchObject({ code: "ogiltig" });
    expect(await apogee.overview()).toEqual([
      { id: fo.id, namn: "Ekonomi", projekt: [{ id: p.id, namn: "Fakturering" }] },
    ]);
  });

  it("must not be longer than 200 characters", async () => {
    const apogee = setup();
    await expect(apogee.createFunktionsområde("x".repeat(201))).rejects.toMatchObject({
      code: "ogiltig",
    });
  });
});

describe("unknown ids", () => {
  it("are rejected as finns-inte by every command and query", async () => {
    const apogee = setup();
    const fo = await apogee.createFunktionsområde("Ekonomi");
    const p = await apogee.createProjekt(fo.id, "Fakturering");
    const finnsInte = { code: "finns-inte" };
    await expect(apogee.getFunktionsområde("saknas")).rejects.toMatchObject(finnsInte);
    await expect(apogee.renameFunktionsområde("saknas", "X")).rejects.toMatchObject(finnsInte);
    await expect(apogee.getProjekt("saknas")).rejects.toMatchObject(finnsInte);
    await expect(apogee.renameProjekt("saknas", "X")).rejects.toMatchObject(finnsInte);
    await expect(apogee.createProjekt("saknas", "X")).rejects.toMatchObject(finnsInte);
    await expect(apogee.moveProjekt("saknas", fo.id)).rejects.toMatchObject(finnsInte);
    await expect(apogee.moveProjekt(p.id, "saknas")).rejects.toMatchObject(finnsInte);
    expect((await apogee.getProjekt(p.id)).funktionsområde.id).toBe(fo.id);
  });
});

describe("ordering", () => {
  it("lists Funktionsområden and their Projekt alphabetically in Swedish order", async () => {
    const apogee = setup();
    const ö = await apogee.createFunktionsområde("Övrigt");
    const a = await apogee.createFunktionsområde("ekonomi");
    const z = await apogee.createFunktionsområde("Zebra");
    const p1 = await apogee.createProjekt(a.id, "Årsbokslut");
    const p2 = await apogee.createProjekt(a.id, "Budget");
    const overview = await apogee.overview();
    expect(overview.map((f) => f.id)).toEqual([a.id, z.id, ö.id]);
    expect(overview[0]!.projekt.map((p) => p.id)).toEqual([p2.id, p1.id]);
  });
});

describe("renaming a Funktionsområde", () => {
  it("changes its name on its page, in the overview and in its Projekts' breadcrumbs", async () => {
    const apogee = setup();
    const fo = await apogee.createFunktionsområde("HR");
    const p = await apogee.createProjekt(fo.id, "Rekrytering");
    await apogee.renameFunktionsområde(fo.id, "HR & Personal");
    expect((await apogee.getFunktionsområde(fo.id)).namn).toBe("HR & Personal");
    expect((await apogee.overview()).map((f) => f.namn)).toEqual(["HR & Personal"]);
    expect((await apogee.getProjekt(p.id)).funktionsområde.namn).toBe("HR & Personal");
  });
});
