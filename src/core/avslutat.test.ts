import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

/** An Apogee with a Funktionsområde, a Projekt and one active Person, Anna. */
async function setup(storage = createMemoryStorage()) {
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const apogee = createApogee({ storage, now: () => klocka, newId: () => `id${++n}` });
  const anna = (await apogee.createPerson("Anna", null)).id;
  const fo = (await apogee.createFunktionsområde("Ekonomi", anna)).id;
  const projekt = (await apogee.createProjekt(fo, "Kassan", anna)).id;
  const senare = (ms: number) => {
    klocka = new Date(klocka.getTime() + ms);
  };
  const scope = async (namn: string, läge = 0, p = projekt) => {
    const { id } = await apogee.addScope(p, { namn, ägare: anna }, anna);
    if (läge) await apogee.moveScope(p, id, läge, anna);
    return id;
  };
  const status = async (p = projekt) => (await apogee.getProjekt(p)).status;
  return { apogee, storage, anna, fo, projekt, senare, scope, status };
}

describe("Projekt status, derived from Läge alone", () => {
  it("a Projekt with no Scopes is Inte påbörjat, never Avslutat", async () => {
    const { apogee, projekt, status } = await setup();
    expect(await status()).toBe("inte påbörjat");
    expect((await apogee.getProjekt(projekt)).avslutat).toBe(false);
  });

  it("all Scopes at 0 is Inte påbörjat, one above 0 Pågående, all at 100 Avslutat, one back from 100 Pågående", async () => {
    const { apogee, anna, projekt, status, scope } = await setup();
    const a = await scope("Prislista");
    const b = await scope("Kvitton");
    expect(await status()).toBe("inte påbörjat");
    await apogee.moveScope(projekt, a, 1, anna);
    expect(await status()).toBe("pågående");
    await apogee.moveScope(projekt, a, 100, anna);
    expect(await status()).toBe("pågående");
    await apogee.moveScope(projekt, b, 100, anna);
    expect(await status()).toBe("avslutat");
    expect((await apogee.getProjekt(projekt)).avslutat).toBe(true);
    await apogee.moveScope(projekt, a, 95, anna);
    expect(await status()).toBe("pågående");
    await apogee.moveScope(projekt, a, 0, anna);
    await apogee.moveScope(projekt, b, 0, anna);
    expect(await status()).toBe("inte påbörjat");
  });

  it("a new Scope at 0 takes an Avslutat Projekt back to Pågående", async () => {
    const { projekt, status, scope } = await setup();
    await scope("Prislista", 100);
    expect(await status()).toBe("avslutat");
    await scope("Moms", 0, projekt);
    expect(await status()).toBe("pågående");
  });

  it("nobody can mark a Projekt Avslutat or reopen it", async () => {
    const { apogee } = await setup();
    expect("markAvslutat" in apogee).toBe(false);
    expect("reopenProjekt" in apogee).toBe(false);
  });
});

describe("Funktionsområde status, derived from its Projekt that are not Borttagna", () => {
  it("is Inte påbörjat when all are, Avslutat when all are, otherwise Pågående", async () => {
    const { apogee, anna, fo, projekt, scope } = await setup();
    const status = async () => (await apogee.getFunktionsområde(fo)).status;
    const bokslut = (await apogee.createProjekt(fo, "Bokslut", anna)).id;
    expect(await status()).toBe("inte påbörjat");
    const a = await scope("Prislista", 100);
    expect(await status()).toBe("pågående"); // Kassan Avslutat, Bokslut Inte påbörjat
    const b = await scope("Arkiv", 40, bokslut);
    expect(await status()).toBe("pågående");
    await apogee.moveScope(bokslut, b, 100, anna);
    expect(await status()).toBe("avslutat");
    expect((await apogee.overview())[0]!.status).toBe("avslutat");
    await apogee.moveScope(projekt, a, 0, anna);
    expect(await status()).toBe("pågående");
  });

  it("does not count Borttagna Projekt", async () => {
    const { apogee, anna, fo, scope } = await setup();
    const status = async () => (await apogee.getFunktionsområde(fo)).status;
    const bokslut = (await apogee.createProjekt(fo, "Bokslut", anna)).id;
    await scope("Arkiv", 40, bokslut);
    expect(await status()).toBe("pågående");
    await apogee.taBortProjekt(bokslut, anna);
    expect(await status()).toBe("inte påbörjat");
  });
});

const DAG = 86_400_000;

describe("Stilla Scopes", () => {
  it("a Scope is Stilla once strictly more than 14 days (14 × 24 h) pass without a Läge change", async () => {
    const { apogee, projekt, senare, scope } = await setup();
    await scope("Prislista", 30);
    const stilla = async () => {
      const [s] = (await apogee.getProjekt(projekt)).scopes;
      return [s!.stilla, s!.stillaDagar];
    };
    expect(await stilla()).toEqual([false, 0]);
    senare(14 * DAG);
    expect(await stilla()).toEqual([false, 14]);
    senare(1);
    expect(await stilla()).toEqual([true, 14]);
    senare(DAG);
    expect(await stilla()).toEqual([true, 15]);
  });

  it("renaming or a new Ägare is not movement; a Läge change is", async () => {
    const { apogee, anna, projekt, senare, scope } = await setup();
    const a = await scope("Prislista", 30);
    senare(20 * DAG);
    await apogee.renameScope(projekt, a, "Priser", anna);
    expect((await apogee.getProjekt(projekt)).scopes[0]).toMatchObject({ stilla: true, stillaDagar: 20 });
    await apogee.moveScope(projekt, a, 31, anna);
    expect((await apogee.getProjekt(projekt)).scopes[0]).toMatchObject({ stilla: false, stillaDagar: 0 });
  });

  it("a Scope at Läge 100 is never Stilla", async () => {
    const { apogee, projekt, senare, scope } = await setup();
    await scope("Prislista", 100);
    await scope("Kvitton", 50);
    senare(30 * DAG);
    expect((await apogee.getProjekt(projekt)).scopes.map((s) => [s.namn, s.stilla])).toEqual([
      ["Prislista", false],
      ["Kvitton", true],
    ]);
  });

  it("Scopes in an Inte påbörjat Projekt become Stilla after 14 days too", async () => {
    const { apogee, projekt, senare, scope } = await setup();
    await scope("Prislista");
    await scope("Kvitton");
    senare(14 * DAG + 1);
    const vy = await apogee.getProjekt(projekt);
    expect(vy.status).toBe("inte påbörjat");
    expect(vy.scopes.map((s) => s.stilla)).toEqual([true, true]);
  });
});

describe("the overview", () => {
  it("shows each Projekt as a mini chart with its status and Stilla count, and the count per Funktionsområde", async () => {
    const { apogee, anna, fo, projekt, senare, scope } = await setup();
    const klar = (await apogee.createProjekt(fo, "Bokslut", anna)).id;
    await scope("Prislista", 70);
    await scope("Kvitton", 20);
    await scope("Moms", 100);
    await scope("Arkiv", 100, klar);
    senare(20 * DAG);
    await scope("Export", 5);

    const [ekonomi] = await apogee.overview();
    expect(ekonomi).toMatchObject({
      id: fo,
      namn: "Ekonomi",
      borttagen: null,
      borttagnaProjekt: [],
      stilla: 2,
      projekt: [
        { id: klar, namn: "Bokslut", status: "avslutat", avslutat: true, stilla: 0, scopes: [{ läge: 100, stilla: false }] },
        {
          id: projekt,
          namn: "Kassan",
          status: "pågående",
          avslutat: false,
          stilla: 2,
          scopes: [
            { läge: 100, stilla: false },
            { läge: 70, stilla: true },
            { läge: 20, stilla: true },
            { läge: 5, stilla: false },
          ],
        },
      ],
    });
    expect(await apogee.getFunktionsområde(fo)).toEqual(ekonomi);
  });
});

describe("when a Projekt became Avslutat (the date in the Avslutade list)", () => {
  const avslutad = async (apogee: Awaited<ReturnType<typeof setup>>["apogee"]) =>
    (await apogee.overview())[0]!.projekt.map((p) => [p.namn, p.avslutad]);

  it("is the time of the Uppdatering that moved its last Scope to Läge 100", async () => {
    const { apogee, anna, fo, projekt, senare, scope } = await setup();
    const a = await scope("Prislista", 50);
    senare(DAG);
    await apogee.moveScope(projekt, a, 100, anna);
    const b = (await apogee.createProjekt(fo, "Bokslut", anna)).id;
    const arkiv = await scope("Arkiv", 30, b);
    senare(DAG);
    await apogee.moveScope(b, arkiv, 100, anna);
    senare(DAG);
    await apogee.renameScope(projekt, a, "Priser", anna); // later edits do not move the date
    expect(await avslutad(apogee)).toEqual([
      ["Bokslut", "2026-11-26T10:00:00.000Z"],
      ["Kassan", "2026-11-25T10:00:00.000Z"],
    ]);
  });

  it("is null while not Avslutat, and starts over when it is opened and closed again", async () => {
    const { apogee, anna, projekt, senare, scope } = await setup();
    const a = await scope("Prislista", 100);
    senare(DAG);
    await apogee.moveScope(projekt, a, 90, anna);
    expect(await avslutad(apogee)).toEqual([["Kassan", null]]);
    senare(DAG);
    await apogee.moveScope(projekt, a, 100, anna);
    expect(await avslutad(apogee)).toEqual([["Kassan", "2026-11-26T10:00:00.000Z"]]);
  });

  it("is null for a Projekt with no Scopes, and once its only Scope at 100 is removed", async () => {
    const { apogee, anna, projekt, scope } = await setup();
    expect(await avslutad(apogee)).toEqual([["Kassan", null]]);
    const a = await scope("Prislista", 100);
    expect(await avslutad(apogee)).toEqual([["Kassan", "2026-11-24T10:00:00.000Z"]]);
    await apogee.removeScope(projekt, a, anna);
    expect(await avslutad(apogee)).toEqual([["Kassan", null]]);
  });
});
