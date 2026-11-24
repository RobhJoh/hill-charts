export type DomainErrorCode =
  /** The referenced Funktionsområde or Projekt does not exist. */
  | "finns-inte"
  /** The command's input breaks a domain rule (e.g. an empty name). */
  | "ogiltig";

/** A command or query was rejected by a domain rule. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
