// Input and reference rules shared by the commands. Pure; each throws a
// DomainError when the rule is broken.
import { DomainError } from "../errors.js";
import type { Person, PersonId } from "../types.js";
import { personVy } from "./vyer.js";

const MAX_NAMN = 200;

export function namnFrån(input: string): string {
  const namn = String(input ?? "").trim();
  if (!namn) throw new DomainError("ogiltig", "Namnet får inte vara tomt");
  if (namn.length > MAX_NAMN) {
    throw new DomainError("ogiltig", `Namnet får vara högst ${MAX_NAMN} tecken`);
  }
  return namn;
}

/**
 * Person names are unique ignoring case, across active and inaktiva Personer.
 * A name an inaktiv Person has is refused with "finns-inaktiv", carrying that
 * Person, so that Återaktivera can be offered instead.
 */
export function requireLedigtNamn(personer: Person[], namn: string, utom?: PersonId): void {
  const nyckel = namn.toLocaleLowerCase("sv");
  const finns = personer.find((p) => p.id !== utom && p.namn.toLocaleLowerCase("sv") === nyckel);
  if (finns?.aktiv) throw new DomainError("finns-redan", `Det finns redan en Person som heter ${finns.namn}`);
  if (finns) throw new DomainError("finns-inaktiv", `${finns.namn} finns redan men är inaktiv`, personVy(finns));
}

export function requirePerson(personer: Person[], id: PersonId): Person {
  const person = personer.find((p) => p.id === id);
  if (!person) throw new DomainError("finns-inte", `Personen ${id} finns inte`);
  return person;
}

/** Every write is signed by an active Person; anything else is rejected. */
export function requireSignatur(personer: Person[], vem: PersonId | null | undefined): Person {
  if (!vem) throw new DomainError("signatur", "Välj vem du är innan du ändrar något");
  const person = personer.find((p) => p.id === vem);
  if (!person) throw new DomainError("signatur", "Signaturen är inte en Person");
  if (!person.aktiv) throw new DomainError("signatur", `${person.namn} är inaktiv`);
  return person;
}

/** A Scope's Ägare: required, and chosen among the active Personer. */
export function requireÄgare(personer: Person[], ägare: PersonId | null | undefined): PersonId {
  if (!ägare) throw new DomainError("ogiltig", "Ett Scope måste ha en Ägare");
  const person = personer.find((p) => p.id === ägare);
  if (!person) throw new DomainError("ogiltig", "Ägaren är inte en Person");
  if (!person.aktiv) throw new DomainError("ogiltig", `${person.namn} är inaktiv och kan inte äga Scopes`);
  return person.id;
}

/** Radera is confirmed by typing the exact name (surrounding spaces aside). */
export function requireBekräftelse(namn: string, bekräftelse: string): void {
  if (String(bekräftelse ?? "").trim() !== namn) {
    throw new DomainError("ogiltig", `Skriv namnet exakt, ${namn}, för att radera`);
  }
}

/** Läge is a whole number, clamped to 0–100. */
export function lägeFrån(input: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new DomainError("ogiltig", "Läge måste vara ett tal");
  }
  return Math.min(100, Math.max(0, Math.round(input)));
}
