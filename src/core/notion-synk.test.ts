// The Notion sync (#75): the structure comes from a Notion source.
import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";

function setup() {
  const storage = createMemoryStorage();
  const notion = createMemoryNotion();
  let klocka = new Date("2026-11-24T10:00:00Z");
  let n = 0;
  const apogee = createApogee({ storage, notion, now: () => klocka, newId: () => `id${++n}` });
  return { apogee, notion, ställKlockan: (tid: string) => (klocka = new Date(tid)) };
}

describe("synkaFrånNotion", () => {
  it("creates the ticked Projekt and the Funktionsområden they reference", async () => {
    const { apogee, notion } = setup();
    notion.funktionsområde({ notionId: "n-eko", namn: "Ekonomi", startdatum: "2026-11-01", slutdatum: "2026-12-31" });
    notion.projekt({ notionId: "n-kassan", namn: "Kassan", funktionsområde: "n-eko", startdatum: "2026-11-02", slutdatum: "2026-12-14" });
    notion.projekt({ notionId: "n-moms", namn: "Moms", funktionsområde: "n-eko" });

    await apogee.synkaFrånNotion();

    const översikt = await apogee.overview();
    expect(översikt).toMatchObject([
      {
        namn: "Ekonomi",
        notionUrl: "https://www.notion.so/n-eko",
        tidsplan: { startdatum: "2026-11-01", slutdatum: "2026-12-31" },
        projekt: [{ namn: "Kassan" }, { namn: "Moms" }],
      },
    ]);
    const kassan = await apogee.getProjekt(översikt[0]!.projekt[0]!.id);
    expect(kassan).toMatchObject({
      namn: "Kassan",
      notionUrl: "https://www.notion.so/n-kassan",
      funktionsområde: { id: översikt[0]!.id, namn: "Ekonomi" },
      tidsplan: { startdatum: "2026-11-02", slutdatum: "2026-12-14" },
    });
  });

  it("updates namn, Funktionsområde and dates on the next sync, keeping the Hill chart and writing no Uppdatering", async () => {
    const { apogee, notion } = setup();
    const anna = (await apogee.createPerson("Anna", null)).id;
    notion.funktionsområde({ notionId: "n-eko", namn: "Ekonomi" });
    notion.funktionsområde({ notionId: "n-platt", namn: "Plattform" });
    notion.projekt({ notionId: "n-kassan", namn: "Kassan", funktionsområde: "n-eko", slutdatum: "2026-12-14" });
    notion.projekt({ notionId: "n-sök", namn: "Sök", funktionsområde: "n-eko" });
    notion.projekt({ notionId: "n-drift", namn: "Drift", funktionsområde: "n-platt" });
    await apogee.synkaFrånNotion();
    const [eko, platt] = await apogee.overview();
    const id = eko!.projekt[0]!.id;
    const scope = await apogee.addScope(id, { namn: "Betalsteg", ägare: anna }, anna);
    const historikFöre = await apogee.historik(id);

    notion.funktionsområde({ notionId: "n-eko", namn: "Ekonomi & Finans", startdatum: "2026-11-01", slutdatum: "2027-01-31" });
    notion.projekt({
      notionId: "n-kassan",
      namn: "Kassan 2",
      funktionsområde: "n-platt",
      startdatum: "2026-11-09",
      slutdatum: "2026-12-21",
    });
    await apogee.synkaFrånNotion();

    expect(await apogee.getProjekt(id)).toMatchObject({
      id,
      namn: "Kassan 2",
      funktionsområde: { id: platt!.id, namn: "Plattform" },
      tidsplan: { startdatum: "2026-11-09", slutdatum: "2026-12-21" },
      scopes: [{ id: scope.id, namn: "Betalsteg" }],
    });
    expect(await apogee.getFunktionsområde(eko!.id)).toMatchObject({
      namn: "Ekonomi & Finans",
      tidsplan: { startdatum: "2026-11-01", slutdatum: "2027-01-31" },
    });
    expect(await apogee.historik(id)).toEqual(historikFöre);
  });

  it("lists a Projekt whose Funktionsområde is empty in Notion under Utan funktionsområde", async () => {
    const { apogee, notion } = setup();
    notion.funktionsområde({ notionId: "n-eko", namn: "Ekonomi" });
    notion.projekt({ notionId: "n-kassan", namn: "Kassan", funktionsområde: "n-eko" });
    notion.projekt({ notionId: "n-sök", namn: "Sökindex" });
    await apogee.synkaFrånNotion();
    expect(await apogee.utanFunktionsområde()).toMatchObject({ projekt: [{ namn: "Sökindex" }] });

    notion.projekt({ notionId: "n-kassan", namn: "Kassan", funktionsområde: null });
    await apogee.synkaFrånNotion();
    const utan = await apogee.utanFunktionsområde();
    expect(utan?.projekt.map((p) => p.namn)).toEqual(["Kassan", "Sökindex"]);
    expect((await apogee.getProjekt(utan!.projekt[0]!.id)).funktionsområde).toBeNull();
  });

  it("creates no Funktionsområde that no ticked Projekt references", async () => {
    const { apogee, notion } = setup();
    notion.funktionsområde({ notionId: "n-eko", namn: "Ekonomi" });
    notion.funktionsområde({ notionId: "n-tom", namn: "Avtalsmilstolpe – Q1" });
    notion.projekt({ notionId: "n-kassan", namn: "Kassan", funktionsområde: "n-eko" });
    await apogee.synkaFrånNotion();
    expect((await apogee.overview()).map((fo) => fo.namn)).toEqual(["Ekonomi"]);
  });

  it("gives a Projekt with only a Slutdatum in Notion no Startdatum", async () => {
    const { apogee, notion } = setup();
    notion.projekt({ notionId: "n-sök", namn: "Sökindex", slutdatum: "2026-12-14" });
    await apogee.synkaFrånNotion();
    const id = (await apogee.utanFunktionsområde())!.projekt[0]!.id;
    expect((await apogee.getProjekt(id)).tidsplan).toMatchObject({ startdatum: null, slutdatum: "2026-12-14" });
  });

  it("runs once when called again while a sync is running, and both calls get its result", async () => {
    const { apogee, notion } = setup();
    notion.projekt({ notionId: "n-sök", namn: "Sökindex" });
    const [a, b] = await Promise.all([apogee.synkaFrånNotion(), apogee.synkaFrånNotion()]);
    expect(notion.hämtningar).toBe(1);
    expect(a).toEqual({ senastHämtat: "2026-11-24T10:00:00.000Z", fel: null });
    expect(b).toEqual(a);
    expect((await apogee.utanFunktionsområde())!.projekt).toHaveLength(1);

    await apogee.synkaFrånNotion();
    expect(notion.hämtningar).toBe(2);
  });

  it("reports when it last fetched from Notion", async () => {
    const { apogee, notion, ställKlockan } = setup();
    expect(apogee.synkStatus()).toEqual({ senastHämtat: null, fel: null });
    await apogee.synkaFrånNotion();
    ställKlockan("2026-11-24T10:05:00Z");
    await apogee.synkaFrånNotion();
    expect(apogee.synkStatus()).toEqual({ senastHämtat: "2026-11-24T10:05:00.000Z", fel: null });
    expect(notion.hämtningar).toBe(2);
  });
});

describe("the structure Notion owns", () => {
  it("cannot be created, renamed, moved or dated in Apogee", () => {
    const { apogee } = setup();
    for (const borttaget of [
      "createFunktionsområde",
      "renameFunktionsområde",
      "createProjekt",
      "renameProjekt",
      "moveProjekt",
      "setDatum",
    ]) {
      expect(apogee).not.toHaveProperty(borttaget);
    }
  });
});
