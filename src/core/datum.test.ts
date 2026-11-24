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
  const idag = (datum: string) => {
    klocka = new Date(`${datum}T11:00:00Z`);
  };
  return { apogee, anna, fo, projekt, idag };
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
