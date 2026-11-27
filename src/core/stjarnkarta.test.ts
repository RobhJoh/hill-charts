import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "./test-struktur.js";

const DAG = 86_400_000;

/** Ekonomi holds Kassan and Moms; Anna and Bo are Personer. */
async function setup(storage = createMemoryStorage()) {
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const källa = createMemoryNotion();
  const apogee = createApogee({ storage, notion: källa, now: () => klocka, newId: () => `id${++n}` });
  const notion = notionStruktur(apogee, källa, storage);
  const anna = (await apogee.createPerson("Anna", null)).id;
  const bo = (await apogee.createPerson("Bo", anna)).id;
  const kassan = await notion.projekt("Kassan", "Ekonomi");
  const fo = await notion.funktionsområdeId("Ekonomi");
  const moms = (await notion.projekt("Moms", "Ekonomi"));
  const senare = (ms: number) => {
    klocka = new Date(klocka.getTime() + ms);
  };
  const scope = async (p: string, namn: string, ägare: string, läge = 0) => {
    const { id } = await apogee.addScope(p, { namn, ägare }, anna);
    if (läge) await apogee.moveScope(p, id, läge, anna);
    return id;
  };
  const karta = async (person: string) => {
    const k = await apogee.stjärnkarta(person);
    return k.projekt.map((p) => ({ namn: p.namn, avslutat: p.avslutat, scopes: p.scopes.map((s) => s.namn) }));
  };
  return { apogee, storage, notion, anna, bo, fo, kassan, moms, senare, scope, karta };
}

describe("Stjärnkarta", () => {
  it("shows only the Person's Scopes, grouped by Projekt in name order, highest Läge first", async () => {
    const { anna, bo, kassan, moms, scope, karta } = await setup();
    await scope(moms, "Deklaration", anna, 20);
    await scope(kassan, "Prislista", anna, 10);
    await scope(kassan, "Kvitton", anna, 70);
    await scope(kassan, "Rabatter", bo, 30);

    expect(await karta(anna)).toEqual([
      { namn: "Kassan", avslutat: false, scopes: ["Kvitton", "Prislista"] },
      { namn: "Moms", avslutat: false, scopes: ["Deklaration"] },
    ]);
    expect(await karta(bo)).toEqual([{ namn: "Kassan", avslutat: false, scopes: ["Rabatter"] }]);
  });

  it("lists Avslutade Projekt after Pågående ones and never Borttagna", async () => {
    const { apogee, notion, anna, fo, kassan, moms, scope, karta } = await setup();
    const arkiv = (await notion.projekt("Arkiv", "Ekonomi"));
    await scope(arkiv, "Pärmar", anna, 100);
    await scope(kassan, "Prislista", anna, 100);
    await scope(moms, "Deklaration", anna, 20);
    const bokslut = (await notion.projekt("Bokslut", "Ekonomi"));
    await scope(bokslut, "Balans", anna, 30);
    await apogee.taBortProjekt(bokslut, anna);

    expect(await karta(anna)).toEqual([
      { namn: "Moms", avslutat: false, scopes: ["Deklaration"] },
      { namn: "Arkiv", avslutat: true, scopes: ["Pärmar"] },
      { namn: "Kassan", avslutat: true, scopes: ["Prislista"] },
    ]);
  });

  it("leaves out Projekt that went with their Borttagen Funktionsområde", async () => {
    const { apogee, notion, anna, fo, kassan, moms, scope, karta } = await setup();
    await scope(kassan, "Prislista", anna, 100);
    await scope(moms, "Deklaration", anna, 100);
    await apogee.taBortFunktionsområde(fo, anna);
    expect(await karta(anna)).toEqual([]);
  });

  it("counts Scopes, Projekt and Stilla Scopes over Pågående Projekt, and Avslutade Projekt apart", async () => {
    const { apogee, notion, anna, bo, kassan, moms, fo, senare, scope } = await setup();
    await scope(kassan, "Prislista", anna, 40);
    await scope(kassan, "Kvitton", anna, 60);
    await scope(kassan, "Rabatter", bo, 60);
    senare(20 * DAG);
    await scope(moms, "Deklaration", anna, 20);
    const arkiv = (await notion.projekt("Arkiv", "Ekonomi"));
    await scope(arkiv, "Pärmar", anna, 100);

    const k = await apogee.stjärnkarta(anna);
    expect(k).toMatchObject({
      person: { id: anna, namn: "Anna", aktiv: true },
      räkning: { scopes: 3, projekt: 2, stilla: 2, avslutade: 1 },
    });
    expect(k.projekt[0]!.scopes.map((s) => [s.namn, s.stilla, s.stillaDagar])).toEqual([
      ["Kvitton", true, 20],
      ["Prislista", true, 20],
    ]);
  });

  it("carries each Projekt's countdown for the key", async () => {
    const { apogee, notion, anna, kassan, scope } = await setup();
    await scope(kassan, "Prislista", anna, 40);
    await notion.ändraProjekt("Kassan", { startdatum: "2026-11-01", slutdatum: "2026-11-20" });
    const [p] = (await apogee.stjärnkarta(anna)).projekt;
    expect(p).toMatchObject({ id: kassan, överTid: true, nedräkning: { läge: "över tid" } });
  });

  it("is not there for an inaktiv or unknown Person", async () => {
    const { apogee, notion, anna, bo, kassan, scope } = await setup();
    await scope(kassan, "Rabatter", bo, 30);
    await apogee.removePerson(bo, anna, anna);
    await expect(apogee.stjärnkarta(bo)).rejects.toMatchObject({ code: "finns-inte" });
    await expect(apogee.stjärnkarta("okänd")).rejects.toMatchObject({ code: "finns-inte" });
  });
});

describe("Personer index", () => {
  it("shows every Person with counts and the Läge of each of their Scopes in Pågående Projekt", async () => {
    const { apogee, notion, anna, bo, fo, kassan, moms, senare, scope } = await setup();
    await scope(kassan, "Prislista", anna, 40);
    senare(20 * DAG);
    await scope(moms, "Deklaration", anna, 70);
    await scope(moms, "Moms", bo, 10);
    const arkiv = (await notion.projekt("Arkiv", "Ekonomi"));
    await scope(arkiv, "Pärmar", anna, 100);
    const cilla = (await apogee.createPerson("Cilla", anna)).id;
    await apogee.removePerson(cilla, anna, anna);

    expect(await apogee.personerÖversikt()).toEqual([
      {
        id: anna,
        namn: "Anna",
        aktiv: true,
        räkning: { scopes: 2, projekt: 2, stilla: 1, avslutade: 1 },
        lägen: [
          { läge: 70, stilla: false },
          { läge: 40, stilla: true },
        ],
      },
      {
        id: bo,
        namn: "Bo",
        aktiv: true,
        räkning: { scopes: 1, projekt: 1, stilla: 0, avslutade: 0 },
        lägen: [{ läge: 10, stilla: false }],
      },
      {
        id: cilla,
        namn: "Cilla",
        aktiv: false,
        räkning: { scopes: 0, projekt: 0, stilla: 0, avslutade: 0 },
        lägen: [],
      },
    ]);
  });
});
