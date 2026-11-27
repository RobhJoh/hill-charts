import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "./test-struktur.js";
import type { Uppdatering } from "./types.js";

/**
 * The prototype/historik start state: Anna, Erik and Klottraren; a Projekt
 * with s1 Prislista 72/Anna, s2 Kassaflöde 38/Erik, s3 Kvittomejl 12/Anna,
 * s4 Rabattkoder 55/Erik (each added then moved by Anna), then +1 day.
 */
async function setup() {
  const storage = createMemoryStorage();
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const källa = createMemoryNotion();
  const apogee = createApogee({ storage, notion: källa, now: () => klocka, newId: () => `id${++n}` });
  const notion = notionStruktur(apogee, källa, storage);
  const anna = (await apogee.createPerson("Anna", null)).id;
  const erik = (await apogee.createPerson("Erik", anna)).id;
  const klottrare = (await apogee.createPerson("Klottraren", anna)).id;
  const projekt = await notion.projekt("Kassan", "Ekonomi");
  const senare = (minuter: number) => {
    klocka = new Date(klocka.getTime() + minuter * 60_000);
  };
  const scope = async (namn: string, läge: number, ägare: string) => {
    const { id } = await apogee.addScope(projekt, { namn, ägare }, anna);
    await apogee.moveScope(projekt, id, läge, anna);
    return id;
  };
  const s1 = await scope("Prislista", 72, anna);
  const s2 = await scope("Kassaflöde", 38, erik);
  const s3 = await scope("Kvittomejl", 12, anna);
  const s4 = await scope("Rabattkoder", 55, erik);
  senare(24 * 60);
  /** The chart as [id, namn, läge, ägare], highest Läge first. */
  const diagram = async () =>
    (await apogee.getProjekt(projekt)).scopes.map((s) => [s.id, s.namn, s.läge, s.ägare.id]);
  return { apogee, storage, notion, anna, erik, klottrare, projekt, senare, s1, s2, s3, s4, diagram };
}

describe("Återställ hit", () => {
  it("puts the whole chart back to right after the target as one Uppdatering, bringing a removed Scope back with its id", async () => {
    const { apogee, notion, anna, erik, klottrare, projekt, s1, s2, s3, s4, diagram } = await setup();
    const annasFlytt = await apogee.moveScope(projekt, s2, 45, anna);
    await apogee.moveScope(projekt, s1, 100, klottrare);
    await apogee.moveScope(projekt, s3, 100, klottrare);
    await apogee.removeScope(projekt, s4, klottrare);
    const före = (await apogee.historik(projekt)).length;

    const u = await apogee.återställHit(projekt, annasFlytt!.id, erik);

    expect(u).toMatchObject({ typ: "återställning", mål: annasFlytt!.id, vem: erik });
    expect(u!.ändringar.map((ä) => ä.scopeId).sort()).toEqual([s1, s3, s4].sort());
    expect(await apogee.historik(projekt)).toHaveLength(före + 1);
    expect(await diagram()).toEqual([
      [s1, "Prislista", 72, anna],
      [s4, "Rabattkoder", 55, erik],
      [s2, "Kassaflöde", 45, erik],
      [s3, "Kvittomejl", 12, anna],
    ]);
  });
});

describe("Ångra bara denna", () => {
  it("reverts only that Uppdatering, keeping good work done after it", async () => {
    const { apogee, notion, anna, erik, klottrare, projekt, senare, s1, s2, s3, s4, diagram } = await setup();
    const klotter = await apogee.moveScope(projekt, s3, 95, klottrare);
    senare(24 * 60);
    await apogee.moveScope(projekt, s2, 60, erik);
    const { id: fraktval } = await apogee.addScope(projekt, { namn: "Fraktval", ägare: anna }, anna);

    const u = await apogee.ångra(projekt, klotter!.id, anna);

    expect(u).toMatchObject({
      typ: "ångra",
      mål: klotter!.id,
      vem: anna,
      ändringar: [{ scopeId: s3, före: { läge: 95 }, efter: { läge: 12 } }],
    });
    expect(await diagram()).toEqual([
      [s1, "Prislista", 72, anna],
      [s2, "Kassaflöde", 60, erik],
      [s4, "Rabattkoder", 55, erik],
      [s3, "Kvittomejl", 12, anna],
      [fraktval, "Fraktval", 0, anna],
    ]);
  });

  it("is blocked when a field it would revert has changed since; a change to another field doesn't block", async () => {
    const { apogee, notion, anna, erik, projekt, s2, diagram } = await setup();
    const annasFlytt = await apogee.moveScope(projekt, s2, 50, anna);
    const eriksNamn = await apogee.renameScope(projekt, s2, "Kassa", erik);
    await apogee.moveScope(projekt, s2, 70, erik);
    const längd = (await apogee.historik(projekt)).length;

    await expect(apogee.ångra(projekt, annasFlytt!.id, anna)).rejects.toMatchObject({
      code: "krock",
      message: expect.stringMatching(/Kassa.*läge.*Återställ hit/),
    });
    expect(await apogee.historik(projekt)).toHaveLength(längd);

    await apogee.ångra(projekt, eriksNamn!.id, anna);
    expect((await diagram()).find(([id]) => id === s2)).toEqual([s2, "Kassaflöde", 70, erik]);
  });

  it("an Återställning can itself be undone, bringing everything back", async () => {
    const { apogee, notion, anna, erik, projekt, s2, diagram } = await setup();
    await apogee.moveScope(projekt, s2, 66, erik);
    await apogee.addScope(projekt, { namn: "Fraktval", ägare: anna }, anna);
    const innan = await diagram();
    const seed = (await apogee.historik(projekt))[7]!; // s4 moved to 55: the start state
    const återställning = await apogee.återställHit(projekt, seed.id, erik);
    expect(await diagram()).not.toEqual(innan);

    await apogee.ångra(projekt, återställning!.id, erik);
    expect(await diagram()).toEqual(innan);
  });

  it("a removed Scope comes back with its id and earlier Historik", async () => {
    const { apogee, notion, anna, erik, projekt, senare, s2 } = await setup();
    const flyttad = (await apogee.getProjekt(projekt)).scopes.find((s) => s.id === s2)!.flyttad;
    const borttagen = await apogee.removeScope(projekt, s2, anna);
    senare(5);
    await apogee.ångra(projekt, borttagen!.id, anna);

    const s = (await apogee.getProjekt(projekt)).scopes.find((x) => x.id === s2);
    expect(s).toMatchObject({ namn: "Kassaflöde", läge: 38, ägare: { id: erik }, flyttad });
    await expect(apogee.ångra(projekt, borttagen!.id, anna)).rejects.toMatchObject({ code: "krock" });
  });
});

describe("Historik view", () => {
  it("merges consecutive moves of one Scope by one Signatur within 10 minutes into one row, newest first", async () => {
    const { apogee, notion, anna, erik, projekt, senare, s1, s2 } = await setup();
    const drag = [];
    for (const läge of [42, 48, 46, 55, 61, 64]) {
      drag.push((await apogee.moveScope(projekt, s2, läge, anna))!.id);
      senare(4);
    }
    senare(20);
    const eriks = await apogee.moveScope(projekt, s1, 80, erik);
    const längd = (await apogee.historik(projekt)).length;

    const [senast, grupp, före] = await apogee.historikVy(projekt);

    expect(senast).toMatchObject({ id: eriks!.id, antal: 1, typ: "flytt", vem: { namn: "Erik" }, kanÅngras: true });
    expect(grupp).toMatchObject({
      id: drag.at(-1),
      ids: drag,
      antal: 6,
      typ: "flytt",
      vem: { id: anna, namn: "Anna", aktiv: true },
      tid: "2026-11-25T10:20:00.000Z",
      ändringar: [{ scopeId: s2, före: { läge: 38 }, efter: { läge: 64 } }],
      kanÅngras: false,
    });
    expect(före).toMatchObject({ antal: 1, typ: "flytt", vem: { namn: "Anna" } }); // s4 → 55, a day before
    expect(await apogee.historik(projekt)).toHaveLength(längd); // storage keeps every drop
  });

  it("a move more than 10 minutes after the previous one, or by someone else, starts a new row", async () => {
    const { apogee, notion, anna, erik, projekt, senare, s2 } = await setup();
    await apogee.moveScope(projekt, s2, 40, anna);
    senare(11);
    await apogee.moveScope(projekt, s2, 41, anna);
    await apogee.moveScope(projekt, s2, 42, erik);
    const rader = await apogee.historikVy(projekt);
    expect(rader.slice(0, 3).map((r) => r.antal)).toEqual([1, 1, 1]);
  });

  it("marks skipped Uppdateringar bortåterställd and undone ones ångrad", async () => {
    const { apogee, notion, anna, erik, klottrare, projekt, s1, s3, s4 } = await setup();
    const annasFlytt = await apogee.moveScope(projekt, s1, 75, anna);
    const k1 = await apogee.moveScope(projekt, s1, 100, klottrare);
    const k2 = await apogee.removeScope(projekt, s4, klottrare);
    const återställning = await apogee.återställHit(projekt, annasFlytt!.id, erik);
    const k3 = await apogee.moveScope(projekt, s3, 0, klottrare);
    const ångra = await apogee.ångra(projekt, k3!.id, anna);

    const rader = await apogee.historikVy(projekt);
    const rad = (id: string) => rader.find((r) => r.id === id)!;
    expect(rad(k1!.id)).toMatchObject({ bortåterställd: true, ångrad: false });
    expect(rad(k2!.id)).toMatchObject({ bortåterställd: true });
    expect(rad(annasFlytt!.id)).toMatchObject({ bortåterställd: false });
    expect(rad(återställning!.id)).toMatchObject({ typ: "återställning", mål: annasFlytt!.id, bortåterställd: false });
    expect(rad(k3!.id)).toMatchObject({ ångrad: true, bortåterställd: false });
    expect(rad(ångra.id)).toMatchObject({ typ: "ångra", mål: k3!.id });
  });

  it("shows a legacy edit without Signatur as null (\"Någon utan namn\")", async () => {
    const { apogee, notion, storage, projekt, s2 } = await setup();
    await storage.appendUppdatering(projekt, {
      id: "gammal",
      typ: "flytt",
      vem: null,
      tid: "2026-11-25T11:00:00.000Z",
      ändringar: [
        {
          scopeId: s2,
          före: { namn: "Kassaflöde", läge: 38, ägare: "x" },
          efter: { namn: "Kassaflöde", läge: 40, ägare: "x" },
        },
      ],
    });
    expect((await apogee.historikVy(projekt))[0]).toMatchObject({ id: "gammal", vem: null });
  });
});

describe("Visa", () => {
  it("shows the chart right after an Uppdatering and which Scopes differ from now", async () => {
    const { apogee, notion, anna, erik, klottrare, projekt, senare, s1, s2, s3, s4 } = await setup();
    const annasFlytt = await apogee.moveScope(projekt, s2, 45, anna);
    const tid = annasFlytt!.tid;
    senare(30);
    await apogee.moveScope(projekt, s1, 100, klottrare);
    await apogee.removeScope(projekt, s4, klottrare);
    const { id: ny } = await apogee.addScope(projekt, { namn: "Fraktval", ägare: anna }, anna);
    await apogee.renameScope(projekt, s3, "Kvitton", erik);

    const vy = await apogee.förhandsvisa(projekt, annasFlytt!.id);

    expect(vy.scopes.map((s) => [s.id, s.namn, s.läge])).toEqual([
      [s1, "Prislista", 72],
      [s4, "Rabattkoder", 55],
      [s2, "Kassaflöde", 45],
      [s3, "Kvittomejl", 12],
    ]);
    expect(vy.scopes.find((s) => s.id === s2)).toMatchObject({ ägare: { namn: "Erik" }, flyttad: tid });
    expect([...vy.skiljer].sort()).toEqual([s1, s3, s4, ny].sort());
    await expect(apogee.förhandsvisa(projekt, "nej")).rejects.toMatchObject({ code: "finns-inte" });
  });
});

describe("Projekt-level Uppdateringar", () => {
  it("Återställ hit and its Ångra fold the Projekt fields together with the Scopes", async () => {
    const { apogee, notion, anna, erik, projekt, s2, diagram } = await setup();
    const före = (await apogee.historik(projekt)).at(-1)!;
    await apogee.moveScope(projekt, s2, 90, erik);
    const { id: demo } = await apogee.addMilstolpe({ projekt }, { namn: "Demo", datum: "2026-12-01" }, erik);
    const innan = await diagram();

    const åter = await apogee.återställHit(projekt, före.id, anna);
    expect(åter!.projekt).toEqual({
      före: { milstolpar: [{ id: demo, namn: "Demo", datum: "2026-12-01" }] },
      efter: { milstolpar: [] },
    });
    expect((await apogee.getProjekt(projekt)).tidsplan.milstolpar).toEqual([]);
    expect((await diagram()).find(([id]) => id === s2)![2]).toBe(38);

    await apogee.ångra(projekt, åter!.id, anna);
    expect((await apogee.getProjekt(projekt)).tidsplan.milstolpar).toMatchObject([{ id: demo }]);
    expect(await diagram()).toEqual(innan);
  });
});

describe("a Historik from before status followed Läge alone", () => {
  /** Markera Avslutat and Öppna igen as the old format wrote them, with a Milstolpe in between. */
  async function medGamlaMarkeringar() {
    const f = await setup();
    const markering = (id: string, avslutat: boolean, tid: string) => ({
      id,
      typ: avslutat ? "avslutat" : "öppna igen",
      vem: f.anna,
      tid,
      ändringar: [],
      projekt: { före: { avslutat: !avslutat }, efter: { avslutat } },
    });
    const gamla = [
      markering("markerad", true, "2026-11-25T11:00:00.000Z"),
      {
        id: "med-milstolpe",
        typ: "milstolpe",
        vem: f.anna,
        tid: "2026-11-25T11:01:00.000Z",
        ändringar: [],
        projekt: {
          före: { avslutat: false, milstolpar: [] },
          efter: { avslutat: true, milstolpar: [{ id: "m1", namn: "Demo", datum: "2026-12-01" }] },
        },
      },
      markering("öppnad", false, "2026-11-25T11:02:00.000Z"),
    ] as unknown as Uppdatering[];
    for (const u of gamla) await f.storage.appendUppdatering(f.projekt, u);
    return f;
  }

  it("ignores the old Avslutat marks: status follows Läge alone", async () => {
    const { apogee, projekt } = await medGamlaMarkeringar();
    expect(await apogee.getProjekt(projekt)).toMatchObject({ status: "pågående", avslutat: false, avslutad: null });
    expect((await apogee.getProjekt(projekt)).tidsplan.milstolpar).toEqual([{ id: "m1", namn: "Demo", datum: "2026-12-01" }]);
  });

  it("leaves the marks out of the Historik, keeping the Milstolpe change", async () => {
    const { apogee, projekt } = await medGamlaMarkeringar();
    const logg = await apogee.historik(projekt);
    expect(logg.map((u) => u.id)).not.toContain("markerad");
    expect(logg.map((u) => u.id)).not.toContain("öppnad");
    expect(logg.at(-1)).toMatchObject({
      id: "med-milstolpe",
      projekt: { före: { milstolpar: [] }, efter: { milstolpar: [{ id: "m1" }] } },
    });
    expect(logg.at(-1)!.projekt!.efter).not.toHaveProperty("avslutat");
    expect((await apogee.historikVy(projekt)).map((r) => r.id)).not.toContain("markerad");
    expect(await apogee.förhandsvisa(projekt, "med-milstolpe")).toMatchObject({ fältSkiljer: [], sammaSomNu: true });
  });
});

describe("Visa with Milstolpar", () => {
  it("shows the dates and Milstolpar at that point and which Milstolpar differ from now", async () => {
    const { apogee, notion, anna, projekt } = await setup();
    const { id: demo, uppdatering: första } = await apogee.addMilstolpe(
      { projekt },
      { namn: "Demo", datum: "2026-12-01" },
      anna,
    );
    const { id: test, uppdatering: tillagd } = await apogee.addMilstolpe(
      { projekt },
      { namn: "Test", datum: "2026-12-05" },
      anna,
    );

    // Nothing has changed since: same as now.
    expect(await apogee.förhandsvisa(projekt, tillagd!.id)).toMatchObject({
      sammaSomNu: true,
      fältSkiljer: [],
      milstolparSkiljer: [],
    });

    await notion.ändraProjekt("Kassan", { startdatum: "2026-11-02", slutdatum: "2026-12-21" });
    await apogee.changeMilstolpe({ projekt }, demo, { datum: "2026-12-02" }, anna);
    const vy = await apogee.förhandsvisa(projekt, första!.id);

    // The dates are not in the Historik: Visa shows today's.
    expect(vy.tidsplan).toEqual({
      startdatum: "2026-11-02",
      slutdatum: "2026-12-21",
      milstolpar: [{ id: demo, namn: "Demo", datum: "2026-12-01" }],
    });
    expect(vy.sammaSomNu).toBe(false);
    expect(vy.fältSkiljer).toEqual(["milstolpar"]);
    expect([...vy.milstolparSkiljer].sort()).toEqual([demo, test].sort());
  });

  it("a date change since leaves Visa the same as now, and Återställ hit has nothing to do", async () => {
    const { apogee, notion, anna, projekt } = await setup();
    const sista = (await apogee.historik(projekt)).at(-1)!;
    await notion.ändraProjekt("Kassan", { startdatum: "2026-11-02", slutdatum: "2026-12-14" });
    expect(await apogee.förhandsvisa(projekt, sista.id)).toMatchObject({ skiljer: [], sammaSomNu: true });
    expect(await apogee.återställHit(projekt, sista.id, anna)).toBeNull();
    expect((await apogee.getProjekt(projekt)).tidsplan.slutdatum).toBe("2026-12-14");
  });
});

describe("a Historik from before dates moved onto the Projekt", () => {
  /** Uppdateringar as the old format wrote them: dates were Projekt-level fields. */
  async function medGamlaDatum() {
    const f = await setup();
    const { storage, projekt, s2 } = f;
    const sista = (await f.apogee.historik(projekt)).at(-1)!;
    const gamla = [
      {
        id: "gammalt-datum",
        typ: "datum",
        vem: f.anna,
        tid: "2026-11-25T11:00:00.000Z",
        ändringar: [],
        projekt: {
          före: { startdatum: null, slutdatum: null },
          efter: { startdatum: "2026-11-02", slutdatum: "2026-12-14" },
        },
      },
      {
        id: "gammal-milstolpe",
        typ: "milstolpe",
        vem: f.anna,
        tid: "2026-11-25T11:01:00.000Z",
        ändringar: [],
        projekt: { före: { milstolpar: [] }, efter: { milstolpar: [{ id: "m1", namn: "Demo", datum: "2026-12-01" }] } },
      },
      {
        id: "gammal-återställning",
        typ: "återställning",
        vem: f.anna,
        tid: "2026-11-25T11:02:00.000Z",
        mål: sista.id,
        ändringar: [
          {
            scopeId: s2,
            före: { namn: "Kassaflöde", läge: 38, ägare: f.erik },
            efter: { namn: "Kassaflöde", läge: 40, ägare: f.erik },
          },
        ],
        projekt: { före: { slutdatum: "2026-12-14" }, efter: { slutdatum: "2026-12-21" } },
      },
    ] as unknown as Uppdatering[];
    for (const u of gamla) await storage.appendUppdatering(projekt, u);
    return { ...f, sista };
  }

  it("ignores its date changes but still folds its Milstolpar", async () => {
    const { apogee, projekt } = await medGamlaDatum();
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({
      startdatum: null,
      slutdatum: null,
      milstolpar: [{ id: "m1", namn: "Demo", datum: "2026-12-01" }],
    });
  });

  it("shows only Scope and Milstolpe changes in the Historik", async () => {
    const { apogee, projekt } = await medGamlaDatum();
    const rader = await apogee.historikVy(projekt);
    expect(rader.map((r) => r.id)).not.toContain("gammalt-datum");
    expect(rader[0]).toMatchObject({ id: "gammal-återställning" });
    expect(rader[0]!.projekt).toBeUndefined();
    expect(rader[1]).toMatchObject({ id: "gammal-milstolpe" });
    expect((await apogee.historik(projekt)).some((u) => u.typ === "datum")).toBe(false);
  });

  it("Ångra and Återställ hit never write dates", async () => {
    const { apogee, anna, projekt, sista } = await medGamlaDatum();
    const ångrad = await apogee.ångra(projekt, "gammal-återställning", anna);
    expect(ångrad.projekt).toBeUndefined();
    const åter = await apogee.återställHit(projekt, sista.id, anna);
    expect(åter!.projekt).toEqual({
      före: { milstolpar: [{ id: "m1", namn: "Demo", datum: "2026-12-01" }] },
      efter: { milstolpar: [] },
    });
    expect((await apogee.getProjekt(projekt)).tidsplan).toEqual({ startdatum: null, slutdatum: null, milstolpar: [] });
  });
});

describe("Återställning and Ångra rules", () => {
  it("restoring to where the chart already is writes nothing", async () => {
    const { apogee, notion, anna, projekt } = await setup();
    const logg = await apogee.historik(projekt);
    expect(await apogee.återställHit(projekt, logg.at(-1)!.id, anna)).toBeNull();
    expect(await apogee.historik(projekt)).toHaveLength(logg.length);
  });

  it("need an active Signatur and an Uppdatering of that Projekt", async () => {
    const { apogee, notion, anna, projekt } = await setup();
    const första = (await apogee.historik(projekt))[0]!.id;
    for (const ogiltig of [null, "okänd"]) {
      await expect(apogee.återställHit(projekt, första, ogiltig)).rejects.toMatchObject({ code: "signatur" });
      await expect(apogee.ångra(projekt, första, ogiltig)).rejects.toMatchObject({ code: "signatur" });
    }
    await expect(apogee.återställHit(projekt, "nej", anna)).rejects.toMatchObject({ code: "finns-inte" });
    await expect(apogee.ångra(projekt, "nej", anna)).rejects.toMatchObject({ code: "finns-inte" });
    await expect(apogee.ångra("nej", första, anna)).rejects.toMatchObject({ code: "finns-inte" });
  });

  it("may bring back an inaktiv Ägare, flagged on the chart", async () => {
    const { apogee, notion, storage, anna, erik, projekt, s2 } = await setup();
    const byte = await apogee.changeScopeÄgare(projekt, s2, anna, anna);
    await storage.savePersoner((await storage.listPersoner()).map((p) => (p.id === erik ? { ...p, aktiv: false } : p)));
    await apogee.ångra(projekt, byte!.id, anna);
    const s = (await apogee.getProjekt(projekt)).scopes.find((x) => x.id === s2);
    expect(s!.ägare).toEqual({ id: erik, namn: "Erik", aktiv: false });
  });
});
