// The Notion embed's theme (Q2 b): it follows the computer's theme, which
// often follows Notion's, and never the theme remembered by the app. A
// `?tema=dag` or `?tema=natt` in the embed link overrides it.
import type { Tema } from "./hill.js";

export function embedTema(sök: string, datornMörk: boolean): Tema {
  const val = new URLSearchParams(sök).get("tema");
  if (val === "dag" || val === "natt") return val;
  return datornMörk ? "natt" : "dag";
}
