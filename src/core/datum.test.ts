import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "./test-struktur.js";
import type { Datum } from "./types.js";

/**
 * An Apogee with a Funktionsområde, a Projekt and one active Person, Anna.
 * "Today" is set with `idag("2026-11-24")` (noon in Stockholm).
 */
async function setup() {
  let n = 0;
  let klocka = new Date("2026-11-24T11:00:00Z");
  const storage = createMemoryStorage();
  const källa = createMemoryNotion();
  const apogee = createApogee({ storage, notion: källa, now: () => klocka, newId: () => `id${++n}` });
  const notion = notionStruktur(apogee, källa, storage);
  const anna = (await apogee.createPerson("Anna", null)).id;
  const projekt = await notion.projekt("Kassan", "Ekonomi");
  const fo = await notion.funktionsområdeId("Ekonomi");
  /** Sets Kassan's dates in Notion and syncs. */
  const datum = (startdatum: Datum | null, slutdatum: Datum | null) => notion.ändraProjekt("Kassan", { startdatum, slutdatum });
  /** Sets Ekonomi's dates in Notion and syncs. */
  const foDatum = (startdatum: Datum | null, slutdatum: Datum | null) =>
    notion.ändraFunktionsområde("Ekonomi", { startdatum, slutdatum });
  const klockan = (iso: string) => {
    klocka = new Date(iso);
  };
  const idag = (datum: string) => klockan(`${datum}T11:00:00Z`);
  return { apogee, anna, fo, projekt, idag, klockan, datum, foDatum };
}

describe("Projekt dates and Appetit", () => {
  it("a Projekt's Startdatum and Slutdatum come from Notion and are kept on the Projekt, with no Uppdatering", async () => {
    const { apogee, projekt, datum } = await setup();
    await datum("2026-11-02", "2026-12-14");
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: "2026-11-02",
      slutdatum: "2026-12-14",
      milstolpar: [],
    });
    expect(await apogee.historik(projekt)).toEqual([]);
    expect(await apogee.historikVy(projekt)).toEqual([]);
  });
});

describe("the countdown, in calendar days", () => {
  it("goes Startar om → N dagar kvar → Över tid → Avslutat; no bar before the start", async () => {
    const { apogee, datum, foDatum, anna, projekt, idag } = await setup();
    const { id: prislista } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await datum("2026-11-02", "2026-12-14");
    const vy = async () => {
      const { nedräkning, överTid } = await apogee.getProjekt(projekt);
      return { ...nedräkning, överTid };
    };

    idag("2026-10-28");
    expect(await vy()).toEqual({ läge: "startar", text: "Startar om 5 dagar", andel: null, överTid: false });
    idag("2026-11-01");
    expect(await vy()).toMatchObject({ text: "Startar om 1 dag" });
    idag("2026-11-02");
    expect(await vy()).toEqual({ läge: "pågår", text: "42 dagar kvar", andel: 0, överTid: false });
    idag("2026-11-22");
    expect(await vy()).toEqual({ läge: "pågår", text: "22 dagar kvar", andel: 20 / 42, överTid: false });
    idag("2026-12-14");
    expect(await vy()).toEqual({ läge: "pågår", text: "0 dagar kvar", andel: 1, överTid: false });
    idag("2026-12-18");
    expect(await vy()).toEqual({ läge: "över tid", text: "Över tid · 4 dagar", andel: 1, överTid: true });

    await apogee.moveScope(projekt, prislista, 100, anna);
    expect(await vy()).toEqual({ läge: "avslutat", text: "Avslutat", andel: null, överTid: false });
  });

  it("counts calendar days in Swedish time", async () => {
    const { apogee, datum, foDatum, anna, projekt, klockan } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await datum(null, "2026-11-26");
    klockan("2026-11-24T23:30:00Z"); // already 00:30 on the 25th in Stockholm
    expect((await apogee.getProjekt(projekt)).nedräkning?.text).toBe("1 dag kvar");
  });

  it("tells only the days left, in days, whatever the Appetit (the bar carries the share)", async () => {
    const { apogee, datum, foDatum, anna, projekt } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await datum("2026-11-24", "2026-12-04");
    expect((await apogee.getProjekt(projekt)).nedräkning?.text).toBe("10 dagar kvar");
    await datum("2026-11-24", "2026-12-01");
    expect((await apogee.getProjekt(projekt)).nedräkning?.text).toBe("7 dagar kvar");
  });

  it("each Projekt in lists carries its countdown and Över tid", async () => {
    const { apogee, datum, foDatum, anna, fo, projekt } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await datum("2026-11-02", "2026-11-20");
    const [ekonomi] = await apogee.overview();
    expect(ekonomi!.projekt[0]).toMatchObject({
      nedräkning: { läge: "över tid", text: "Över tid · 4 dagar" },
      överTid: true,
    });
    expect((await apogee.getFunktionsområde(fo)).projekt[0]).toMatchObject({ överTid: true });
  });

  it("passing the Slutdatum never makes a Projekt Avslutat; an Inte påbörjat one is Över tid too", async () => {
    const { apogee, datum, foDatum, anna, projekt } = await setup();
    await datum(null, "2026-11-01");
    expect(await apogee.getProjekt(projekt)).toMatchObject({ status: "inte påbörjat", överTid: true });
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    expect(await apogee.getProjekt(projekt)).toMatchObject({ status: "inte påbörjat", överTid: true });
  });
});

describe("Milstolpar", () => {
  it("are added, edited and removed as Uppdateringar; the next one is shown", async () => {
    const { apogee, datum, foDatum, anna, projekt, idag } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    const beta = await apogee.addMilstolpe({ projekt }, { namn: "Betaversion", datum: "2026-12-02" }, anna);
    const test = await apogee.addMilstolpe({ projekt }, { namn: "Acceptanstest", datum: "2026-11-28" }, anna);
    expect(test.uppdatering).toMatchObject({ typ: "milstolpe", ändringar: [] });

    let vy = await apogee.getProjekt(projekt);
    expect(vy.tidsplan.milstolpar).toEqual([
      { id: test.id, namn: "Acceptanstest", datum: "2026-11-28" },
      { id: beta.id, namn: "Betaversion", datum: "2026-12-02" },
    ]);
    expect(vy.nästaMilstolpe).toMatchObject({ id: test.id, text: "Acceptanstest om 4 dagar" });

    await apogee.changeMilstolpe({ projekt }, test.id, { datum: "2026-11-25" }, anna);
    expect((await apogee.getProjekt(projekt)).nästaMilstolpe?.text).toBe("Acceptanstest i morgon");
    idag("2026-11-25");
    expect((await apogee.getProjekt(projekt)).nästaMilstolpe?.text).toBe("Acceptanstest i dag");
    idag("2026-11-26");
    expect((await apogee.getProjekt(projekt)).nästaMilstolpe?.text).toBe("Betaversion om 6 dagar");

    await apogee.changeMilstolpe({ projekt }, beta.id, { namn: "Beta" }, anna);
    expect(await apogee.changeMilstolpe({ projekt }, beta.id, { namn: "Beta" }, anna)).toBeNull();
    await apogee.removeMilstolpe({ projekt }, beta.id, anna);
    vy = await apogee.getProjekt(projekt);
    expect(vy.tidsplan.milstolpar.map((m) => m.namn)).toEqual(["Acceptanstest"]);
    expect(vy.nästaMilstolpe).toBeNull();
    expect((await apogee.historik(projekt)).map((u) => u.typ)).toEqual([
      "ny",
      "milstolpe",
      "milstolpe",
      "milstolpe",
      "milstolpe",
      "milstolpe",
    ]);
  });

  it("need a name and a real date; an unknown Milstolpe is finns-inte", async () => {
    const { apogee, datum, foDatum, anna, projekt } = await setup();
    await expect(apogee.addMilstolpe({ projekt }, { namn: " ", datum: "2026-12-01" }, anna)).rejects.toMatchObject({
      code: "ogiltig",
    });
    await expect(apogee.addMilstolpe({ projekt }, { namn: "X", datum: "1 dec" }, anna)).rejects.toMatchObject({
      code: "ogiltig",
    });
    await expect(apogee.removeMilstolpe({ projekt }, "okänd", anna)).rejects.toMatchObject({ code: "finns-inte" });
    expect(await apogee.historik(projekt)).toEqual([]);
  });
});

describe("Historik covers Milstolpar, never a Projekt's dates", () => {
  it("Ångra and Återställning bring back earlier Milstolpar but never change the dates", async () => {
    const { apogee, datum, foDatum, anna, projekt } = await setup();
    const första = await apogee.addMilstolpe({ projekt }, { namn: "Alfa", datum: "2026-11-20" }, anna);
    await datum("2026-11-02", "2026-12-14");
    const m = await apogee.addMilstolpe({ projekt }, { namn: "Beta", datum: "2026-12-01" }, anna);
    await datum("2026-11-09", "2026-12-21");

    await apogee.ångra(projekt, m.uppdatering!.id, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: "2026-11-09",
      slutdatum: "2026-12-21",
      milstolpar: [{ id: första.id, namn: "Alfa", datum: "2026-11-20" }],
    });

    await apogee.addMilstolpe({ projekt }, { namn: "Gamma", datum: "2026-12-10" }, anna);
    await apogee.återställHit(projekt, första.uppdatering!.id, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: "2026-11-09",
      slutdatum: "2026-12-21",
      milstolpar: [{ id: första.id, namn: "Alfa", datum: "2026-11-20" }],
    });
    expect((await apogee.historikVy(projekt)).map((r) => r.typ)).toEqual([
      "återställning",
      "milstolpe",
      "ångra",
      "milstolpe",
      "milstolpe",
    ]);
  });

  it("Ångra of a Milstolpe change that nothing has touched since is not a krock", async () => {
    const { apogee, datum, foDatum, anna, projekt } = await setup();
    const m = await apogee.addMilstolpe({ projekt }, { namn: "Beta", datum: "2026-12-01" }, anna);
    await datum(null, "2026-12-14");
    await apogee.ångra(projekt, m.uppdatering!.id, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: null,
      slutdatum: "2026-12-14",
      milstolpar: [],
    });
  });
});

describe("Funktionsområde dates", () => {
  it("come from Notion, and Milstolpar are saved without Historik; both are shown on the Funktionsområde", async () => {
    const { apogee, datum, foDatum, anna, fo, projekt } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await foDatum("2026-11-02", "2026-12-28");
    const m = await apogee.addMilstolpe({ funktionsområde: fo }, { namn: "Release", datum: "2026-12-20" }, anna);
    expect(m.uppdatering).toBeNull();
    expect(await apogee.getFunktionsområde(fo)).toMatchObject({
      tidsplan: { startdatum: "2026-11-02", slutdatum: "2026-12-28", milstolpar: [{ id: m.id, namn: "Release" }] },
      nedräkning: { läge: "pågår", text: "34 dagar kvar" },
      nästaMilstolpe: { text: "Release om 26 dagar" },
      överTid: false,
    });
    await apogee.changeMilstolpe({ funktionsområde: fo }, m.id, { namn: "Lansering" }, anna);
    await apogee.removeMilstolpe({ funktionsområde: fo }, m.id, anna);
    expect((await apogee.getFunktionsområde(fo)).tidsplan.milstolpar).toEqual([]);
    expect(await apogee.historik(projekt)).toHaveLength(1);
  });

  it("is Över tid after its Slutdatum while any Projekt is not Avslutat, and Avslutat once all are", async () => {
    const { apogee, datum, foDatum, anna, fo, projekt } = await setup();
    const { id: prislista } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await foDatum(null, "2026-11-20");
    expect(await apogee.getFunktionsområde(fo)).toMatchObject({
      nedräkning: { läge: "över tid", text: "Över tid · 4 dagar" },
      överTid: true,
    });
    await apogee.moveScope(projekt, prislista, 100, anna);
    expect(await apogee.getFunktionsområde(fo)).toMatchObject({ nedräkning: { läge: "avslutat" }, överTid: false });
    const [ekonomi] = await apogee.overview();
    expect(ekonomi).toMatchObject({ överTid: false });
  });

  it("counts down normally before its Slutdatum even when every Projekt is Avslutat", async () => {
    const { apogee, datum, foDatum, anna, fo, projekt } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.moveScope(projekt, id, 100, anna);
    await foDatum(null, "2026-11-30");
    expect((await apogee.getFunktionsområde(fo)).nedräkning).toMatchObject({ text: "6 dagar kvar" });
  });
});

describe("Projekt dates outside the Funktionsområde's", () => {
  it("warn quietly", async () => {
    const { apogee, datum, foDatum, anna, fo, projekt } = await setup();
    await foDatum("2026-11-02", "2026-12-14");
    await datum("2026-11-09", "2026-12-07");
    expect((await apogee.getProjekt(projekt)).datumVarningar).toEqual([]);
    await datum("2026-10-26", "2026-12-21");
    expect((await apogee.getProjekt(projekt)).datumVarningar).toEqual([
      "börjar före Funktionsområdet",
      "slutar efter Funktionsområdet",
    ]);
  });
});
