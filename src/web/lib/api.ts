// Thin client for the JSON API in src/server/http.ts.
import type { Funktionsområde, FunktionsområdeVy, Projekt, ProjektVy, Översikt } from "../../core/index.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly fel: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.fel ?? "fel", data?.meddelande ?? "Något gick fel");
  return data as T;
}

export const api = {
  overview: () => call<Översikt>("GET", "/oversikt"),
  getFunktionsområde: (id: string) =>
    call<FunktionsområdeVy>("GET", `/funktionsomraden/${encodeURIComponent(id)}`),
  getProjekt: (id: string) => call<ProjektVy>("GET", `/projekt/${encodeURIComponent(id)}`),

  createFunktionsområde: (namn: string) => call<Funktionsområde>("POST", "/funktionsomraden", { namn }),
  renameFunktionsområde: (id: string, namn: string) =>
    call<void>("PATCH", `/funktionsomraden/${encodeURIComponent(id)}`, { namn }),
  createProjekt: (funktionsområdeId: string, namn: string) =>
    call<Projekt>("POST", "/projekt", { funktionsområdeId, namn }),
  renameProjekt: (id: string, namn: string) =>
    call<void>("PATCH", `/projekt/${encodeURIComponent(id)}`, { namn }),
  moveProjekt: (id: string, funktionsområdeId: string) =>
    call<void>("PATCH", `/projekt/${encodeURIComponent(id)}`, { funktionsområdeId }),
};
