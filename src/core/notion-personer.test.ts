// The Notion sync and Personer (#77): every Projektledare and Funktionsansvarig
// becomes a Person, matched by Notion id, else by name ignoring case.
import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "./test-struktur.js";

function setup() {
  const storage = createMemoryStorage();
  const källa = createMemoryNotion();
  let n = 0;
  const apogee = createApogee({
    storage,
    notion: källa,
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
  return { apogee, källa, notion: notionStruktur(apogee, källa, storage) };
}

const namnen = async (apogee: ReturnType<typeof setup>["apogee"]) =>
  (await apogee.listPersoner()).map((p) => `${p.namn}${p.aktiv ? "" : " (inaktiv)"}`);

describe("Projektledare and Funktionsansvarig from Notion", () => {
  it("makes an unknown Notion person a new Person and shows them as Projektledare", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-cia", namn: "Cia Berg" });
    const id = await notion.projekt("Kassan", null, { projektledare: "u-cia" });

    expect(await namnen(apogee)).toEqual(["Cia Berg"]);
    const [cia] = await apogee.listPersoner();
    expect((await apogee.getProjekt(id)).projektledare).toEqual(cia);
  });

  it("links an existing Person with the same name in any case instead of duplicating them", async () => {
    const { apogee, källa, notion } = setup();
    const cia = await apogee.createPerson("cia berg", null);
    källa.person({ notionId: "u-cia", namn: "Cia Berg" });
    const kassan = await notion.projekt("Kassan", null, { projektledare: "u-cia" });
    const moms = await notion.projekt("Moms", null, { projektledare: "u-cia" });

    expect(await namnen(apogee)).toEqual(["cia berg"]);
    expect((await apogee.getProjekt(kassan)).projektledare).toEqual(cia);
    expect((await apogee.getProjekt(moms)).projektledare).toEqual(cia);
  });

  it("keeps the link when the Person is renamed in Apogee or in Notion", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-cia", namn: "Cia" });
    const id = await notion.projekt("Kassan", null, { projektledare: "u-cia" });
    const cia = (await apogee.getProjekt(id)).projektledare!;

    await apogee.renamePerson(cia.id, "Cecilia", cia.id);
    await notion.synka();
    expect((await apogee.getProjekt(id)).projektledare).toEqual({ ...cia, namn: "Cecilia" });

    källa.person({ notionId: "u-cia", namn: "Cia Berg" });
    await notion.synka();
    expect((await apogee.getProjekt(id)).projektledare).toEqual({ ...cia, namn: "Cecilia" });
    expect(await namnen(apogee)).toEqual(["Cecilia"]);
  });

  it("links by Notion id once linked, even when another Person later takes the Notion name", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-cia", namn: "Cia" });
    const id = await notion.projekt("Kassan", null, { projektledare: "u-cia" });
    const cia = (await apogee.getProjekt(id)).projektledare!;
    await apogee.renamePerson(cia.id, "Cecilia", cia.id);
    await apogee.createPerson("Cia", cia.id);

    await notion.synka();

    expect((await apogee.getProjekt(id)).projektledare?.id).toBe(cia.id);
  });

  it("never makes a Person inaktiv, also when they are gone from Notion", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-cia", namn: "Cia" });
    await notion.projekt("Kassan", null, { projektledare: "u-cia" });
    await notion.ändraProjekt("Kassan", { projektledare: null });
    källa.utan(notion.idFör("Kassan"));
    await notion.synka();

    expect(await namnen(apogee)).toEqual(["Cia"]);
  });

  it("links an inaktiv Person by name and leaves them inaktiv", async () => {
    const { apogee, källa, notion } = setup();
    const anna = (await apogee.createPerson("Anna", null)).id;
    const cia = (await apogee.createPerson("Cia", anna)).id;
    await apogee.removePerson(cia, anna, anna);
    källa.person({ notionId: "u-cia", namn: "CIA" });
    const id = await notion.projekt("Kassan", null, { projektledare: "u-cia" });

    expect(await namnen(apogee)).toEqual(["Anna", "Cia (inaktiv)"]);
    expect((await apogee.getProjekt(id)).projektledare).toEqual({ id: cia, namn: "Cia", aktiv: false });
  });

  it("gives two Notion people with the same name two Personer", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-cia1", namn: "Cia" });
    källa.person({ notionId: "u-cia2", namn: "Cia" });
    const a = await notion.projekt("Kassan", null, { projektledare: "u-cia1" });
    const b = await notion.projekt("Moms", null, { projektledare: "u-cia2" });

    expect(await namnen(apogee)).toEqual(["Cia", "Cia (2)"]);
    expect((await apogee.getProjekt(a)).projektledare?.namn).toBe("Cia");
    expect((await apogee.getProjekt(b)).projektledare?.namn).toBe("Cia (2)");
  });

  it("records a Person made by the sync in the Personer-historik, unsigned, and writes no Uppdatering", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-cia", namn: "Cia" });
    const id = await notion.projekt("Kassan", null, { projektledare: "u-cia" });
    const cia = (await apogee.getProjekt(id)).projektledare!;

    expect(await apogee.personerHistorik()).toMatchObject([
      { typ: "ny", personId: cia.id, vem: null, förraNamn: null, nyttNamn: "Cia" },
    ]);
    expect(await apogee.historik(id)).toEqual([]);
  });

  it("shows the Funktionsansvarig on the Funktionsområde", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-bo", namn: "Bo" });
    källa.funktionsområde({ notionId: notion.idFör("Ekonomi"), namn: "Ekonomi", funktionsansvarig: "u-bo" });
    await notion.projekt("Kassan", "Ekonomi");
    const [bo] = await apogee.listPersoner();

    expect(await apogee.getFunktionsområde(await notion.funktionsområdeId("Ekonomi"))).toMatchObject({
      funktionsansvarig: bo,
    });
    expect((await apogee.overview())[0]!.funktionsansvarig).toEqual(bo);
  });

  it("empties Projektledare and Funktionsansvarig when they are emptied in Notion", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-bo", namn: "Bo" });
    källa.funktionsområde({ notionId: notion.idFör("Ekonomi"), namn: "Ekonomi", funktionsansvarig: "u-bo" });
    const id = await notion.projekt("Kassan", "Ekonomi", { projektledare: "u-bo" });
    const fo = await notion.funktionsområdeId("Ekonomi");

    await notion.ändraFunktionsområde("Ekonomi", { funktionsansvarig: null });
    await notion.ändraProjekt("Kassan", { projektledare: null });

    expect((await apogee.getProjekt(id)).projektledare).toBeNull();
    expect((await apogee.getFunktionsområde(fo)).funktionsansvarig).toBeNull();
    expect(await namnen(apogee)).toEqual(["Bo"]);
  });

  it("treats a Notion person with no name as no Projektledare", async () => {
    const { apogee, källa, notion } = setup();
    källa.person({ notionId: "u-x", namn: "  " });
    const id = await notion.projekt("Kassan", null, { projektledare: "u-x" });

    expect((await apogee.getProjekt(id)).projektledare).toBeNull();
    expect(await apogee.listPersoner()).toEqual([]);
  });
});
