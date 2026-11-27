// The Ägare the Ny Scope form pre-selects (docs/notion-sync.md, Scope).
import type { PersonVy } from "../../core/index.js";

/**
 * The Projektledare's id when they can own Scopes (aktiv); otherwise "" so
 * that no one is chosen and the Ägare is a deliberate choice.
 */
export function föreslagenÄgare({ projektledare }: { projektledare: PersonVy | null }): string {
  return projektledare?.aktiv ? projektledare.id : "";
}
