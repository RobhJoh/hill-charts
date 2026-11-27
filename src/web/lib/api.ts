// Thin client for the JSON API in src/server/http.ts. Writes take the
// Signatur (`vem`, a Person id) and send it in the Apogee-Signatur header;
// pages get it from `signatur.signera` in signatur.svelte.ts.
import type {
  Mål,
  Förhandsvisning,
  FunktionsområdeVy,
  HistorikRad,
  PersonHändelse,
  PersonRad,
  PersonVy,
  ProjektVy,
  StjärnkartaVy,
  SynkStatus,
  Uppdatering,
  UtanFunktionsområdeVy,
  Översikt,
} from "../../core/index.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly fel: string,
    message: string,
    /** On "finns-inaktiv": the inaktiv Person who has the name. */
    readonly person?: PersonVy,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown, vem?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (vem) headers["apogee-signatur"] = vem;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new ApiError(res.status, data?.fel ?? "fel", data?.meddelande ?? "Något gick fel", data?.person);
  }
  return data as T;
}

const enc = encodeURIComponent;

const målPath = (mål: Mål) =>
  "projekt" in mål ? `/projekt/${enc(mål.projekt)}` : `/funktionsomraden/${enc(mål.funktionsområde)}`;

export const api = {
  overview: () => call<Översikt>("GET", "/oversikt"),
  utanFunktionsområde: () => call<UtanFunktionsområdeVy | null>("GET", "/utan-funktionsomrade"),
  getFunktionsområde: (id: string) => call<FunktionsområdeVy>("GET", `/funktionsomraden/${enc(id)}`),
  getProjekt: (id: string) => call<ProjektVy>("GET", `/projekt/${enc(id)}`),
  listPersoner: () => call<PersonVy[]>("GET", "/personer"),

  /** `vem` is null only when adding the first Person to an empty list. */
  createPerson: (namn: string, vem: string | null) => call<PersonVy>("POST", "/personer", { namn }, vem),
  renamePerson: (id: string, namn: string, vem: string) =>
    call<PersonVy>("PATCH", `/personer/${enc(id)}`, { namn }, vem),
  /** Hands their Scopes in Projekt not Avslutat to `nyÄgare` and makes them inaktiv. */
  removePerson: (id: string, nyÄgare: string, vem: string) =>
    call<{ uppdateringar: Uppdatering[] }>("DELETE", `/personer/${enc(id)}`, { nyÄgare }, vem),
  reactivatePerson: (id: string, vem: string) =>
    call<PersonVy>("POST", `/personer/${enc(id)}/ateraktivera`, undefined, vem),
  personerHistorik: () => call<PersonHändelse[]>("GET", "/personer/historik"),
  /** The Personer index: every Person with counts and Läge dots. */
  personerÖversikt: () => call<PersonRad[]>("GET", "/personer/oversikt"),
  /** A Person's Stjärnkarta; 404 for an inaktiv or unknown Person. */
  stjärnkarta: (personId: string) => call<StjärnkartaVy>("GET", `/personer/${enc(personId)}/stjarnkarta`),
  /** The sync state: when Apogee last fetched from Notion. */
  synkStatus: () => call<SynkStatus>("GET", "/notion/synk"),
  /** Hämta från Notion nu: waits for the sync (or joins one already running). */
  synkaFrånNotion: () => call<SynkStatus>("POST", "/notion/synk"),

  /** Ta bort: always allowed for a Projekt; a Funktionsområde only when none of its Projekt is Pågående. */
  taBortProjekt: (id: string, vem: string) => call<void>("POST", `/projekt/${enc(id)}/borttagen`, undefined, vem),
  återställProjekt: (id: string, vem: string) =>
    call<void>("DELETE", `/projekt/${enc(id)}/borttagen`, undefined, vem),
  /** Radera a Borttagen Projekt for good; `namn` is the typed confirmation. */
  raderaProjekt: (id: string, namn: string, vem: string) => call<void>("DELETE", `/projekt/${enc(id)}`, { namn }, vem),
  taBortFunktionsområde: (id: string, vem: string) =>
    call<void>("POST", `/funktionsomraden/${enc(id)}/borttagen`, undefined, vem),
  återställFunktionsområde: (id: string, vem: string) =>
    call<void>("DELETE", `/funktionsomraden/${enc(id)}/borttagen`, undefined, vem),
  /** Radera a Borttaget Funktionsområde and every Projekt in it, for good. */
  raderaFunktionsområde: (id: string, namn: string, vem: string) =>
    call<void>("DELETE", `/funktionsomraden/${enc(id)}`, { namn }, vem),
  /** "Borttagna Funktionsområden", newest first. */
  borttagnaFunktionsområden: () => call<FunktionsområdeVy[]>("GET", "/borttagna"),

  historik: (projektId: string) => call<Uppdatering[]>("GET", `/projekt/${enc(projektId)}/historik`),
  addScope: (projektId: string, namn: string, ägare: string, vem: string) =>
    call<{ id: string; uppdatering: Uppdatering }>("POST", `/projekt/${enc(projektId)}/scopes`, { namn, ägare }, vem),
  /** Exactly one of läge, namn, ägare. The Uppdatering is null when nothing changed. */
  changeScope: (
    projektId: string,
    scopeId: string,
    ändring: { läge: number } | { namn: string } | { ägare: string },
    vem: string,
  ) =>
    call<{ uppdatering: Uppdatering | null }>(
      "PATCH",
      `/projekt/${enc(projektId)}/scopes/${enc(scopeId)}`,
      ändring,
      vem,
    ),
  removeScope: (projektId: string, scopeId: string, vem: string) =>
    call<{ uppdatering: Uppdatering }>("DELETE", `/projekt/${enc(projektId)}/scopes/${enc(scopeId)}`, undefined, vem),

  addMilstolpe: (mål: Mål, milstolpe: { namn: string; datum: string }, vem: string) =>
    call<{ id: string; uppdatering: Uppdatering | null }>("POST", `${målPath(mål)}/milstolpar`, milstolpe, vem),
  changeMilstolpe: (mål: Mål, milstolpeId: string, ändring: { namn?: string; datum?: string }, vem: string) =>
    call<{ uppdatering: Uppdatering | null }>("PATCH", `${målPath(mål)}/milstolpar/${enc(milstolpeId)}`, ändring, vem),
  removeMilstolpe: (mål: Mål, milstolpeId: string, vem: string) =>
    call<{ uppdatering: Uppdatering | null }>("DELETE", `${målPath(mål)}/milstolpar/${enc(milstolpeId)}`, undefined, vem),

  /** The Historik panel's rows, newest first, drags merged. */
  historikVy: (projektId: string) => call<HistorikRad<PersonVy>[]>("GET", `/projekt/${enc(projektId)}/historikvy`),
  /** Visa: the chart right after an Uppdatering, and the Scopes that differ from now. */
  förhandsvisa: (projektId: string, uppdateringId: string) =>
    call<Förhandsvisning>("GET", `/projekt/${enc(projektId)}/historik/${enc(uppdateringId)}`),
  /** Återställ hit. The Uppdatering is null when the chart already looks like that. */
  återställHit: (projektId: string, mål: string, vem: string) =>
    call<{ uppdatering: Uppdatering | null }>("POST", `/projekt/${enc(projektId)}/aterstallning`, { mål }, vem),
  /** Ångra bara denna. Rejects with fel "krock" (409) when a field has changed since. */
  ångra: (projektId: string, mål: string, vem: string) =>
    call<{ uppdatering: Uppdatering }>("POST", `/projekt/${enc(projektId)}/angra`, { mål }, vem),
};
