import { expect, it } from "vitest";
import { randomId } from "./ids.js";

it("random ids are short, URL-safe and distinct", () => {
  const ids = Array.from({ length: 1000 }, randomId);
  for (const id of ids) expect(id).toMatch(/^[0-9a-z]{10}$/);
  expect(new Set(ids).size).toBe(ids.length);
});
