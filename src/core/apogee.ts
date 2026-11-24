import { DomainError } from "./errors.js";
import type { Storage } from "./storage.js";
import type {
  Funktionsområde,
  FunktionsområdeId,
  Person,
  PersonId,
  Projekt,
  ProjektId,
} from "./types.js";

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

export type PersonVy = { id: PersonId; namn: string; aktiv: boolean };
const personVy = ({ id, namn, aktiv }: Person): PersonVy => ({ id, namn, aktiv });

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

/** Every write is signed by an active Person; anything else is rejected. */
function requireSignatur(personer: Person[], vem: PersonId | null | undefined): Person {
  if (!vem) throw new DomainError("signatur", "Välj vem du är innan du ändrar något");
  const person = personer.find((p) => p.id === vem);
  if (!person) throw new DomainError("signatur", "Signaturen är inte en Person");
  if (!person.aktiv) throw new DomainError("signatur", `${person.namn} är inaktiv`);
  return person;
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

  /** The active Person signing this write; rejects a missing, unknown or inaktiv Signatur. */
  async function signatur(vem: PersonId | null): Promise<Person> {
    return requireSignatur(await storage.listPersoner(), vem);
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
    async createPerson(namn: string, vem: PersonId | null): Promise<PersonVy> {
      const giltigt = namnFrån(namn);
      const all = await storage.listPersoner();
      if (all.length > 0) requireSignatur(all, vem);
      const nyckel = giltigt.toLocaleLowerCase("sv");
      if (all.some((p) => p.namn.toLocaleLowerCase("sv") === nyckel)) {
        throw new DomainError("finns-redan", `Det finns redan en Person som heter ${giltigt}`);
      }
      const person: Person = { id: newId(), namn: giltigt, aktiv: true, skapad: now().toISOString() };
      await storage.savePersoner([...all, person]);
      return personVy(person);
    },

    async listPersoner(): Promise<PersonVy[]> {
      return (await storage.listPersoner()).sort(efterNamn).map(personVy);
    },

    async createFunktionsområde(namn: string, vem: PersonId | null): Promise<Funktionsområde> {
      await signatur(vem);
      const fo: Funktionsområde = { id: newId(), namn: namnFrån(namn), skapad: now().toISOString() };
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden([...all, fo]);
      return fo;
    },

    async createProjekt(
      funktionsområdeId: FunktionsområdeId,
      namn: string,
      vem: PersonId | null,
    ): Promise<Projekt> {
      await signatur(vem);
      const giltigt = namnFrån(namn);
      await requireFunktionsområde(funktionsområdeId);
      const p: Projekt = { id: newId(), namn: giltigt, funktionsområdeId, skapad: now().toISOString() };
      await storage.saveProjekt(p);
      return p;
    },

    async renameFunktionsområde(id: FunktionsområdeId, nyttNamn: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const namn = namnFrån(nyttNamn);
      await requireFunktionsområde(id);
      const all = await storage.listFunktionsområden();
      await storage.saveFunktionsområden(all.map((f) => (f.id === id ? { ...f, namn } : f)));
    },

    async renameProjekt(id: ProjektId, namn: string, vem: PersonId | null): Promise<void> {
      await signatur(vem);
      const giltigt = namnFrån(namn);
      const p = await requireProjekt(id);
      await storage.saveProjekt({ ...p, namn: giltigt });
    },

    async moveProjekt(
      id: ProjektId,
      funktionsområdeId: FunktionsområdeId,
      vem: PersonId | null,
    ): Promise<void> {
      await signatur(vem);
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
