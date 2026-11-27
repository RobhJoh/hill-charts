import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

/**
 * An Apogee with a Funktionsområde, a Projekt and one active Person, Anna.
 * "Today" is set with `idag("2026-11-24")` (noon in Stockholm).
 */
async function setup() {
  let n = 0;
  let klocka = new Date("2026-11-24T11:00:00Z");
  const apogee = createApogee({ storage: createMemoryStorage(), now: () => klocka, newId: () => `id${++n}` });
  const anna = (await apogee.createPerson("Anna", null)).id;
  const fo = (await apogee.createFunktionsområde("Ekonomi", anna)).id;
  const projekt = (await apogee.createProjekt(fo, "Kassan", anna)).id;
  const klockan = (iso: string) => {
    klocka = new Date(iso);
  };
  const idag = (datum: string) => klockan(`${datum}T11:00:00Z`);
  return { apogee, anna, fo, projekt, idag, klockan };
}

describe("Projekt dates and Appetit", () => {
  it("a Projekt gets a Startdatum and Slutdatum as an Uppdatering in its Historik", async () => {
    const { apogee, anna, projekt } = await setup();
    const u = await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-14" }, anna);
    expect(u).toMatchObject({
      typ: "datum",
      vem: anna,
      ändringar: [],
      projekt: {
        före: { startdatum: null, slutdatum: null },
        efter: { startdatum: "2026-11-02", slutdatum: "2026-12-14" },
      },
    });
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: "2026-11-02",
      slutdatum: "2026-12-14",
      milstolpar: [],
    });
    expect((await apogee.historik(projekt)).map((h) => h.typ)).toEqual(["datum"]);
  });
});

describe("entering dates", () => {
  it("a Startdatum plus a number of weeks gives the Slutdatum", async () => {
    const { apogee, anna, projekt } = await setup();
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", veckor: 6 }, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan).toMatchObject({
      startdatum: "2026-11-02",
      slutdatum: "2026-12-14",
    });
  });

  it("moving the Startdatum moves the Slutdatum too, keeping the Appetit", async () => {
    const { apogee, anna, projekt } = await setup();
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-14" }, anna);
    const u = await apogee.setDatum({ projekt }, { startdatum: "2026-11-30", behållAppetit: true }, anna);
    expect(u?.projekt).toEqual({
      före: { startdatum: "2026-11-02", slutdatum: "2026-12-14" },
      efter: { startdatum: "2026-11-30", slutdatum: "2027-01-11" },
    });
  });

  it("only the dates that change are recorded; no change writes nothing", async () => {
    const { apogee, anna, projekt } = await setup();
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-14" }, anna);
    const u = await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-21" }, anna);
    expect(u?.projekt).toEqual({ före: { slutdatum: "2026-12-14" }, efter: { slutdatum: "2026-12-21" } });
    expect(await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-21" }, anna)).toBeNull();
    expect((await apogee.historik(projekt)).length).toBe(2);
  });

  it("dates can be cleared, and a Slutdatum may stand alone", async () => {
    const { apogee, anna, projekt } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-14" }, anna);
    await apogee.setDatum({ projekt }, { startdatum: null, slutdatum: "2026-12-14" }, anna);
    const vy = await apogee.getProjekt(projekt);
    expect(vy.tidsplan).toMatchObject({ startdatum: null, slutdatum: "2026-12-14" });
    expect(vy.nedräkning).toEqual({ läge: "pågår", text: "20 dagar kvar", andel: null });
    await apogee.setDatum({ projekt }, { startdatum: null, slutdatum: null }, anna);
    expect((await apogee.getProjekt(projekt)).nedräkning).toBeNull();
  });

  it("rejects bad dates, a Slutdatum before the Startdatum, and a Startdatum alone", async () => {
    const { apogee, anna, projekt } = await setup();
    const ogiltig = { code: "ogiltig" };
    const fel = [
      { startdatum: "2026-02-30", slutdatum: null },
      { startdatum: "igår", slutdatum: null },
      { startdatum: "2026-12-14", slutdatum: "2026-12-01" },
      { startdatum: "2026-12-14", slutdatum: null },
      { startdatum: "2026-12-14", veckor: 0 },
    ];
    for (const input of fel) await expect(apogee.setDatum({ projekt }, input, anna)).rejects.toMatchObject(ogiltig);
    await expect(apogee.setDatum({ projekt }, { startdatum: null, slutdatum: null }, null)).rejects.toMatchObject({
      code: "signatur",
    });
    await expect(
      apogee.setDatum({ projekt: "okänd" }, { startdatum: null, slutdatum: "2026-12-01" }, anna),
    ).rejects.toMatchObject({ code: "finns-inte" });
    expect(await apogee.historik(projekt)).toEqual([]);
  });
});

describe("the countdown, in calendar days", () => {
  it("goes Startar om → N dagar kvar → Över tid → Avslutat; no bar before the start", async () => {
    const { apogee, anna, projekt, idag } = await setup();
    const { id: prislista } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-14" }, anna);
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
    const { apogee, anna, projekt, klockan } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.setDatum({ projekt }, { startdatum: null, slutdatum: "2026-11-26" }, anna);
    klockan("2026-11-24T23:30:00Z"); // already 00:30 on the 25th in Stockholm
    expect((await apogee.getProjekt(projekt)).nedräkning?.text).toBe("1 dag kvar");
  });

  it("tells only the days left, in days, whatever the Appetit (the bar carries the share)", async () => {
    const { apogee, anna, projekt } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-24", slutdatum: "2026-12-04" }, anna);
    expect((await apogee.getProjekt(projekt)).nedräkning?.text).toBe("10 dagar kvar");
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-24", veckor: 1 }, anna);
    expect((await apogee.getProjekt(projekt)).nedräkning?.text).toBe("7 dagar kvar");
  });

  it("each Projekt in lists carries its countdown and Över tid", async () => {
    const { apogee, anna, fo, projekt } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-11-20" }, anna);
    const [ekonomi] = await apogee.overview();
    expect(ekonomi!.projekt[0]).toMatchObject({
      nedräkning: { läge: "över tid", text: "Över tid · 4 dagar" },
      överTid: true,
    });
    expect((await apogee.getFunktionsområde(fo)).projekt[0]).toMatchObject({ överTid: true });
  });

  it("passing the Slutdatum never makes a Projekt Avslutat; an Inte påbörjat one is Över tid too", async () => {
    const { apogee, anna, projekt } = await setup();
    await apogee.setDatum({ projekt }, { startdatum: null, slutdatum: "2026-11-01" }, anna);
    expect(await apogee.getProjekt(projekt)).toMatchObject({ status: "inte påbörjat", överTid: true });
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    expect(await apogee.getProjekt(projekt)).toMatchObject({ status: "inte påbörjat", överTid: true });
  });
});

describe("Milstolpar", () => {
  it("are added, edited and removed as Uppdateringar; the next one is shown", async () => {
    const { apogee, anna, projekt, idag } = await setup();
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
    const { apogee, anna, projekt } = await setup();
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

describe("Historik covers dates and Milstolpar", () => {
  it("Ångra undoes a date change; Återställning brings back earlier Milstolpar", async () => {
    const { apogee, anna, projekt } = await setup();
    const första = await apogee.setDatum({ projekt }, { startdatum: "2026-11-02", slutdatum: "2026-12-14" }, anna);
    const m = await apogee.addMilstolpe({ projekt }, { namn: "Beta", datum: "2026-12-01" }, anna);
    const flytt = await apogee.setDatum({ projekt }, { startdatum: "2026-11-09", behållAppetit: true }, anna);

    await apogee.ångra(projekt, flytt!.id, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: "2026-11-02",
      slutdatum: "2026-12-14",
      milstolpar: [{ id: m.id, namn: "Beta", datum: "2026-12-01" }],
    });

    await apogee.changeMilstolpe({ projekt }, m.id, { namn: "Betaversion" }, anna);
    // The Milstolpar have changed since it was added: Ångra points to Återställning.
    await expect(apogee.ångra(projekt, m.uppdatering!.id, anna)).rejects.toMatchObject({ code: "krock" });
    await apogee.återställHit(projekt, första!.id, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: "2026-11-02",
      slutdatum: "2026-12-14",
      milstolpar: [],
    });
  });

  it("Ångra of a Milstolpe change that nothing has touched since is not a krock", async () => {
    const { apogee, anna, projekt } = await setup();
    const m = await apogee.addMilstolpe({ projekt }, { namn: "Beta", datum: "2026-12-01" }, anna);
    await apogee.setDatum({ projekt }, { startdatum: null, slutdatum: "2026-12-14" }, anna);
    await apogee.ångra(projekt, m.uppdatering!.id, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: null,
      slutdatum: "2026-12-14",
      milstolpar: [],
    });
  });
});

describe("Funktionsområde dates", () => {
  it("are saved without Historik and shown on the Funktionsområde", async () => {
    const { apogee, anna, fo, projekt } = await setup();
    await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    expect(await apogee.setDatum({ funktionsområde: fo }, { startdatum: "2026-11-02", veckor: 8 }, anna)).toBeNull();
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
    await expect(
      apogee.setDatum({ funktionsområde: fo }, { startdatum: null, slutdatum: null }, null),
    ).rejects.toMatchObject({ code: "signatur" });
  });

  it("is Över tid after its Slutdatum while any Projekt is not Avslutat, and Avslutat once all are", async () => {
    const { apogee, anna, fo, projekt } = await setup();
    const { id: prislista } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.setDatum({ funktionsområde: fo }, { startdatum: null, slutdatum: "2026-11-20" }, anna);
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
    const { apogee, anna, fo, projekt } = await setup();
    const { id } = await apogee.addScope(projekt, { namn: "Prislista", ägare: anna }, anna);
    await apogee.moveScope(projekt, id, 100, anna);
    await apogee.setDatum({ funktionsområde: fo }, { startdatum: null, slutdatum: "2026-11-30" }, anna);
    expect((await apogee.getFunktionsområde(fo)).nedräkning).toMatchObject({ text: "6 dagar kvar" });
  });
});

describe("Projekt dates outside the Funktionsområde's", () => {
  it("warn quietly and never block saving", async () => {
    const { apogee, anna, fo, projekt } = await setup();
    await apogee.setDatum({ funktionsområde: fo }, { startdatum: "2026-11-02", slutdatum: "2026-12-14" }, anna);
    await apogee.setDatum({ projekt }, { startdatum: "2026-11-09", slutdatum: "2026-12-07" }, anna);
    expect((await apogee.getProjekt(projekt)).datumVarningar).toEqual([]);
    const u = await apogee.setDatum({ projekt }, { startdatum: "2026-10-26", slutdatum: "2026-12-21" }, anna);
    expect(u).not.toBeNull();
    expect((await apogee.getProjekt(projekt)).datumVarningar).toEqual([
      "börjar före Funktionsområdet",
      "slutar efter Funktionsområdet",
    ]);
  });
});
