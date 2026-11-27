import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createNotionApi } from "./api.js";

// Recorded-style responses from Notion's data-source query endpoint
// (POST /v1/data_sources/{id}/query), trimmed to the properties Apogee reads.
const fixture = (namn: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/${namn}.json`, import.meta.url), "utf8"));

type Anrop = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

/** A fake `fetch` that answers each data source and cursor with a recorded response. */
function notionServer(svar: Record<string, unknown>) {
  const anrop: Anrop[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    anrop.push({ url, headers: Object.fromEntries(new Headers(init?.headers).entries()), body });
    const källa = /\/v1\/data_sources\/([^/]+)\/query$/.exec(url)?.[1];
    const nyckel = `${källa}${body.start_cursor ? `@${String(body.start_cursor)}` : ""}`;
    if (!(nyckel in svar)) return Response.json({ object: "error", status: 404, code: "object_not_found" }, { status: 404 });
    return Response.json(svar[nyckel]);
  };
  return { fetch, anrop };
}

const inställning = { token: "secret_test", projektKälla: "ds-projekt", funktionsområdenKälla: "ds-fo" };

const inspelat = {
  "ds-projekt": fixture("projekt-sida-1"),
  "ds-projekt@projekt-cursor-2": fixture("projekt-sida-2"),
  "ds-fo": fixture("funktionsomraden"),
};

describe("the Notion source over Notion's API", () => {
  it("reads every page of ticked Projekt, the Funktionsområden they reference and the named people", async () => {
    const server = notionServer(inspelat);
    const snapshot = await createNotionApi({ ...inställning, fetch: server.fetch }).hämta();

    expect(snapshot).toEqual({
      projekt: [
        {
          notionId: "1a2b3c4d-0000-4000-8000-000000000001",
          url: "https://www.notion.so/Kassan-1a2b3c4d000040008000000000000001",
          namn: "Kassan",
          funktionsområde: "f0000000-0000-4000-8000-00000000000e",
          startdatum: "2026-11-02",
          slutdatum: "2026-12-14",
          notionStatus: "Pågående",
          projektledare: "u-anna-0001",
        },
        {
          notionId: "1a2b3c4d-0000-4000-8000-000000000002",
          url: "https://www.notion.so/Momsdeklaration-1a2b3c4d000040008000000000000002",
          namn: "Momsdeklaration",
          funktionsområde: "f0000000-0000-4000-8000-00000000000e",
          // A single date is a deadline: Slutdatum, no Startdatum.
          startdatum: null,
          slutdatum: "2026-12-18",
          notionStatus: "Planerad",
          // A person with no name is no Projektledare.
          projektledare: null,
        },
        {
          notionId: "1a2b3c4d-0000-4000-8000-000000000003",
          url: "https://www.notion.so/S-kindex-1a2b3c4d000040008000000000000003",
          namn: "Sökindex",
          funktionsområde: "f0000000-0000-4000-8000-00000000000p",
          // Dates with a time keep only the day.
          startdatum: "2026-11-16",
          slutdatum: "2027-01-29",
          notionStatus: "Pågående",
          projektledare: "u-bo-0002",
        },
        {
          notionId: "1a2b3c4d-0000-4000-8000-000000000004",
          url: "https://www.notion.so/Designsystem-1a2b3c4d000040008000000000000004",
          namn: "Designsystem",
          funktionsområde: null,
          startdatum: null,
          slutdatum: null,
          notionStatus: null,
          projektledare: null,
        },
      ],
      // HR is referenced by no ticked Projekt, so it is left out.
      funktionsområden: [
        {
          notionId: "f0000000-0000-4000-8000-00000000000e",
          url: "https://www.notion.so/Ekonomi-f000000000004000800000000000000e",
          namn: "Ekonomi",
          startdatum: "2026-10-01",
          slutdatum: "2027-03-31",
          notionStatus: "Pågående",
          funktionsansvarig: "u-anna-0001",
        },
        {
          notionId: "f0000000-0000-4000-8000-00000000000p",
          url: "https://www.notion.so/Plattform-f000000000004000800000000000000p",
          namn: "Plattform",
          startdatum: null,
          slutdatum: "2027-02-26",
          notionStatus: "Planerad",
          funktionsansvarig: null,
        },
      ],
      personer: [
        { notionId: "u-anna-0001", namn: "Anna Andersson" },
        { notionId: "u-bo-0002", namn: "Bo Berg" },
      ],
    });
  });

  it("asks Notion only for ticked Projekt and follows the cursor, with the token and API version", async () => {
    const server = notionServer(inspelat);
    await createNotionApi({ ...inställning, fetch: server.fetch }).hämta();

    const projektAnrop = server.anrop.filter((a) => a.url === "https://api.notion.com/v1/data_sources/ds-projekt/query");
    expect(projektAnrop.map((a) => a.body)).toEqual([
      { page_size: 100, filter: { property: "Apogee", checkbox: { equals: true } } },
      { page_size: 100, filter: { property: "Apogee", checkbox: { equals: true } }, start_cursor: "projekt-cursor-2" },
    ]);
    for (const a of server.anrop) {
      expect(a.headers).toMatchObject({ authorization: "Bearer secret_test", "notion-version": "2025-09-03" });
    }
  });

  it("leaves out a Projekt whose Apogee checkbox is not ticked", async () => {
    const sida = fixture("projekt-sida-2") as { results: { properties: { Apogee: { checkbox: boolean } } }[] };
    sida.results[0]!.properties.Apogee.checkbox = false;
    const server = notionServer({ ...inspelat, "ds-projekt@projekt-cursor-2": sida });

    const snapshot = await createNotionApi({ ...inställning, fetch: server.fetch }).hämta();

    expect(snapshot.projekt.map((p) => p.namn)).toEqual(["Kassan", "Momsdeklaration", "Designsystem"]);
    expect(snapshot.funktionsområden.map((f) => f.namn)).toEqual(["Ekonomi"]);
    expect(snapshot.personer.map((p) => p.namn)).toEqual(["Anna Andersson"]);
  });

  it("fails when Notion answers with an error", async () => {
    const fetch = async () =>
      Response.json(
        { object: "error", status: 401, code: "unauthorized", message: "API token is invalid." },
        { status: 401 },
      );
    await expect(createNotionApi({ ...inställning, fetch }).hämta()).rejects.toThrow(/401.*unauthorized/);
  });

  it("fails when a page of results never arrives", async () => {
    const fetch = (_: unknown, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    await expect(createNotionApi({ ...inställning, fetch, timeoutMs: 20 }).hämta()).rejects.toThrow();
  });
});
