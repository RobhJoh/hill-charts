// Initials for a Person's name, shown on the compact Signatur button in the
// phone header ("Anna Lind" -> "AL").

/** First letter of the first and last word, upper-cased; one letter for a single word. */
export function initialer(namn: string): string {
  const ord = namn.trim().split(/\s+/);
  const först = ord[0]?.[0] ?? "";
  const sist = ord.length > 1 ? (ord[ord.length - 1]?.[0] ?? "") : "";
  return (först + sist).toUpperCase();
}
