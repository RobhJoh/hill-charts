import type { Storage } from "./storage.js";
import type { ProjektId, Uppdatering } from "./types.js";

/** Told about every Uppdatering once it is in a Projekt's Historik. */
export type UppdateringLyssnare = (projektId: ProjektId, uppdatering: Uppdatering) => void;

/**
 * Wraps `storage` so that every Uppdatering appended to a Historik is
 * announced to the listeners. Announcing at the storage seam means every write
 * command, present and future, is announced without wiring of its own.
 */
export function annonseraUppdateringar(storage: Storage) {
  const lyssnare = new Set<UppdateringLyssnare>();
  const annonserad: Storage = {
    ...storage,
    async appendUppdatering(projektId, uppdatering) {
      await storage.appendUppdatering(projektId, uppdatering);
      for (const l of lyssnare) {
        try {
          l(projektId, structuredClone(uppdatering));
        } catch {
          // A failing listener must not fail the write that is already stored.
        }
      }
    },
  };
  return {
    storage: annonserad,
    /** Listens for written Uppdateringar; returns a function that stops listening. */
    påUppdatering(l: UppdateringLyssnare): () => void {
      lyssnare.add(l);
      return () => lyssnare.delete(l);
    },
  };
}
