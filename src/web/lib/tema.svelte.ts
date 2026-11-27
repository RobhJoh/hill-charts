// The theme: `natt` (default, dark) or `dag` (light). Remembered per browser;
// storage access is wrapped so the app works when it throws. Applied as
// `data-theme` on <html>, which app.css keys the `dag` tokens on.
import type { Tema } from "./hill.js";

const KEY = "apogee.tema";

function läs(): Tema {
  try {
    return localStorage.getItem(KEY) === "dag" ? "dag" : "natt";
  } catch {
    return "natt";
  }
}

let nu = $state<Tema>(läs());

function tillämpa(t: Tema) {
  document.documentElement.dataset.theme = t;
}
tillämpa(nu);

export const tema = {
  get nu(): Tema {
    return nu;
  },
  sätt(t: Tema) {
    nu = t;
    tillämpa(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // Storage unavailable: the choice lasts for this page load only.
    }
  },
  /** Shows `t` without remembering it (the Notion embed follows the computer's theme). */
  visa(t: Tema) {
    nu = t;
    tillämpa(t);
  },
  växla() {
    this.sätt(nu === "natt" ? "dag" : "natt");
  },
};
