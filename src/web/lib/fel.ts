/** The message to show for a caught error, or `annars` when it carries none. */
export const felText = (e: unknown, annars = "Något gick fel"): string =>
  e instanceof Error && e.message ? e.message : annars;
