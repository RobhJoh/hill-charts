// Layout for the mini chart (MiniHill): dots that would cover each other.

/** Dots this close in Läge overlap at mini-chart size. */
const NÄRA = 2;

/**
 * A stack level per dot (0 = on the orbit, 1 = one step above, ...): each dot
 * takes the lowest level not used by an earlier dot within 2 Läge of it, so
 * three Scopes on the same Läge show as a small stack of three.
 */
export function stapelnivåer(lägen: readonly number[]): number[] {
  const nivåer: number[] = [];
  lägen.forEach((läge, i) => {
    const upptagna = new Set(lägen.slice(0, i).flatMap((l, j) => (Math.abs(l - läge) <= NÄRA ? [nivåer[j]!] : [])));
    let n = 0;
    while (upptagna.has(n)) n++;
    nivåer.push(n);
  });
  return nivåer;
}
