import { randomBytes } from "node:crypto";
import { appendFile, mkdir, open, readdir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Storage } from "../core/storage.js";
import type { Funktionsområde, Person, PersonHändelse, Projekt, ProjektId, Uppdatering } from "../core/types.js";

/**
 * Storage as JSON files in one directory (ADR 0001):
 *
 *   funktionsomraden.json         all Funktionsområden
 *   personer.json                 all Personer
 *   personer.historik.jsonl       the Personer-historik, one change per line
 *   projekt/<id>.json             one document per Projekt
 *   projekt/<id>.historik.jsonl   the Projekt's Historik, one Uppdatering per line
 *
 * Documents are written to a temp file and renamed into place, so a crash
 * leaves either the old or the new document. A Historik line cut off by a
 * crash is skipped on read. Every document carries `formatVersion` and is
 * upgraded on read; see `upgrade` below. Historik lines carry no version and
 * are upgraded on read by shape; see `uppgraderaUppdatering`.
 */
export function createJsonFileStorage(dir: string): Storage {
  const projektDir = join(dir, "projekt");
  const foFile = join(dir, "funktionsomraden.json");
  const personerFile = join(dir, "personer.json");
  const personerHistorikFile = join(dir, "personer.historik.jsonl");
  const projektFile = (id: ProjektId) => join(projektDir, `${id}.json`);
  const historikFile = (id: ProjektId) => join(projektDir, `${id}.historik.jsonl`);

  async function getProjekt(id: ProjektId): Promise<Projekt | undefined> {
    if (!isSafeId(id)) return undefined;
    const doc = await readDocument(projektFile(id));
    return doc === undefined ? undefined : upgradeProjekt(doc);
  }

  return {
    getProjekt,

    async listFunktionsområden() {
      const doc = await readDocument(foFile);
      return doc === undefined ? [] : upgradeFunktionsområden(doc);
    },

    async saveFunktionsområden(all) {
      await writeDocument(foFile, { formatVersion: FORMAT_VERSION, funktionsområden: all });
    },

    async listPersoner() {
      const doc = await readDocument(personerFile);
      return doc === undefined ? [] : upgradePersoner(doc);
    },

    async savePersoner(all) {
      await writeDocument(personerFile, { formatVersion: FORMAT_VERSION, personer: all });
    },

    async appendPersonHändelse(händelse) {
      await mkdir(dir, { recursive: true });
      await appendLine(personerHistorikFile, händelse);
    },

    async readPersonerHistorik() {
      const text = await readText(personerHistorikFile);
      return text === undefined ? [] : parseLog<PersonHändelse>(text);
    },

    async listProjekt() {
      let names: string[];
      try {
        names = await readdir(projektDir);
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
      const ids = names
        .filter((name) => name.endsWith(".json"))
        .map((name) => name.slice(0, -".json".length))
        .filter(isSafeId);
      const all = await Promise.all(ids.map(getProjekt));
      return all.filter((p): p is Projekt => p !== undefined);
    },

    async saveProjekt(projekt) {
      requireSafeId(projekt.id);
      await mkdir(projektDir, { recursive: true });
      await writeDocument(projektFile(projekt.id), { formatVersion: FORMAT_VERSION, projekt });
    },

    async eraseProjekt(id) {
      if (!isSafeId(id)) return;
      // The document first: once it is gone the Projekt no longer exists,
      // so a crash in between leaves at worst an orphaned Historik.
      await rm(projektFile(id), { force: true });
      await rm(historikFile(id), { force: true });
    },

    async appendUppdatering(projektId, uppdatering) {
      requireSafeId(projektId);
      await mkdir(projektDir, { recursive: true });
      await appendLine(historikFile(projektId), uppdatering);
    },

    async readHistorik(projektId) {
      if (!isSafeId(projektId)) return [];
      const text = await readText(historikFile(projektId));
      return text === undefined ? [] : parseLog<Uppdatering>(text).flatMap(uppgraderaUppdatering);
    },
  };
}

// ---------- format versions ----------

/** The format version written by this code. */
export const FORMAT_VERSION = 2;

/*
 * Upgrading on read: each document kind has one step per older version,
 * taking a document of version N to N + 1. Version 0 is the unversioned shape
 * from before format versions existed: the bare value, with no envelope.
 */
type Doc = Record<string, unknown>;

function upgrade(raw: unknown, steps: Record<number, (doc: unknown) => Doc>): Doc {
  let doc = raw;
  let version = versionOf(doc);
  if (version > FORMAT_VERSION) {
    throw new Error(
      `Data has format version ${version}, newer than this Apogee understands (${FORMAT_VERSION})`,
    );
  }
  while (version < FORMAT_VERSION) {
    const step = steps[version];
    if (!step) throw new Error(`No upgrade from format version ${version}`);
    doc = step(doc);
    version = versionOf(doc);
  }
  return doc as Doc;
}

/**
 * Version 1 → 2, for a document holding `nyckel` (a list or one record):
 * - A Projekt keeps its own Startdatum and Slutdatum (#73). Nothing is moved:
 *   a Projekt without them simply has none; the dates an older Historik held
 *   are dropped from it on read (`uppgraderaUppdatering`).
 * - Borttagen is only ever set by the Notion sync (#76) and says when: the old
 *   `vem` and `medFunktionsområde` are dropped.
 */
function tillVersion2(nyckel: string) {
  return (doc: unknown): Doc => {
    const värde = (doc as Doc)[nyckel];
    const uppgraderat = Array.isArray(värde) ? värde.map(utanGammalBorttagen) : utanGammalBorttagen(värde);
    return { ...(doc as Doc), [nyckel]: uppgraderat, formatVersion: 2 };
  };
}

function utanGammalBorttagen(post: unknown): unknown {
  if (!post || typeof post !== "object" || !("borttagen" in post)) return post;
  const { borttagen, ...resten } = post as Doc & { borttagen?: { tid: string } };
  return borttagen ? { ...resten, borttagen: { tid: borttagen.tid } } : resten;
}

/**
 * Projekt-level fields an older Historik may hold and version 2 never writes:
 * the dates, now kept on the Projekt (#73), and the Avslutat mark, now that
 * status follows Läge alone (#72).
 */
const GAMLA_FÄLT = new Set(["startdatum", "slutdatum", "avslutat"]);

const utanGamlaFält = (fält: object): Doc =>
  Object.fromEntries(Object.entries(fält).filter(([f]) => !GAMLA_FÄLT.has(f)));

/**
 * The Historik log has no envelope to carry a format version, so an
 * Uppdatering from version 1 is recognised by the fields version 2 never
 * writes. Those are dropped; an Uppdatering left with no change at all (such
 * as a Markera Avslutat) is dropped with them. Milstolpar and everything else
 * are kept.
 */
function uppgraderaUppdatering(u: Uppdatering): Uppdatering[] {
  if (!u.projekt) return [u];
  const { projekt, ...resten } = u;
  const efter = utanGamlaFält(projekt.efter);
  if (Object.keys(efter).length > 0) {
    return [{ ...resten, projekt: { före: utanGamlaFält(projekt.före), efter } } as Uppdatering];
  }
  return u.ändringar.length > 0 ? [resten] : [];
}

function versionOf(doc: unknown): number {
  if (doc && typeof doc === "object" && "formatVersion" in doc) {
    return Number((doc as Doc).formatVersion);
  }
  return 0;
}

function upgradeFunktionsområden(raw: unknown): Funktionsområde[] {
  const doc = upgrade(raw, {
    0: (bare) => ({ formatVersion: 1, funktionsområden: bare }),
    1: tillVersion2("funktionsområden"),
  });
  return doc.funktionsområden as Funktionsområde[];
}

function upgradePersoner(raw: unknown): Person[] {
  // Personer arrived in format version 1, so there is nothing older to upgrade.
  return upgrade(raw, { 1: tillVersion2("personer") }).personer as Person[];
}

function upgradeProjekt(raw: unknown): Projekt {
  const doc = upgrade(raw, {
    0: (bare) => ({ formatVersion: 1, projekt: bare }),
    1: tillVersion2("projekt"),
  });
  return doc.projekt as Projekt;
}

// ---------- Historik log ----------

/** Appends one JSON line to a log, after dropping any cut-off last line. */
async function appendLine(file: string, value: unknown): Promise<void> {
  await terminateCutOffLine(file);
  await appendFile(file, JSON.stringify(value) + "\n", { flush: true });
}

function parseLog<T>(text: string): T[] {
  const lines = text.split("\n");
  // A complete log ends with "\n", so the last element is "". Anything else
  // there is a line cut off by a crash mid-append: skip it.
  lines.pop();
  return lines.filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as T);
}

/**
 * If a crash left a cut-off last line, drop it before appending, so the next
 * Uppdatering starts on a line of its own instead of being glued to it.
 */
async function terminateCutOffLine(file: string): Promise<void> {
  const text = await readText(file);
  if (text === undefined || text === "" || text.endsWith("\n")) return;
  const keep = text.slice(0, text.lastIndexOf("\n") + 1);
  await writeAtomically(file, keep);
}

// ---------- files ----------

async function readText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

async function readDocument(file: string): Promise<unknown> {
  const text = await readText(file);
  return text === undefined ? undefined : JSON.parse(text);
}

async function writeDocument(file: string, doc: unknown): Promise<void> {
  await writeAtomically(file, JSON.stringify(doc, null, 2) + "\n");
}

/** Write to a temp file, flush it to disk, then rename it over the target. */
async function writeAtomically(file: string, text: string): Promise<void> {
  const temp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    const handle = await open(temp, "w");
    try {
      await handle.writeFile(text, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function isSafeId(id: string): boolean {
  return SAFE_ID.test(id);
}

function requireSafeId(id: string): void {
  if (!isSafeId(id)) throw new Error(`Unsafe id for a file name: ${JSON.stringify(id)}`);
}
