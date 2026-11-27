// Shared rule for modal popovers (#63): a modal <dialog> also covers its
// backdrop, so a click "outside" lands on the dialog element itself and is told
// apart by where the pointer was. A click made from the keyboard (Enter/Space on
// a button) has `detail` 0 and no real position, and never counts as outside.

export type Ruta = { left: number; top: number; right: number; bottom: number };
export type Klick = { clientX: number; clientY: number; detail?: number };

export function utanförRutan(ruta: Ruta, klick: Klick): boolean {
  if (klick.detail === 0) return false;
  const { clientX: x, clientY: y } = klick;
  return x < ruta.left || x > ruta.right || y < ruta.top || y > ruta.bottom;
}

/**
 * Whether a press lands outside every one of these boxes (a dropdown's panel
 * and the button that opens it). Meant for `pointerdown`, which always has
 * `detail` 0, so the keyboard-click exemption of `utanförRutan` does not apply.
 */
export function utanförAlla(rutor: Ruta[], { clientX, clientY }: Klick): boolean {
  return rutor.every((ruta) => utanförRutan(ruta, { clientX, clientY }));
}

/**
 * Close a dropdown on a press outside the given elements (#56, #50): Mer and
 * the header's Signatur menu share this. Returns the cleanup, for `$effect`.
 */
export function stängVidKlickUtanför(element: () => (Element | undefined)[], stäng: () => void): () => void {
  const vid = (event: PointerEvent) => {
    const rutor = element().flatMap((el) => (el ? [el.getBoundingClientRect()] : []));
    if (utanförAlla(rutor, event)) stäng();
  };
  document.addEventListener("pointerdown", vid);
  return () => document.removeEventListener("pointerdown", vid);
}
