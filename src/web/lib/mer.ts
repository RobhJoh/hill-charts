// The "Mer" menu by the page heading (Q5 a, Q18 b): rare actions behind one button.
/**
 * The menu item to focus after a key press, wrapping at the ends; null for keys
 * the menu doesn't handle. `nu` is -1 when no item has focus.
 */
export function menyFokus(nu: number, antal: number, tangent: string): number | null {
  if (antal === 0) return null;
  switch (tangent) {
    case "ArrowDown":
      return nu < 0 ? 0 : (nu + 1) % antal;
    case "ArrowUp":
      return nu < 0 ? antal - 1 : (nu - 1 + antal) % antal;
    case "Home":
      return 0;
    case "End":
      return antal - 1;
    default:
      return null;
  }
}
