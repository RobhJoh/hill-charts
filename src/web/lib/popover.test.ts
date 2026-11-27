import { describe, expect, it } from "vitest";
import { utanförRutan } from "./popover.js";

// A modal <dialog> fills the backdrop too: a click on it lands on the dialog
// element itself, so "outside" is decided by where the pointer was.
describe("utanförRutan", () => {
  const ruta = { left: 100, top: 50, right: 500, bottom: 350 };

  it("a click on the backdrop is outside", () => {
    expect(utanförRutan(ruta, { clientX: 20, clientY: 200 })).toBe(true);
    expect(utanförRutan(ruta, { clientX: 300, clientY: 400 })).toBe(true);
  });

  it("a click in the panel, edges included, is inside", () => {
    expect(utanförRutan(ruta, { clientX: 300, clientY: 200 })).toBe(false);
    expect(utanförRutan(ruta, { clientX: 100, clientY: 50 })).toBe(false);
    expect(utanförRutan(ruta, { clientX: 500, clientY: 350 })).toBe(false);
  });

  it("a keyboard-made click (no pointer position) is never outside", () => {
    expect(utanförRutan(ruta, { clientX: 0, clientY: 0, detail: 0 })).toBe(false);
  });
});
