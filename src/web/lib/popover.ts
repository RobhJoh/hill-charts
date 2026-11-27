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
