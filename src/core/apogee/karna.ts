// What every area of the core shares: storage (announcing each Uppdatering),
// the injected clock and ids, and the lookups and writes all commands use.
import { idagFrån } from "../datum.js";
import { DomainError } from "../errors.js";
import type { NotionKälla } from "../notion.js";
import type { Storage } from "../storage.js";
import type { Funktionsområde, FunktionsområdeId, Person, PersonId, Projekt, ProjektId, Uppdatering, UppdateringId } from "../types.js";
import { utanGamlaDatum } from "../status.js";
import { requireSignatur } from "./regler.js";
import { diagramVy, projektTidVy, type DiagramVy, type TidVy } from "./vyer.js";

export type ApogeeDeps = {
  storage: Storage;
  /** The clock; injected so tests are deterministic. */
  now: () => Date;
  /** Id generator; injected so tests are deterministic. */
  newId: () => string;
  /** Where the structure comes from (ADR 0003). Without it, `synkaFrånNotion` fails. */
  notion?: NotionKälla;
  /**
   * Runs the sync's writes in turn with every other write (ADR 0001). The
   * server passes its write queue; without it the writes run at once.
   */
  skrivkö?: <T>(steg: () => Promise<T>) => Promise<T>;
};

export type Kärna = ReturnType<typeof skapaKärna>;

/**
 * `lagring` must already announce Uppdateringar (see live.ts). Every Historik
 * is read without the dates an older Historik held (`utanGamlaDatum`).
 */
export function skapaKärna({ storage: lagring, now, newId }: Pick<ApogeeDeps, "storage" | "now" | "newId">) {
  const storage: Storage = {
    ...lagring,
    readHistorik: async (projektId) => utanGamlaDatum(await lagring.readHistorik(projektId)),
  };
  return {
    storage,
    now,
    newId,

    /** The active Person signing this write; rejects a missing, unknown or inaktiv Signatur. */
    async signatur(vem: PersonId | null): Promise<Person> {
      return requireSignatur(await storage.listPersoner(), vem);
    },

    async requireFunktionsområde(id: FunktionsområdeId): Promise<Funktionsområde> {
      const fo = (await storage.listFunktionsområden()).find((f) => f.id === id);
      if (!fo) throw new DomainError("finns-inte", `Funktionsområdet ${id} finns inte`);
      return fo;
    },

    async requireProjekt(id: ProjektId): Promise<Projekt> {
      const p = await storage.getProjekt(id);
      if (!p) throw new DomainError("finns-inte", `Projektet ${id} finns inte`);
      return p;
    },

    /** Appends one Uppdatering to a Projekt's Historik. Every chart edit goes through here. */
    async skriv(
      projektId: ProjektId,
      typ: string,
      ändringar: Uppdatering["ändringar"],
      vem: PersonId,
      projekt?: Uppdatering["projekt"],
      mål?: UppdateringId,
    ): Promise<Uppdatering> {
      const u: Uppdatering = { id: newId(), typ, vem, tid: now().toISOString(), ...(mål ? { mål } : {}), ändringar };
      if (projekt) u.projekt = projekt;
      await storage.appendUppdatering(projektId, u);
      return u;
    },

    /** A Projekt's Hill chart and status from its Historik, against the clock's "now". */
    diagramVy(logg: Uppdatering[], personer: Person[], borttagen: boolean): DiagramVy {
      return diagramVy(logg, personer, borttagen, now());
    },

    /** A Projekt's dates, Milstolpar (from its Historik) and countdown, against today. */
    projektTidVy(p: Projekt, logg: Uppdatering[], avslutat: boolean): TidVy {
      return projektTidVy(p, logg, avslutat, idagFrån(now()));
    },
  };
}
