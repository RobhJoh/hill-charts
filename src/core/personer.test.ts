import { describe, expect, it } from "vitest";
import { createApogee } from "./index.js";
import { createMemoryStorage } from "../storage/memory.js";

/** An Apogee with a Funktionsområde, a Projekt and two active Personer, Anna and Bo. */
async function setup(storage = createMemoryStorage()) {
  let n = 0;
  const apogee = createApogee({
    storage,
    now: () => new Date("2026-11-24T10:00:00Z"),
    newId: () => `id${++n}`,
  });
  const anna = (await apogee.createPerson("Anna", null)).id;
  const bo = (await apogee.createPerson("Bo", anna)).id;
  const fo = (await apogee.createFunktionsområde("Ekonomi", anna)).id;
  const projekt = (await apogee.createProjekt(fo, "Kassan", anna)).id;
  const nyttProjekt = async (namn: string) => (await apogee.createProjekt(fo, namn, anna)).id;
  const scope = async (namn: string, ägare: string, läge = 0, p = projekt) => {
    const { id } = await apogee.addScope(p, { namn, ägare }, anna);
    if (läge) await apogee.moveScope(p, id, läge, anna);
    return id;
  };
  const ägare = async (p = projekt) =>
    Object.fromEntries((await apogee.getProjekt(p)).scopes.map((s) => [s.namn, s.ägare.namn]));
  return { apogee, storage, anna, bo, fo, projekt, nyttProjekt, scope, ägare };
}

describe("renaming a Person", () => {
  it("changes the name everywhere, Historik included, and writes no Uppdatering", async () => {
    const { apogee, anna, bo, projekt, scope } = await setup();
    await scope("Prislista", bo);
    const före = await apogee.historik(projekt);

    await apogee.renamePerson(bo, "Bosse", anna);

    expect((await apogee.listPersoner()).map((p) => p.namn)).toEqual(["Anna", "Bosse"]);
    expect((await apogee.getProjekt(projekt)).scopes[0]!.ägare).toEqual({ id: bo, namn: "Bosse", aktiv: true });
    expect(await apogee.historik(projekt)).toEqual(före);
  });

  it("keeps names unique ignoring case, but a Person may change the case of their own name", async () => {
    const { apogee, anna, bo } = await setup();
    await expect(apogee.renamePerson(bo, " anna ", anna)).rejects.toMatchObject({ code: "finns-redan" });
    await apogee.renamePerson(bo, "BO", anna);
    expect((await apogee.listPersoner()).map((p) => p.namn)).toEqual(["Anna", "BO"]);
  });

  it("needs an active Signatur, a valid name and a known Person", async () => {
    const { apogee, anna, bo } = await setup();
    await expect(apogee.renamePerson(bo, "Bosse", null)).rejects.toMatchObject({ code: "signatur" });
    await expect(apogee.renamePerson(bo, "  ", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.renamePerson("okänd", "Bosse", anna)).rejects.toMatchObject({ code: "finns-inte" });
  });
});

describe("removing a Person (handover)", () => {
  it("hands their Scopes in each Pågående Projekt to the new Ägare in one Uppdatering per Projekt", async () => {
    const { apogee, storage, anna, bo, projekt, nyttProjekt, scope, ägare } = await setup();
    const cia = (await apogee.createPerson("Cia", anna)).id;
    const a = await scope("Prislista", bo, 30);
    const b = await scope("Kvitton", bo, 60);
    await scope("Moms", anna, 10);
    const annat = await nyttProjekt("Lager");
    await scope("Inventering", anna, 20, annat);
    const annatFöre = await apogee.historik(annat);

    const uppdateringar = await apogee.removePerson(bo, cia, anna);

    expect(await ägare()).toEqual({ Prislista: "Cia", Kvitton: "Cia", Moms: "Anna" });
    const logg = await apogee.historik(projekt);
    expect(uppdateringar).toEqual([logg.at(-1)]);
    expect(logg.at(-1)).toMatchObject({
      typ: "överlämning",
      vem: anna,
      ändringar: [
        { scopeId: a, före: { namn: "Prislista", läge: 30, ägare: bo }, efter: { namn: "Prislista", läge: 30, ägare: cia } },
        { scopeId: b, före: { namn: "Kvitton", läge: 60, ägare: bo }, efter: { namn: "Kvitton", läge: 60, ägare: cia } },
      ],
    });
    expect(await apogee.historik(annat)).toEqual(annatFöre);
    expect((await storage.listPersoner()).find((p) => p.id === bo)).toMatchObject({ namn: "Bo", aktiv: false });
  });

  it("leaves Scopes in Avslutade Projekt with the removed Person, shown as inaktiv", async () => {
    const { apogee, anna, bo, projekt, nyttProjekt, scope, ägare } = await setup();
    await scope("Prislista", bo, 30);
    await apogee.markAvslutat(projekt, anna);
    const klart = await nyttProjekt("Lager");
    await scope("Inventering", bo, 100, klart);
    const före = [await apogee.historik(projekt), await apogee.historik(klart)];

    expect(await apogee.removePerson(bo, anna, anna)).toEqual([]);

    expect([await apogee.historik(projekt), await apogee.historik(klart)]).toEqual(före);
    expect(await ägare()).toEqual({ Prislista: "Bo" });
    expect((await apogee.getProjekt(klart)).scopes[0]!.ägare).toEqual({ id: bo, namn: "Bo", aktiv: false });
  });

  it("leaves Scopes in Borttagna Projekt with the removed Person, even while still in progress", async () => {
    const { apogee, anna, bo, projekt, scope } = await setup();
    await scope("Prislista", bo, 30);
    await apogee.taBortProjekt(projekt, anna);
    const före = await apogee.historik(projekt);

    expect(await apogee.removePerson(bo, anna, anna)).toEqual([]);

    expect(await apogee.historik(projekt)).toEqual(före);
    await apogee.återställProjekt(projekt, anna);
    expect((await apogee.getProjekt(projekt)).scopes[0]!.ägare).toEqual({ id: bo, namn: "Bo", aktiv: false });
  });

  it("an inaktiv Person can no longer sign or be chosen as Ägare", async () => {
    const { apogee, anna, bo, projekt, scope } = await setup();
    const s = await scope("Prislista", anna);
    await apogee.removePerson(bo, anna, anna);
    await expect(apogee.moveScope(projekt, s, 40, bo)).rejects.toMatchObject({ code: "signatur" });
    await expect(apogee.addScope(projekt, { namn: "Moms", ägare: bo }, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.changeScopeÄgare(projekt, s, bo, anna)).rejects.toMatchObject({ code: "ogiltig" });
  });

  it("needs an active Signatur and a new Ägare who is another active Person", async () => {
    const { apogee, anna, bo } = await setup();
    const cia = (await apogee.createPerson("Cia", anna)).id;
    await apogee.removePerson(cia, anna, anna);
    await expect(apogee.removePerson(bo, anna, null)).rejects.toMatchObject({ code: "signatur" });
    await expect(apogee.removePerson(bo, bo, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.removePerson(bo, cia, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.removePerson(bo, "okänd", anna)).rejects.toMatchObject({ code: "ogiltig" });
    await expect(apogee.removePerson("okänd", anna, anna)).rejects.toMatchObject({ code: "finns-inte" });
    await expect(apogee.removePerson(cia, anna, anna)).rejects.toMatchObject({ code: "ogiltig" });
    expect((await apogee.listPersoner()).find((p) => p.id === bo)!.aktiv).toBe(true);
  });

  it("merges a duplicate: the duplicate's Scopes go to the Person kept", async () => {
    const { apogee, anna, scope, ägare } = await setup();
    const dubblett = (await apogee.createPerson("Anna S", anna)).id;
    await scope("Prislista", dubblett, 50);
    await apogee.removePerson(dubblett, anna, anna);
    expect(await ägare()).toEqual({ Prislista: "Anna" });
  });
});

describe("an inaktiv Ägare brought back", () => {
  it("Ångra of a handover is allowed and shows the Scope's Ägare as inaktiv until a new one is picked", async () => {
    const { apogee, anna, bo, projekt, scope } = await setup();
    const s = await scope("Prislista", bo, 30);
    const [överlämning] = await apogee.removePerson(bo, anna, anna);

    await apogee.ångra(projekt, överlämning!.id, anna);

    expect((await apogee.getProjekt(projekt)).scopes[0]!.ägare).toEqual({ id: bo, namn: "Bo", aktiv: false });
    await apogee.changeScopeÄgare(projekt, s, anna, anna);
    expect((await apogee.getProjekt(projekt)).scopes[0]!.ägare).toMatchObject({ id: anna, aktiv: true });
  });
});

describe("reactivating a Person", () => {
  it("makes them active again; handed-over Scopes stay with their new Ägare", async () => {
    const { apogee, anna, bo, projekt, scope, ägare } = await setup();
    const s = await scope("Prislista", bo, 30);
    await apogee.removePerson(bo, anna, anna);

    expect(await apogee.reactivatePerson(bo, anna)).toEqual({ id: bo, namn: "Bo", aktiv: true });

    expect(await ägare()).toEqual({ Prislista: "Anna" });
    await apogee.changeScopeÄgare(projekt, s, bo, bo);
    expect(await ägare()).toEqual({ Prislista: "Bo" });
  });

  it("needs an active Signatur and an inaktiv Person", async () => {
    const { apogee, anna, bo } = await setup();
    await expect(apogee.reactivatePerson(bo, anna)).rejects.toMatchObject({ code: "ogiltig" });
    await apogee.removePerson(bo, anna, anna);
    await expect(apogee.reactivatePerson(bo, bo)).rejects.toMatchObject({ code: "signatur" });
    await expect(apogee.reactivatePerson("okänd", anna)).rejects.toMatchObject({ code: "finns-inte" });
  });

  it("adding a name an inaktiv Person has is refused so that Återaktivera can be offered instead", async () => {
    const { apogee, anna, bo } = await setup();
    await apogee.removePerson(bo, anna, anna);
    await expect(apogee.createPerson("bo", anna)).rejects.toMatchObject({ code: "finns-inaktiv" });
    await expect(apogee.renamePerson(anna, "BO", anna)).rejects.toMatchObject({ code: "finns-inaktiv" });
    expect(await apogee.listPersoner()).toHaveLength(2);
  });
});

describe("Personer-historik", () => {
  it("records who changed which Person, what, when, and the old and new name", async () => {
    const { apogee, anna, bo } = await setup();
    await apogee.renamePerson(bo, "Bosse", anna);
    await apogee.removePerson(bo, anna, anna);
    await apogee.reactivatePerson(bo, anna);

    const tid = "2026-11-24T10:00:00.000Z";
    expect((await apogee.personerHistorik()).map(({ id: _, ...h }) => h)).toEqual([
      { typ: "ny", personId: anna, vem: null, tid, förraNamn: null, nyttNamn: "Anna" },
      { typ: "ny", personId: bo, vem: anna, tid, förraNamn: null, nyttNamn: "Bo" },
      { typ: "byt namn", personId: bo, vem: anna, tid, förraNamn: "Bo", nyttNamn: "Bosse" },
      { typ: "ta bort", personId: bo, vem: anna, tid, förraNamn: "Bosse", nyttNamn: "Bosse", nyÄgare: anna },
      { typ: "återaktivera", personId: bo, vem: anna, tid, förraNamn: "Bosse", nyttNamn: "Bosse" },
    ]);
  });

  it("records nothing for a refused change", async () => {
    const { apogee, anna, bo } = await setup();
    await expect(apogee.renamePerson(bo, "Anna", anna)).rejects.toThrow();
    await expect(apogee.removePerson(bo, bo, anna)).rejects.toThrow();
    expect(await apogee.personerHistorik()).toHaveLength(2);
  });
});
