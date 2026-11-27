// The Signatur: which Person this device and browser edits as. Remembered in
// localStorage; every access is wrapped so the app still works when storage
// throws (private mode, blocked site data). It can be changed, never cleared.
//
// Every write goes through `signera`. With a remembered, active Signatur the
// edit runs at once; otherwise it is held while the "Vem?" strip asks, and
// runs only after a Person is chosen.
import type { PersonVy } from "../../core/index.js";
import { api, ApiError } from "./api.js";
import type { Flytt } from "./vemremsa.js";

const KEY = "apogee.signatur";

function läs(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function spara(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Storage unavailable: the choice lasts for this page load only.
  }
}

let vem = $state<string | null>(läs());
let personer = $state<PersonVy[]>([]);
let frågar = $state(false);
/** The held move, if the held edit is one: the strip names it and its star is marked. */
let hållen = $state<Flytt | null>(null);
type Hållen = { resolve: (vem: string) => void; reject: (error: Error) => void };
let väntande: Hållen[] = [];

/** Thrown to a held edit that was abandoned before a Signatur was chosen. */
export class Avbruten extends Error {
  constructor() {
    super("Ändringen sparades inte: ingen signatur valdes");
  }
}

const aktiva = () => personer.filter((p) => p.aktiv);
const giltig = (id: string | null) => id !== null && aktiva().some((p) => p.id === id);

export async function laddaPersoner(): Promise<PersonVy[]> {
  personer = await api.listPersoner();
  return personer;
}

/** Asks "Vem?" and resolves once a Person is chosen. */
function fråga(flytt?: Flytt): Promise<string> {
  frågar = true;
  hållen = flytt ?? null;
  return new Promise((resolve, reject) => väntande.push({ resolve, reject }));
}

export const signatur = {
  /** The remembered Signatur's Person, if any and still active. */
  get person(): PersonVy | undefined {
    return aktiva().find((p) => p.id === vem);
  },
  get aktiva(): PersonVy[] {
    return aktiva();
  },
  /** True while an edit is held, waiting for a Signatur. */
  get frågar(): boolean {
    return frågar;
  },
  /** The held move while the strip asks, if the held edit is a move. */
  get hållen(): Flytt | null {
    return frågar ? hållen : null;
  },

  /** Remembers `id` as this device's Signatur and releases held edits. */
  välj(id: string) {
    vem = id;
    spara(id);
    frågar = false;
    hållen = null;
    const släpp = väntande;
    väntande = [];
    for (const h of släpp) h.resolve(id);
  },

  /** Throws away held edits and hides the strip, e.g. when leaving the page. */
  avbryt() {
    frågar = false;
    hållen = null;
    const släpp = väntande;
    väntande = [];
    for (const h of släpp) h.reject(new Avbruten());
  },

  /** The remembered, active Signatur's Person, or undefined; never asks (`/mina`). */
  async ihågkommen(): Promise<PersonVy | undefined> {
    await laddaPersoner();
    return aktiva().find((p) => p.id === vem);
  },

  /**
   * Runs `edit` signed with the remembered Signatur, asking for one first if
   * none is remembered or it is no longer an active Person. A `flytt`
   * describes the edit to the strip while it is held.
   */
  async signera<T>(edit: (vem: string) => Promise<T>, flytt?: Flytt): Promise<T> {
    await laddaPersoner();
    const id = giltig(vem) ? vem! : await fråga(flytt);
    try {
      return await edit(id);
    } catch (error) {
      // Became inaktiv or unknown since the list was loaded: ask again.
      if (error instanceof ApiError && error.fel === "signatur") {
        await laddaPersoner();
        return edit(await fråga(flytt));
      }
      throw error;
    }
  },
};
