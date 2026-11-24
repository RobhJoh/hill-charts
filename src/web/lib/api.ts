// Thin client for the JSON API in src/server/http.ts. Writes take the
// Signatur (`vem`, a Person id) and send it in the Apogee-Signatur header;
// pages get it from `signatur.signera` in signatur.svelte.ts.
import type {
  Förhandsvisning,
  Funktionsområde,
  FunktionsområdeVy,
  HistorikRad,
  PersonHändelse,
  PersonVy,
  Projekt,
  ProjektVy,
  Uppdatering,
  Översikt,
} from "../../core/index.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly fel: string,
    message: string,
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
  if (!res.ok) throw new ApiError(res.status, data?.fel ?? "fel", data?.meddelande ?? "Något gick fel");
  return data as T;
}

const enc = encodeURIComponent;

export const api = {
  overview: () => call<Översikt>("GET", "/oversikt"),
  getFunktionsområde: (id: string) => call<FunktionsområdeVy>("GET", `/funktionsomraden/${enc(id)}`),
  getProjekt: (id: string) => call<ProjektVy>("GET", `/projekt/${enc(id)}`),
  listPersoner: () => call<PersonVy[]>("GET", "/personer"),

  /** `vem` is null only when adding the first Person to an empty list. */
  createPerson: (namn: string, vem: string | null) => call<PersonVy>("POST", "/personer", { namn }, vem),
  renamePerson: (id: string, namn: string, vem: string) =>
    call<PersonVy>("PATCH", `/personer/${enc(id)}`, { namn }, vem),
  /** Hands their Scopes in Pågående Projekt to `nyÄgare` and makes them inaktiv. */
  removePerson: (id: string, nyÄgare: string, vem: string) =>
    call<{ uppdateringar: Uppdatering[] }>("DELETE", `/personer/${enc(id)}`, { nyÄgare }, vem),
  reactivatePerson: (id: string, vem: string) =>
    call<PersonVy>("POST", `/personer/${enc(id)}/ateraktivera`, undefined, vem),
  personerHistorik: () => call<PersonHändelse[]>("GET", "/personer/historik"),
  createFunktionsområde: (namn: string, vem: string) =>
    call<Funktionsområde>("POST", "/funktionsomraden", { namn }, vem),
  renameFunktionsområde: (id: string, namn: string, vem: string) =>
    call<void>("PATCH", `/funktionsomraden/${enc(id)}`, { namn }, vem),
  createProjekt: (funktionsområdeId: string, namn: string, vem: string) =>
    call<Projekt>("POST", "/projekt", { funktionsområdeId, namn }, vem),
  renameProjekt: (id: string, namn: string, vem: string) =>
    call<void>("PATCH", `/projekt/${enc(id)}`, { namn }, vem),
  moveProjekt: (id: string, funktionsområdeId: string, vem: string) =>
    call<void>("PATCH", `/projekt/${enc(id)}`, { funktionsområdeId }, vem),

  /** Marks a Projekt Avslutat. The Uppdatering is null when it already was. */
  markAvslutat: (projektId: string, vem: string) =>
    call<{ uppdatering: Uppdatering | null }>("POST", `/projekt/${enc(projektId)}/avslutat`, undefined, vem),
  /** "Öppna igen". The Uppdatering is null when it was not marked. */
  reopenProjekt: (projektId: string, vem: string) =>
    call<{ uppdatering: Uppdatering | null }>("DELETE", `/projekt/${enc(projektId)}/avslutat`, undefined, vem),

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
