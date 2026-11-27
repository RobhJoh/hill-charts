// The storage contract: one suite every Storage adapter must pass.
import { describe, expect, it } from "vitest";
import type { Storage } from "../core/storage.js";
import type { Funktionsområde, Person, PersonHändelse, Projekt, Uppdatering } from "../core/types.js";

export type StorageFixture = {
  storage: Storage;
  /**
   * A second Storage over the same data, as after a process restart. Adapters
   * that keep nothing beyond the process return the same instance.
   */
  reopen(): Storage;
};

const fo = (id: string, namn: string): Funktionsområde => ({
  id,
  namn,
  skapad: "2026-11-24T10:00:00.000Z",
});
const projekt = (id: string, namn: string, funktionsområdeId = "f1"): Projekt => ({
  id,
  namn,
  funktionsområdeId,
  skapad: "2026-11-24T10:00:00.000Z",
});
const person = (id: string, namn: string, aktiv = true): Person => ({
  id,
  namn,
  aktiv,
  skapad: "2026-11-24T10:00:00.000Z",
});
const uppdatering =(id: string, läge: number): Uppdatering => ({
  id,
  typ: "flytt",
  vem: "person1",
  tid: "2026-11-24T10:00:00.000Z",
  ändringar: [
    { scopeId: "s1", före: null, efter: { namn: "Betalsteg", läge, ägare: "person1" } },
  ],
});

export function storageContract(name: string, makeFixture: () => Promise<StorageFixture>) {
  describe(`storage contract: ${name}`, () => {
    it("starts empty", async () => {
      const { storage } = await makeFixture();
      expect(await storage.listFunktionsområden()).toEqual([]);
      expect(await storage.listProjekt()).toEqual([]);
      expect(await storage.getProjekt("p1")).toBeUndefined();
      expect(await storage.readHistorik("p1")).toEqual([]);
    });

    it("saves and lists Funktionsområden, replacing the whole set", async () => {
      const { storage } = await makeFixture();
      await storage.saveFunktionsområden([fo("f1", "Ekonomi"), fo("f2", "Plattform")]);
      await storage.saveFunktionsområden([fo("f2", "Plattform 2")]);
      expect(await storage.listFunktionsområden()).toEqual([fo("f2", "Plattform 2")]);
    });

    it("saves and lists Personer, replacing the whole set, and keeps them across a reopen", async () => {
      const fixture = await makeFixture();
      const { storage } = fixture;
      expect(await storage.listPersoner()).toEqual([]);
      await storage.savePersoner([person("a1", "Anna"), person("b1", "Bo")]);
      await storage.savePersoner([person("b1", "Bo", false)]);
      expect(await storage.listPersoner()).toEqual([person("b1", "Bo", false)]);
      (await storage.listPersoner())[0]!.namn = "Ändrad";
      expect(await fixture.reopen().listPersoner()).toEqual([person("b1", "Bo", false)]);
    });

    it("appends Personer-historik in order, returns copies, and keeps it across a reopen", async () => {
      const fixture = await makeFixture();
      const händelse = (id: string, typ: PersonHändelse["typ"]): PersonHändelse => ({
        id,
        typ,
        personId: "a1",
        vem: "b1",
        tid: "2026-11-24T10:00:00.000Z",
        förraNamn: "Ana",
        nyttNamn: "Anna",
      });
      expect(await fixture.storage.readPersonerHistorik()).toEqual([]);
      await fixture.storage.appendPersonHändelse(händelse("h1", "ny"));
      await fixture.storage.appendPersonHändelse(händelse("h2", "byt namn"));
      (await fixture.storage.readPersonerHistorik())[0]!.typ = "ta bort";
      expect(await fixture.reopen().readPersonerHistorik()).toEqual([
        händelse("h1", "ny"),
        händelse("h2", "byt namn"),
      ]);
    });

    it("saves, replaces, gets and lists Projekt", async () => {
      const { storage } = await makeFixture();
      await storage.saveProjekt(projekt("p1", "Sökindex"));
      await storage.saveProjekt(projekt("p2", "Betaltjänst"));
      await storage.saveProjekt(projekt("p1", "Sökindex 2", "f2"));
      expect(await storage.getProjekt("p1")).toEqual(projekt("p1", "Sökindex 2", "f2"));
      const all = await storage.listProjekt();
      expect(all.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
        projekt("p1", "Sökindex 2", "f2"),
        projekt("p2", "Betaltjänst"),
      ]);
    });

    it("keeps a Projekt's Startdatum and Slutdatum, set or cleared, across a reopen", async () => {
      const fixture = await makeFixture();
      const daterat: Projekt = { ...projekt("p1", "Sökindex"), startdatum: "2026-11-02", slutdatum: "2026-12-14" };
      const baraSlut: Projekt = { ...projekt("p2", "Betaltjänst"), startdatum: null, slutdatum: "2026-12-21" };
      await fixture.storage.saveProjekt(daterat);
      await fixture.storage.saveProjekt(baraSlut);
      (await fixture.storage.getProjekt("p1"))!.slutdatum = "2027-01-01";

      for (const s of [fixture.storage, fixture.reopen()]) {
        expect(await s.getProjekt("p1")).toEqual(daterat);
        expect(await s.getProjekt("p2")).toEqual(baraSlut);
      }
      await fixture.storage.saveProjekt({ ...daterat, startdatum: null, slutdatum: null });
      expect(await fixture.reopen().getProjekt("p1")).toMatchObject({ startdatum: null, slutdatum: null });
    });

    it("keeps each Projekt's Historik separate and in append order", async () => {
      const { storage } = await makeFixture();
      await storage.saveProjekt(projekt("p1", "Sökindex"));
      await storage.saveProjekt(projekt("p2", "Betaltjänst"));
      await storage.appendUppdatering("p1", uppdatering("u1", 10));
      await storage.appendUppdatering("p2", uppdatering("u2", 20));
      await storage.appendUppdatering("p1", uppdatering("u3", 30));
      expect(await storage.readHistorik("p1")).toEqual([uppdatering("u1", 10), uppdatering("u3", 30)]);
      expect(await storage.readHistorik("p2")).toEqual([uppdatering("u2", 20)]);
    });

    it("erases a Projekt and its Historik for good, leaving others untouched", async () => {
      const fixture = await makeFixture();
      const { storage } = fixture;
      await storage.saveProjekt(projekt("p1", "Sökindex"));
      await storage.saveProjekt(projekt("p2", "Betaltjänst"));
      await storage.appendUppdatering("p1", uppdatering("u1", 10));
      await storage.appendUppdatering("p2", uppdatering("u2", 20));

      await storage.eraseProjekt("p1");
      await storage.eraseProjekt("finns-inte");

      for (const s of [storage, fixture.reopen()]) {
        expect(await s.getProjekt("p1")).toBeUndefined();
        expect(await s.readHistorik("p1")).toEqual([]);
        expect(await s.listProjekt()).toEqual([projekt("p2", "Betaltjänst")]);
        expect(await s.readHistorik("p2")).toEqual([uppdatering("u2", 20)]);
      }
    });

    it("returns copies, so mutating a result never changes what is stored", async () => {
      const { storage } = await makeFixture();
      await storage.saveFunktionsområden([fo("f1", "Ekonomi")]);
      await storage.saveProjekt(projekt("p1", "Sökindex"));
      await storage.appendUppdatering("p1", uppdatering("u1", 10));

      (await storage.listFunktionsområden())[0]!.namn = "Ändrad";
      (await storage.getProjekt("p1"))!.namn = "Ändrad";
      (await storage.listProjekt())[0]!.namn = "Ändrad";
      (await storage.readHistorik("p1"))[0]!.typ = "ändrad";

      expect(await storage.listFunktionsområden()).toEqual([fo("f1", "Ekonomi")]);
      expect(await storage.getProjekt("p1")).toEqual(projekt("p1", "Sökindex"));
      expect(await storage.readHistorik("p1")).toEqual([uppdatering("u1", 10)]);
    });

    it("keeps everything when reopened, as after a restart", async () => {
      const fixture = await makeFixture();
      await fixture.storage.saveFunktionsområden([fo("f1", "Ekonomi")]);
      await fixture.storage.saveProjekt(projekt("p1", "Sökindex"));
      await fixture.storage.appendUppdatering("p1", uppdatering("u1", 10));

      const reopened = fixture.reopen();
      expect(await reopened.listFunktionsområden()).toEqual([fo("f1", "Ekonomi")]);
      expect(await reopened.listProjekt()).toEqual([projekt("p1", "Sökindex")]);
      expect(await reopened.readHistorik("p1")).toEqual([uppdatering("u1", 10)]);
    });
  });
}
