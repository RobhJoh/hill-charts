import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileNotion } from "./fil.js";

async function fil(innehåll: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "apogee-notion-"));
  const path = join(dir, "notion.json");
  await writeFile(path, JSON.stringify(innehåll));
  return path;
}

describe("the Notion source from a local file (development)", () => {
  it("returns the ticked Projekt, the Funktionsområden they reference and the people", async () => {
    const path = await fil({
      projekt: [
        {
          id: "p1",
          url: "https://www.notion.so/p1",
          namn: "Kassan",
          apogee: true,
          funktionsområde: "f1",
          datum: { start: "2026-11-02", end: "2026-12-14" },
          status: "Pågående",
          projektledare: "u1",
        },
        { id: "p2", namn: "Ej ikryssad", apogee: false, funktionsområde: "f2" },
        { id: "p3", namn: "Sökindex", apogee: true },
      ],
      funktionsområden: [
        { id: "f1", url: "https://www.notion.so/f1", namn: "Ekonomi", status: "Planerad", funktionsansvarig: "u2" },
        { id: "f2", namn: "Plattform" },
      ],
      personer: [{ id: "u1", namn: "Anna" }, { id: "u2", namn: "Bo" }],
    });

    expect(await createFileNotion(path).hämta()).toEqual({
      projekt: [
        {
          notionId: "p1",
          url: "https://www.notion.so/p1",
          namn: "Kassan",
          funktionsområde: "f1",
          startdatum: "2026-11-02",
          slutdatum: "2026-12-14",
          notionStatus: "Pågående",
          projektledare: "u1",
        },
        {
          notionId: "p3",
          url: "https://www.notion.so/p3",
          namn: "Sökindex",
          funktionsområde: null,
          startdatum: null,
          slutdatum: null,
          notionStatus: null,
          projektledare: null,
        },
      ],
      funktionsområden: [
        {
          notionId: "f1",
          url: "https://www.notion.so/f1",
          namn: "Ekonomi",
          startdatum: null,
          slutdatum: null,
          notionStatus: "Planerad",
          funktionsansvarig: "u2",
        },
      ],
      personer: [
        { notionId: "u1", namn: "Anna" },
        { notionId: "u2", namn: "Bo" },
      ],
    });
  });

  it("makes a single date the Slutdatum, with no Startdatum", async () => {
    const path = await fil({
      projekt: [{ id: "p1", namn: "Kassan", apogee: true, funktionsområde: "f1", datum: { start: "2026-12-14" } }],
      funktionsområden: [{ id: "f1", namn: "Ekonomi", datum: { start: "2026-12-31", end: null } }],
    });
    const snapshot = await createFileNotion(path).hämta();
    expect(snapshot.projekt[0]).toMatchObject({ startdatum: null, slutdatum: "2026-12-14" });
    expect(snapshot.funktionsområden[0]).toMatchObject({ startdatum: null, slutdatum: "2026-12-31" });
  });

  it("fails when the file is missing or not valid", async () => {
    await expect(createFileNotion(join(tmpdir(), "finns-inte", "notion.json")).hämta()).rejects.toThrow();
    const trasig = await fil("inte ett objekt");
    await expect(createFileNotion(trasig).hämta()).rejects.toThrow();
  });
});
