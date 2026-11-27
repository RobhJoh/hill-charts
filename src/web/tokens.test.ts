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

  it("a disabled primary button is an outline, not a see-through red fill", () => {
    const css = läs("./app.css");
    const avstängd = regel(css, "button.pr:disabled");
    expect(avstängd).toMatch(/background:\s*none;/);
    expect(avstängd).toMatch(/border-color:\s*var\(--btn\);/);
    expect(avstängd).toMatch(/color:\s*var\(--dim\);/);
    expect(avstängd).toMatch(/opacity:\s*1;/);
  });

  it("a pressed primary button drops its fill while what it opened is open", () => {
    const tryckt = regel(läs("./app.css"), 'button.pr[aria-pressed="true"]');
    expect(tryckt).toMatch(/background:\s*var\(--sel\);/);
    expect(tryckt).toMatch(/color:\s*var\(--tx\);/);
  });
});
