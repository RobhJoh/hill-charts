import { randomBytes } from "node:crypto";
import { appendFile, mkdir, open, readdir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Storage } from "../core/storage.js";
import type { Funktionsområde, Person, Projekt, ProjektId, Uppdatering } from "../core/types.js";

/**
 * Storage as JSON files in one directory (ADR 0001):
 *
 *   funktionsomraden.json         all Funktionsområden
 *   personer.json                 all Personer
 *   projekt/<id>.json             one document per Projekt
 *   projekt/<id>.historik.jsonl   the Projekt's Historik, one Uppdatering per line
 *
 * Documents are written to a temp file and renamed into place, so a crash
 * leaves either the old or the new document. A Historik line cut off by a
 * crash is skipped on read. Every document carries `formatVersion` and is
 * upgraded on read; see `upgrade` below.
 */
export function createJsonFileStorage(dir: string): Storage {
  const projektDir = join(dir, "projekt");
  const foFile = join(dir, "funktionsomraden.json");
  const personerFile = join(dir, "personer.json");
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

    async appendUppdatering(projektId, uppdatering) {
      requireSafeId(projektId);
      await mkdir(projektDir, { recursive: true });
      const file = historikFile(projektId);
      await terminateCutOffLine(file);
      await appendFile(file, JSON.stringify(uppdatering) + "\n", { flush: true });
    },

    async readHistorik(projektId) {
      if (!isSafeId(projektId)) return [];
      const text = await readText(historikFile(projektId));
      return text === undefined ? [] : parseHistorik(text);
    },
  };
}

// ---------- format versions ----------

/** The format version written by this code. */
export const FORMAT_VERSION = 1;

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

function versionOf(doc: unknown): number {
  if (doc && typeof doc === "object" && "formatVersion" in doc) {
    return Number((doc as Doc).formatVersion);
  }
  return 0;
}

function upgradeFunktionsområden(raw: unknown): Funktionsområde[] {
  const doc = upgrade(raw, {
    0: (bare) => ({ formatVersion: 1, funktionsområden: bare }),
  });
  return doc.funktionsområden as Funktionsområde[];
}

function upgradePersoner(raw: unknown): Person[] {
  // Personer arrived in format version 1, so there is nothing older to upgrade.
  return upgrade(raw, {}).personer as Person[];
}

function upgradeProjekt(raw: unknown): Projekt {
  const doc = upgrade(raw, {
    0: (bare) => ({ formatVersion: 1, projekt: bare }),
  });
  return doc.projekt as Projekt;
}

// ---------- Historik log ----------

function parseHistorik(text: string): Uppdatering[] {
  const lines = text.split("\n");
  // A complete log ends with "\n", so the last element is "". Anything else
  // there is a line cut off by a crash mid-append: skip it.
  lines.pop();
  return lines.filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as Uppdatering);
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
