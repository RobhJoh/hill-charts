// The `typ` of every record in a Historik: one set, used by the core and the
// web app alike, so no part spells them out by hand.

/** Every Uppdatering `typ` written to a Projekt's Historik. */
export const UPPDATERING_TYP = {
  // Scope commands
  ny: "ny",
  flytt: "flytt",
  bytNamn: "byt namn",
  bytÄgare: "byt ägare",
  taBort: "ta bort",
  /** A removed Person's Scopes handed over to someone else. */
  överlämning: "överlämning",
  // Projekt-level commands
  datum: "datum",
  milstolpe: "milstolpe",
  // Historik commands
  återställning: "återställning",
  ångra: "ångra",
} as const;

export type UppdateringTyp = (typeof UPPDATERING_TYP)[keyof typeof UPPDATERING_TYP];

/** Every PersonHändelse `typ` in the Personer-historik. */
export const PERSON_HÄNDELSE_TYP = {
  ny: "ny",
  bytNamn: "byt namn",
  taBort: "ta bort",
  återaktivera: "återaktivera",
} as const;

export type PersonHändelseTyp = (typeof PERSON_HÄNDELSE_TYP)[keyof typeof PERSON_HÄNDELSE_TYP];
