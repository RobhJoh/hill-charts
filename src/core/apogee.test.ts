import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "./test-struktur.js";

function setupTom(storage = createMemoryStorage()) {
  let n = 0;
  return createApogee({
    storage,
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
}

/** An Apogee whose structure comes from a fake Notion (`notion.projekt(...)`). */
function setup() {
  const storage = createMemoryStorage();
  const källa = createMemoryNotion();
  let n = 0;
  const apogee = createApogee({ storage, notion: källa, now: () => new Date("2026-11-24T10:00:00Z"), newId: () => `id${++n}` });
  return { apogee, notion: notionStruktur(apogee, källa, storage) };
}

describe("Signatur", () => {
  it("every write to a Person needs a known, active Signatur", async () => {
    const storage = createMemoryStorage();
    const apogee = setupTom(storage);
    await apogee.createPerson("Anna", null);
    await storage.savePersoner([
      ...(await storage.listPersoner()),
      { id: "bortgången", namn: "Bo", aktiv: false, skapad: "2026-01-01T00:00:00.000Z" },
    ]);
    for (const ogiltig of [null, "okänd", "bortgången"]) {
      await expect(apogee.createPerson("Cia", ogiltig)).rejects.toMatchObject({ code: "signatur" });
    }
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

describe("Projekt", () => {
  it("a Projekt synced inside a Funktionsområde is listed under it", async () => {
    const { apogee, notion } = setup();
    const p = await notion.projekt("Nytt bokningsflöde", "Kundupplevelse");
    const fo = await notion.funktionsområdeId("Kundupplevelse");
    expect(await apogee.overview()).toMatchObject([
      { id: fo, namn: "Kundupplevelse", projekt: [{ id: p, namn: "Nytt bokningsflöde" }] },
    ]);
    expect(await apogee.getFunktionsområde(fo)).toMatchObject({
      id: fo,
      namn: "Kundupplevelse",
      projekt: [{ id: p, namn: "Nytt bokningsflöde" }],
    });
  });

  it("a Projekt page shows its name and its Funktionsområde for the breadcrumb", async () => {
    const { apogee, notion } = setup();
    const p = await notion.projekt("Sökindex", "Plattform");
    expect(await apogee.getProjekt(p)).toMatchObject({
      id: p,
      namn: "Sökindex",
      funktionsområde: { id: await notion.funktionsområdeId("Plattform"), namn: "Plattform" },
      scopes: [],
    });
  });

  it("renamed in Notion, a Projekt's name changes everywhere it is shown", async () => {
    const { apogee, notion } = setup();
    const p = await notion.projekt("Sökindx", "Plattform");
    await notion.ändraProjekt("Sökindx", { namn: "Sökindex" });
    expect((await apogee.getProjekt(p)).namn).toBe("Sökindex");
    expect((await apogee.getFunktionsområde(await notion.funktionsområdeId("Plattform"))).projekt).toMatchObject([
      { id: p, namn: "Sökindex" },
    ]);
  });

  it("a Projekt moved to another Funktionsområde in Notion is listed there and its breadcrumb follows", async () => {
    const { apogee, notion } = setup();
    await notion.projekt("Drift", "Plattform");
    await notion.projekt("Budget", "Ekonomi");
    const p = await notion.projekt("Betaltjänst", "Plattform");
    const [från, till] = [await notion.funktionsområdeId("Plattform"), await notion.funktionsområdeId("Ekonomi")];
    await notion.ändraProjekt("Betaltjänst", { funktionsområde: "notion-Ekonomi" });
    expect((await apogee.getFunktionsområde(från)).projekt.map((x) => x.namn)).toEqual(["Drift"]);
    expect((await apogee.getFunktionsområde(till)).projekt.map((x) => x.namn)).toEqual(["Betaltjänst", "Budget"]);
    expect((await apogee.getProjekt(p)).funktionsområde).toEqual({ id: till, namn: "Ekonomi" });
  });
});

describe("names from Notion", () => {
  it("are trimmed, and a blank one is shown as Namnlös", async () => {
    const { apogee, notion } = setup();
    const p = await notion.projekt("Fakturering", "Ekonomi", { namn: " Fakturering  " });
    await notion.ändraFunktionsområde("Ekonomi", { namn: "  Ekonomi " });
    expect(await apogee.getProjekt(p)).toMatchObject({ namn: "Fakturering", funktionsområde: { namn: "Ekonomi" } });
    await notion.ändraProjekt("Fakturering", { namn: "   " });
    expect((await apogee.getProjekt(p)).namn).toBe("Namnlös");
  });
});

describe("unknown ids", () => {
  it("are rejected as finns-inte by every query", async () => {
    const { apogee } = setup();
    const finnsInte = { code: "finns-inte" };
    await expect(apogee.getFunktionsområde("saknas")).rejects.toMatchObject(finnsInte);
    await expect(apogee.getProjekt("saknas")).rejects.toMatchObject(finnsInte);
  });
});

describe("ordering", () => {
  it("lists Funktionsområden and their Projekt alphabetically in Swedish order", async () => {
    const { apogee, notion } = setup();
    await notion.projekt("Ö-projekt", "Övrigt");
    await notion.projekt("Z-projekt", "Zebra");
    const p1 = await notion.projekt("Årsbokslut", "ekonomi");
    const p2 = await notion.projekt("Budget", "ekonomi");
    const overview = await apogee.overview();
    expect(overview.map((f) => f.namn)).toEqual(["ekonomi", "Zebra", "Övrigt"]);
    expect(overview[0]!.projekt.map((p) => p.id)).toEqual([p2, p1]);
  });
});

describe("renaming a Funktionsområde in Notion", () => {
  it("changes its name on its page, in the overview and in its Projekts' breadcrumbs", async () => {
    const { apogee, notion } = setup();
    const p = await notion.projekt("Rekrytering", "HR");
    const fo = await notion.funktionsområdeId("HR");
    await notion.ändraFunktionsområde("HR", { namn: "HR & Personal" });
    expect((await apogee.getFunktionsområde(fo)).namn).toBe("HR & Personal");
    expect((await apogee.overview()).map((f) => f.namn)).toEqual(["HR & Personal"]);
    expect((await apogee.getProjekt(p)).funktionsområde?.namn).toBe("HR & Personal");
  });
});
