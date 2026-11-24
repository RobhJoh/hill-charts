import type { PersonVy } from "./apogee/vyer.js";

export type DomainErrorCode =
  /** The referenced Funktionsområde or Projekt does not exist. */
  | "finns-inte"
  /** The command's input breaks a domain rule (e.g. an empty name). */
  | "ogiltig"
  /** A name is already taken (e.g. a Person's, ignoring letter case). */
  | "finns-redan"
  /** A Person's name is taken by an inaktiv Person: offer Återaktivera instead. */
  | "finns-inaktiv"
  /** The write's Signatur is missing, unknown or inaktiv. */
  | "signatur"
  /** Ångra would overwrite newer work: a field it reverts has changed since. */
  | "krock";

/** A command or query was rejected by a domain rule. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    /** On "finns-inaktiv": the inaktiv Person who has the name (to offer Återaktivera). */
    readonly person?: PersonVy,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
