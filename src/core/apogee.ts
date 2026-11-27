// The Apogee core's one public entry point. Every domain rule lives behind
// these commands and queries; each area is its own module in ./apogee/.
import { annonseraUppdateringar } from "./live.js";
import { historik } from "./apogee/historik.js";
import { skapaKärna, type ApogeeDeps } from "./apogee/karna.js";
import { personer } from "./apogee/personer.js";
import { projektfält } from "./apogee/projektfalt.js";
import { scopes } from "./apogee/scopes.js";
import { struktur } from "./apogee/struktur.js";

export type { ApogeeDeps } from "./apogee/karna.js";
export type { Mål } from "./apogee/projektfalt.js";
export type {
  BorttagenVy,
  BorttagetProjekt,
  DiagramVy,
  Förhandsvisning,
  FunktionsområdeVy,
  PersonRad,
  PersonRäkning,
  PersonVy,
  ProjektRad,
  ProjektVy,
  ScopeVy,
  StjärnkartaProjekt,
  StjärnkartaVy,
  TidVy,
  UtanFunktionsområdeVy,
  Översikt,
} from "./apogee/vyer.js";

export type Apogee = ReturnType<typeof createApogee>;

/**
 * The Apogee core: every domain rule lives behind these commands and queries.
 */
export function createApogee({ storage: lagring, now, newId }: ApogeeDeps) {
  // Every Uppdatering written to a Historik is announced via `påUppdatering`.
  const { storage, påUppdatering } = annonseraUppdateringar(lagring);
  const k = skapaKärna({ storage, now, newId });
  return {
    /** Listens for every Uppdatering written, by any command (live sync, #36). */
    påUppdatering,
    ...personer(k),
    ...struktur(k),
    ...scopes(k),
    ...projektfält(k),
    ...historik(k),
  };
}
