/** Height of the hill (0–1) at a Läge (0–100): a single smooth crest at 50. */
export const hillY = (läge: number) => (1 - Math.cos((2 * Math.PI * läge) / 100)) / 2;
