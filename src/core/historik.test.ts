import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

/**
 * The prototype/historik start state: Anna, Erik and Klottraren; a Projekt
 * with s1 Prislista 72/Anna, s2 Kassaflöde 38/Erik, s3 Kvittomejl 12/Anna,
 * s4 Rabattkoder 55/Erik (each added then moved by Anna), then +1 day.
 */
async function setup() {
  const storage = createMemoryStorage();
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const apogee = createApogee({ storage, now: () => klocka, newId: () => `id${++n}` });
  const anna = (await apogee.createPerson("Anna", null)).id;
  const erik = (await apogee.createPerson("Erik", anna)).id;
  const klottrare = (await apogee.createPerson("Klottraren", anna)).id;
  const fo = await apogee.createFunktionsområde("Ekonomi", anna);
  const projekt = (await apogee.createProjekt(fo.id, "Kassan", anna)).id;
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
  return { apogee, storage, anna, erik, klottrare, projekt, senare, s1, s2, s3, s4, diagram };
}

describe("Återställ hit", () => {
  it("puts the whole chart back to right after the target as one Uppdatering, bringing a removed Scope back with its id", async () => {
    const { apogee, anna, erik, klottrare, projekt, s1, s2, s3, s4, diagram } = await setup();
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
    const { apogee, anna, erik, klottrare, projekt, senare, s1, s2, s3, s4, diagram } = await setup();
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
    const { apogee, anna, erik, projekt, s2, diagram } = await setup();
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
    const { apogee, anna, erik, projekt, s2, diagram } = await setup();
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
    const { apogee, anna, erik, projekt, senare, s2 } = await setup();
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
    const { apogee, anna, erik, projekt, senare, s1, s2 } = await setup();
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
    const { apogee, anna, erik, projekt, senare, s2 } = await setup();
    await apogee.moveScope(projekt, s2, 40, anna);
    senare(11);
    await apogee.moveScope(projekt, s2, 41, anna);
    await apogee.moveScope(projekt, s2, 42, erik);
    const rader = await apogee.historikVy(projekt);
    expect(rader.slice(0, 3).map((r) => r.antal)).toEqual([1, 1, 1]);
  });

  it("marks skipped Uppdateringar bortåterställd and undone ones ångrad", async () => {
    const { apogee, anna, erik, klottrare, projekt, s1, s3, s4 } = await setup();
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
    const { apogee, storage, projekt, s2 } = await setup();
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
    const { apogee, anna, erik, klottrare, projekt, senare, s1, s2, s3, s4 } = await setup();
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

describe("Projekt-level Uppdateringar (Avslutat)", () => {
  it("Ångra of Markera Avslutat reopens; blocked when Avslutat has changed since", async () => {
    const { apogee, anna, erik, projekt } = await setup();
    const markera = await apogee.markAvslutat(projekt, anna);
    const u = await apogee.ångra(projekt, markera!.id, erik);
    expect(u).toMatchObject({ typ: "ångra", ändringar: [], projekt: { före: { avslutat: true }, efter: { avslutat: false } } });
    expect(await apogee.getProjekt(projekt)).toMatchObject({ markeradAvslutat: false });

    const igen = await apogee.markAvslutat(projekt, anna);
    await apogee.reopenProjekt(projekt, erik);
    await expect(apogee.ångra(projekt, igen!.id, anna)).rejects.toMatchObject({
      code: "krock",
      message: expect.stringMatching(/Projektet.*avslutat/),
    });
  });

  it("Återställ hit and its Ångra fold the Projekt fields together with the Scopes", async () => {
    const { apogee, anna, erik, projekt, s2, diagram } = await setup();
    const före = (await apogee.historik(projekt)).at(-1)!;
    await apogee.moveScope(projekt, s2, 90, erik);
    await apogee.markAvslutat(projekt, erik);
    const innan = await diagram();

    const åter = await apogee.återställHit(projekt, före.id, anna);
    expect(åter!.projekt).toEqual({ före: { avslutat: true }, efter: { avslutat: false } });
    expect(await apogee.getProjekt(projekt)).toMatchObject({ markeradAvslutat: false });
    expect((await diagram()).find(([id]) => id === s2)![2]).toBe(38);

    await apogee.ångra(projekt, åter!.id, anna);
    expect(await apogee.getProjekt(projekt)).toMatchObject({ markeradAvslutat: true });
    expect(await diagram()).toEqual(innan);
  });

  it("Visa shows whether the Projekt was marked Avslutat at that point", async () => {
    const { apogee, anna, projekt } = await setup();
    const markera = await apogee.markAvslutat(projekt, anna);
    await apogee.reopenProjekt(projekt, anna);
    expect(await apogee.förhandsvisa(projekt, markera!.id)).toMatchObject({ markeradAvslutat: true, avslutat: true });
  });
});

describe("Återställning and Ångra rules", () => {
  it("restoring to where the chart already is writes nothing", async () => {
    const { apogee, anna, projekt } = await setup();
    const logg = await apogee.historik(projekt);
    expect(await apogee.återställHit(projekt, logg.at(-1)!.id, anna)).toBeNull();
    expect(await apogee.historik(projekt)).toHaveLength(logg.length);
  });

  it("need an active Signatur and an Uppdatering of that Projekt", async () => {
    const { apogee, anna, projekt } = await setup();
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
    const { apogee, storage, anna, erik, projekt, s2 } = await setup();
    const byte = await apogee.changeScopeÄgare(projekt, s2, anna, anna);
    await storage.savePersoner((await storage.listPersoner()).map((p) => (p.id === erik ? { ...p, aktiv: false } : p)));
    await apogee.ångra(projekt, byte!.id, anna);
    const s = (await apogee.getProjekt(projekt)).scopes.find((x) => x.id === s2);
    expect(s!.ägare).toEqual({ id: erik, namn: "Erik", aktiv: false });
  });
});
