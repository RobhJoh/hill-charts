/** The word inflected by number, for a count shown apart from it: 1 → `en`, otherwise `fler`. */
export const böj = (n: number, en: string, fler: string): string => (n === 1 ? en : fler);

/** A count with its word inflected by number: "1 inaktiv", "2 inaktiva", "0 inaktiva". */
export const antal = (n: number, en: string, fler: string): string => `${n} ${böj(n, en, fler)}`;
