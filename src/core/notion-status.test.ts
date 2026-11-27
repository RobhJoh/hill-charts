// Notion-status (#78): shown exactly as it reads in Notion, beside the
// derived status, and drives nothing in Apogee.
import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMemoryNotion } from "../notion/minne.js";
import { notionStruktur } from "./test-struktur.js";

async function setup() {
  const storage = createMemoryStorage();
  const källa = createMemoryNotion();
  let n = 0;
  let klocka = new Date("2026-11-24T10:00:00Z");
  const apogee = createApogee({ storage, notion: källa, now: () => klocka, newId: () => `id${++n}` });
  const notion = notionStruktur(apogee, källa, storage);
  const anna = (await apogee.createPerson("Anna", null)).id;
  const senare = (dagar: number) => (klocka = new Date(klocka.getTime() + dagar * 86_400_000));
  return { apogee, notion, anna, senare };
}

describe("Notion-status", () => {
  it("shows a Projekt's Notion-status exactly as it reads in Notion, following each sync", async () => {
    const { apogee, notion } = await setup();
    const id = await notion.projekt("Kassan", "Ekonomi", { notionStatus: "Pågår – väntar på avtal" });
    expect((await apogee.getProjekt(id)).notionStatus).toBe("Pågår – väntar på avtal");

    await notion.ändraProjekt("Kassan", { notionStatus: "Klar" });
    expect((await apogee.getProjekt(id)).notionStatus).toBe("Klar");

    await notion.ändraProjekt("Kassan", { notionStatus: null });
    expect((await apogee.getProjekt(id)).notionStatus).toBeNull();
  });

  it("shows a Funktionsområde's Notion-status on its page and the start page, following each sync", async () => {
    const { apogee, notion } = await setup();
    await notion.projekt("Kassan", "Ekonomi");
    await notion.ändraFunktionsområde("Ekonomi", { notionStatus: "Planerad" });
    const fo = await notion.funktionsområdeId("Ekonomi");
    expect((await apogee.getFunktionsområde(fo)).notionStatus).toBe("Planerad");
    expect(await apogee.overview()).toMatchObject([{ namn: "Ekonomi", notionStatus: "Planerad" }]);

    await notion.ändraFunktionsområde("Ekonomi", { notionStatus: null });
    expect((await apogee.getFunktionsområde(fo)).notionStatus).toBeNull();
  });

  it("shows each Projekt's Notion-status in the start page's and Funktionsområde page's lists, also Utan funktionsområde", async () => {
    const { apogee, notion } = await setup();
    await notion.projekt("Kassan", "Ekonomi", { notionStatus: "Pågår" });
    await notion.projekt("Sökindex", null, { notionStatus: "Ej startad" });
    const fo = await notion.funktionsområdeId("Ekonomi");
    expect((await apogee.getFunktionsområde(fo)).projekt).toMatchObject([{ namn: "Kassan", notionStatus: "Pågår" }]);
    expect(await apogee.overview()).toMatchObject([{ projekt: [{ namn: "Kassan", notionStatus: "Pågår" }] }]);
    expect(await apogee.utanFunktionsområde()).toMatchObject({ projekt: [{ namn: "Sökindex", notionStatus: "Ej startad" }] });
  });

  it("never changes the derived status, Stilla or Över tid, and the two may disagree", async () => {
    const { apogee, notion, anna, senare } = await setup();
    const id = await notion.projekt("Kassan", "Ekonomi", { notionStatus: "Ej startad", slutdatum: "2026-11-30" });
    const scope = await apogee.addScope(id, { namn: "Betalsteg", ägare: anna }, anna);
    await apogee.moveScope(id, scope.id, 40, anna);
    senare(20);
    const fo = await notion.funktionsområdeId("Ekonomi");
    const projektFöre = await apogee.getProjekt(id);
    const foFöre = await apogee.getFunktionsområde(fo);
    const historikFöre = await apogee.historik(id);
    expect(projektFöre).toMatchObject({ status: "pågående", notionStatus: "Ej startad", överTid: true, scopes: [{ stilla: true }] });

    for (const notionStatus of ["Klar", "Avslutad", "Pausad"]) {
      await notion.ändraProjekt("Kassan", { notionStatus });
      await notion.ändraFunktionsområde("Ekonomi", { notionStatus });
      expect(await apogee.getProjekt(id)).toEqual({ ...projektFöre, notionStatus });
      expect(await apogee.getFunktionsområde(fo)).toEqual({
        ...foFöre,
        notionStatus,
        projekt: [{ ...foFöre.projekt[0]!, notionStatus }],
      });
    }
    expect(await apogee.historik(id)).toEqual(historikFöre);
  });
});
