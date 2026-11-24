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
  const status = async (p = projekt) => {
    const { avslutat, markeradAvslutat, pågående } = await apogee.getProjekt(p);
    return { avslutat, markeradAvslutat, pågående };
  };
  return { apogee, storage, anna, fo, projekt, senare, scope, status };
}

const PÅGÅENDE = { avslutat: false, markeradAvslutat: false, pågående: true };
const AVSLUTAT_AV_LÄGE = { avslutat: true, markeradAvslutat: false, pågående: false };
const MARKERAT = { avslutat: true, markeradAvslutat: true, pågående: false };

describe("Avslutat and Pågående", () => {
  it("a Projekt without Scopes is Avslutat; one with a Scope below Läge 100 is Pågående", async () => {
    const { status, scope } = await setup();
    expect(await status()).toEqual(AVSLUTAT_AV_LÄGE);
    await scope("Prislista", 99);
    expect(await status()).toEqual(PÅGÅENDE);
  });

  it("Avslutat through Läge is Pågående again as soon as a Scope moves back", async () => {
    const { apogee, anna, projekt, status, scope } = await setup();
    const a = await scope("Prislista", 100);
    await scope("Kvitton", 100);
    expect(await status()).toEqual(AVSLUTAT_AV_LÄGE);
    await apogee.moveScope(projekt, a, 95, anna);
    expect(await status()).toEqual(PÅGÅENDE);
    await scope("Moms");
    await apogee.moveScope(projekt, a, 100, anna);
    expect(await status()).toEqual(PÅGÅENDE);
  });

  it("a marked Projekt stays Avslutat whatever its Scopes do, until Öppna igen", async () => {
    const { apogee, anna, projekt, status, scope } = await setup();
    const a = await scope("Prislista", 40);
    const markering = await apogee.markAvslutat(projekt, anna);
    expect(markering).toMatchObject({
      typ: "avslutat",
      vem: anna,
      ändringar: [],
      projekt: { före: { avslutat: false }, efter: { avslutat: true } },
    });
    expect(await status()).toEqual(MARKERAT);
    await apogee.moveScope(projekt, a, 10, anna);
    expect(await status()).toEqual(MARKERAT);

    const öppning = await apogee.reopenProjekt(projekt, anna);
    expect(öppning).toMatchObject({
      typ: "öppna igen",
      projekt: { före: { avslutat: true }, efter: { avslutat: false } },
    });
    expect(await status()).toEqual(PÅGÅENDE);
    expect((await apogee.historik(projekt)).map((u) => u.typ)).toEqual([
      "ny",
      "flytt",
      "avslutat",
      "flytt",
      "öppna igen",
    ]);
  });

  it("reopening a Projekt that is Avslutat through Läge leaves it Avslutat", async () => {
    const { apogee, anna, projekt, status, scope } = await setup();
    await scope("Prislista", 100);
    await apogee.markAvslutat(projekt, anna);
    await apogee.reopenProjekt(projekt, anna);
    expect(await status()).toEqual(AVSLUTAT_AV_LÄGE);
  });

  it("marking a marked Projekt, or reopening an unmarked one, writes nothing", async () => {
    const { apogee, anna, projekt } = await setup();
    expect(await apogee.reopenProjekt(projekt, anna)).toBeNull();
    await apogee.markAvslutat(projekt, anna);
    expect(await apogee.markAvslutat(projekt, anna)).toBeNull();
    expect((await apogee.historik(projekt)).map((u) => u.typ)).toEqual(["avslutat"]);
  });

  it("marking and reopening need an active Signatur and an existing Projekt", async () => {
    const { apogee, anna, projekt } = await setup();
    for (const ogiltig of [null, "okänd"]) {
      await expect(apogee.markAvslutat(projekt, ogiltig)).rejects.toMatchObject({ code: "signatur" });
      await expect(apogee.reopenProjekt(projekt, ogiltig)).rejects.toMatchObject({ code: "signatur" });
    }
    await expect(apogee.markAvslutat("nej", anna)).rejects.toMatchObject({ code: "finns-inte" });
    await expect(apogee.reopenProjekt("nej", anna)).rejects.toMatchObject({ code: "finns-inte" });
    expect(await apogee.historik(projekt)).toEqual([]);
  });
});
