import { describe, expect, it } from "vitest";
import { utanförAlla, utanförRutan } from "./popover.js";

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

// A dropdown (Mer, the header's Signatur menu) closes on a press outside both
// its panel and the button that opens it.
describe("utanförAlla", () => {
  const knapp = { left: 400, top: 10, right: 440, bottom: 50 };
  const panel = { left: 200, top: 54, right: 440, bottom: 300 };

  it("a press outside the button and the panel is outside", () => {
    expect(utanförAlla([knapp, panel], { clientX: 20, clientY: 20 })).toBe(true);
  });

  it("a press on the button or in the panel is not", () => {
    expect(utanförAlla([knapp, panel], { clientX: 420, clientY: 30 })).toBe(false);
    expect(utanförAlla([knapp, panel], { clientX: 250, clientY: 200 })).toBe(false);
  });

  it("counts a pointerdown as a press wherever it is: its detail is 0 like a keyboard click's", () => {
    expect(utanförAlla([knapp, panel], { clientX: 20, clientY: 20, detail: 0 })).toBe(true);
  });
});
