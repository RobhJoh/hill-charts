import { DomainError } from "./errors.js";
import type { Storage } from "./storage.js";
import type { Funktionsområde, FunktionsområdeId, Projekt, ProjektId } from "./types.js";

export type ApogeeDeps = {
  storage: Storage;
  /** The clock; injected so tests are deterministic. */
  now: () => Date;
  /** Id generator; injected so tests are deterministic. */
  newId: () => string;
};

export type ProjektRad = { id: ProjektId; namn: string };
export type FunktionsområdeVy = { id: FunktionsområdeId; namn: string; projekt: ProjektRad[] };
export type Översikt = FunktionsområdeVy[];
export type ProjektVy = {
  id: ProjektId;
  namn: string;
  funktionsområde: { id: FunktionsområdeId; namn: string };
};

export type Apogee = ReturnType<typeof createApogee>;

const MAX_NAMN = 200;

function namnFrån(input: string): string {
  const namn = String(input ?? "").trim();
  if (!namn) throw new DomainError("ogiltig", "Namnet får inte vara tomt");
  if (namn.length > MAX_NAMN) {
    throw new DomainError("ogiltig", `Namnet får vara högst ${MAX_NAMN} tecken`);
  }
  return namn;
}

const svenskOrdning = new Intl.Collator("sv");
const efterNamn = (a: { namn: string }, b: { namn: string }) => svenskOrdning.compare(a.namn, b.namn);

/**
 * The Apogee core: every domain rule lives behind these commands and queries.
 */
export function createApogee({ storage, now, newId }: ApogeeDeps) {
  async function requireFunktionsområde(id: FunktionsområdeId): Promise<Funktionsområde> {
    const fo = (await storage.listFunktionsområden()).find((f) => f.id === id);
    if (!fo) throw new DomainError("finns-inte", `Funktionsområdet ${id} finns inte`);
    return fo;
  }

  async function requireProjekt(id: ProjektId): Promise<Projekt> {
    const p = await storage.getProjekt(id);
    if (!p) throw new DomainError("finns-inte", `Projektet ${id} finns inte`);
    return p;
  }

  function vy(fo: Funktionsområde, allProjekt: Projekt[]): FunktionsområdeVy {
    return {
      id: fo.id,
      namn: fo.namn,
      projekt: allProjekt
        .filter((p) => p.funktionsområdeId === fo.id)
        .sort(efterNamn)
        .map((p) => ({ id: p.id, namn: p.namn })),
    };
  }

  return {
    async createFunktionsområde(namn: string): Promise<Funktionsområde> {
      const fo: Funktionsområde = { id: newId(), namn: namnFrån(namn), skapad: now().toISOString() };
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden([...all, fo]);
      return fo;
    },

    async createProjekt(funktionsområdeId: FunktionsområdeId, namn: string): Promise<Projekt> {
      const giltigt = namnFrån(namn);
      await requireFunktionsområde(funktionsområdeId);
      const p: Projekt = { id: newId(), namn: giltigt, funktionsområdeId, skapad: now().toISOString() };
      await storage.saveProjekt(p);
      return p;
    },

    async renameFunktionsområde(id: FunktionsområdeId, nyttNamn: string): Promise<void> {
      const namn = namnFrån(nyttNamn);
      await requireFunktionsområde(id);
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden(all.map((f) => (f.id === id ? { ...f, namn } : f)));
    },

    async renameProjekt(id: ProjektId, namn: string): Promise<void> {
      const giltigt = namnFrån(namn);
      const p = await requireProjekt(id);
      await storage.saveProjekt({ ...p, namn: giltigt });
    },

    async moveProjekt(id: ProjektId, funktionsområdeId: FunktionsområdeId): Promise<void> {
      const p = await requireProjekt(id);
      await requireFunktionsområde(funktionsområdeId);
      await storage.saveProjekt({ ...p, funktionsområdeId });
    },

    async overview(): Promise<Översikt> {
      const [all, allProjekt] = await Promise.all([
        storage.listFunktionsområden(),
        storage.listProjekt(),
      ]);
      return [...all].sort(efterNamn).map((fo) => vy(fo, allProjekt));
    },

    async getFunktionsområde(id: FunktionsområdeId): Promise<FunktionsområdeVy> {
      const fo = await requireFunktionsområde(id);
      return vy(fo, await storage.listProjekt());
    },

    async getProjekt(id: ProjektId): Promise<ProjektVy> {
      const p = await requireProjekt(id);
      const fo = await requireFunktionsområde(p.funktionsområdeId);
      return { id: p.id, namn: p.namn, funktionsområde: { id: fo.id, namn: fo.namn } };
    },
  };
}
