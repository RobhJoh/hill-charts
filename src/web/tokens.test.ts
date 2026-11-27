import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The design tokens live as CSS text (app.css and scoped Svelte styles), so
// these tests read the source and check the rules DESIGN.md asks for.
const läs = (sökväg: string) => readFileSync(new URL(sökväg, import.meta.url), "utf8");

/** The declarations of the first rule whose selector is exactly `selektor`. */
function regel(css: string, selektor: string): string {
  const escaped = selektor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const träff = new RegExp(`(?:^|[\\s}])${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css);
  if (!träff) throw new Error(`Ingen regel för ${selektor}`);
  return träff[1] ?? "";
}

const egenskaper = (deklarationer: string) =>
  [...deklarationer.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, namn, värde]) => [namn, (värde ?? "").trim()]);

describe("tokens", () => {
  it("the embed inherits the dag tokens and only overrides --bg to Notion's white", () => {
    const embed = läs("./pages/Embed.svelte");
    expect(egenskaper(regel(embed, ".ap"))).toEqual([["--bg", "#ffffff"]]);
  });

  it("input placeholders use the --dim token", () => {
    expect(regel(läs("./app.css"), "input::placeholder")).toMatch(/color:\s*var\(--dim\);/);
  });
});
