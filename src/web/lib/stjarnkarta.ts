// What a Person's Stjärnkarta shows (Q12 a): only Pågående Projekt; an
// Avslutat Projekt's stars sit on 100 and ask nothing of the Ägare. Each
// Projekt carries a letter binding its stars to the key, but only when there
// is more than one to tell apart.

const bokstav = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");

/** The Pågående Projekt in order, each with its letter (none when it is alone). */
export function kartansProjekt<P extends { avslutat: boolean }>(projekt: readonly P[]): { p: P; glyf?: string }[] {
  const pågående = projekt.filter((p) => !p.avslutat);
  return pågående.map((p, i) => (pågående.length > 1 ? { p, glyf: bokstav(i) } : { p }));
}
