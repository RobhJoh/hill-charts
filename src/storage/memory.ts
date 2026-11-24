import type { Storage } from "../core/storage.js";
import type { Funktionsområde, Person, Projekt, ProjektId, Uppdatering } from "../core/types.js";

export type MemoryStorageOptions = {
  /**
   * Delay every call by this many milliseconds. Lets tests widen the window
   * in which unserialized writes would interleave.
   */
  latencyMs?: number;
};

/** Storage held in memory; for tests and development. */
export function createMemoryStorage(options: MemoryStorageOptions = {}): Storage {
  let funktionsområden: Funktionsområde[] = [];
  let personer: Person[] = [];
  const projekt = new Map<ProjektId, Projekt>();
  const historik = new Map<ProjektId, Uppdatering[]>();

  const tick = () =>
    new Promise<void>((resolve) => setTimeout(resolve, options.latencyMs ?? 0));
  const copy = <T>(value: T): T => structuredClone(value);

  return {
    async listFunktionsområden() {
      await tick();
      return copy(funktionsområden);
    },
    async saveFunktionsområden(all) {
      await tick();
      funktionsområden = copy(all);
    },
    async listPersoner() {
      await tick();
      return copy(personer);
    },
    async savePersoner(all) {
      await tick();
      personer = copy(all);
    },
    async listProjekt() {
      await tick();
      return copy([...projekt.values()]);
    },
    async getProjekt(id) {
      await tick();
      return copy(projekt.get(id));
    },
    async saveProjekt(p) {
      await tick();
      projekt.set(p.id, copy(p));
    },
    async eraseProjekt(id) {
      await tick();
      projekt.delete(id);
      historik.delete(id);
    },
    async appendUppdatering(projektId, uppdatering) {
      await tick();
      historik.set(projektId, [...(historik.get(projektId) ?? []), copy(uppdatering)]);
    },
    async readHistorik(projektId) {
      await tick();
      return copy(historik.get(projektId) ?? []);
    },
  };
}
