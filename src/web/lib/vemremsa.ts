// The words of the Signatur strip ("Vem?"-remsan) and the embed's receipt.

/** A held move of a Scope's star: what the strip asks about and the receipt names. */
export type Flytt = { scopeId: string; namn: string; läge: number };

/** Said under the question while an edit is held. */
export const VÄNTAR = "Ändringen sparas när du valt namn.";

/**
 * The strip's question: names the held move, "Vem?" for any other held edit,
 * and "Vem är du?" when only the Signatur is being changed (nothing held).
 */
export function vemFråga(flytt: Flytt | null | undefined, { byter = false } = {}): string {
  if (flytt) return `Vem flyttade ${flytt.namn}?`;
  return byter ? "Vem är du?" : "Vem?";
}

/** The short receipt after a saved move: "Sparat · BankID-flöde 94 · Anna Lind". */
export function sparatKvitto(flytt: Flytt, person?: string): string {
  return ["Sparat", `${flytt.namn} ${flytt.läge}`, person].filter(Boolean).join(" · ");
}
