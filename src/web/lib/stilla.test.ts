import { describe, expect, it } from "vitest";
import type { Översikt, ProjektRad } from "../../core/index.js";
import { samladStatus, STILLA_FÖRKLARING, stillaI } from "./stilla.js";

const rad = (namn: string, extra: Partial<ProjektRad> = {}): ProjektRad => ({
  id: namn.toLowerCase(),
  namn,
  status: "pågående",
  notionStatus: null,
  avslutat: false,
  avslutad: null,
  nedräkning: null,
  nästaMilstolpe: null,
  överTid: false,
  stilla: 0,
  scopes: [],
  ...extra,
});

const fo = (namn: string, projekt: ProjektRad[]): Översikt[number] => ({
  id: namn.toLowerCase(),
  namn,
  borttagen: null,
  stilla: projekt.reduce((n, p) => n + p.stilla, 0),
  projekt,
  borttagnaProjekt: [],
  nedräkning: null,
  nästaMilstolpe: null,
  överTid: false,
  avslutat: false,
} as unknown as Översikt[number]);

describe("samladStatus", () => {
  it("counts Pågående Projekt, stilla Scopes and Projekt Över tid across Funktionsområden", () => {
    const status = samladStatus([
      fo("Plattform", [
        rad("Alfa", { stilla: 2 }),
        rad("Beta", { status: "inte påbörjat" }),
        rad("Klar", { status: "avslutat", avslutat: true }),
      ]),
      fo("Kassa", [rad("Gamma", { stilla: 1, överTid: true }), rad("Delta"), rad("Epsilon")]),
    ]);
    expect(status.pågående).toBe(4);
    expect(status.stilla).toBe(3);
    expect(status.överTid).toBe(1);
  });

  it("does not count Inte påbörjat Projekt as pågående, but still names them when stilla or Över tid", () => {
    const status = samladStatus([
      fo("Plattform", [rad("Beta", { status: "inte påbörjat", stilla: 1, överTid: true })]),
    ]);
    expect(status).toMatchObject({ pågående: 0, stilla: 1, överTid: 1 });
    expect(status.stillaProjekt.map((p) => p.namn)).toEqual(["Beta"]);
  });

  it("includes the Projekt Utan funktionsområde, after the Funktionsområden", () => {
    const status = samladStatus([fo("Plattform", [rad("Alfa", { stilla: 2 })])], {
      projekt: [rad("Fri", { stilla: 1, överTid: true }), rad("Ny", { status: "inte påbörjat" })],
    });
    expect(status.pågående).toBe(2);
    expect(status.stilla).toBe(3);
    expect(status.stillaProjekt.map((p) => p.namn)).toEqual(["Alfa", "Fri"]);
    expect(status.överTidProjekt.map((p) => p.namn)).toEqual(["Fri"]);
  });

  it("names the Projekt that are stilla or Över tid, in overview order", () => {
    const status = samladStatus([
      fo("Plattform", [rad("Alfa", { stilla: 2 }), rad("Beta")]),
      fo("Kassa", [rad("Gamma", { stilla: 1, överTid: true })]),
    ]);
    expect(status.stillaProjekt.map((p) => p.namn)).toEqual(["Alfa", "Gamma"]);
    expect(status.överTidProjekt.map((p) => p.namn)).toEqual(["Gamma"]);
  });

  it("leaves Avslutade Projekt out of every count", () => {
    const status = samladStatus([
      fo("Plattform", [rad("Klar", { status: "avslutat", avslutat: true, stilla: 4, överTid: true })]),
    ]);
    expect(status).toMatchObject({ pågående: 0, stilla: 0, överTid: 0, stillaProjekt: [], överTidProjekt: [] });
  });

  it("is empty for an empty overview", () => {
    expect(samladStatus([])).toMatchObject({ pågående: 0, stilla: 0, överTid: 0 });
  });
});

describe("stilla wording", () => {
  it("explains the word with the 14-day rule", () => {
    expect(STILLA_FÖRKLARING).toBe("Ingen rörelse på över 14 dagar");
  });

  it("writes one Scope's stillness as 'stilla i N d'", () => {
    expect(stillaI(21)).toBe("stilla i 21 d");
  });
});
