// Scopes on a Projekt's Hill chart: add, move, rename, change Ägare, remove.
// Each change is one Uppdatering in the Projekt's Historik.
import { lika, nuvarande } from "../diagram.js";
import { DomainError } from "../errors.js";
import { UPPDATERING_TYP } from "../typer.js";
import type { Person, PersonId, ProjektId, ScopeId, ScopeValues, Uppdatering } from "../types.js";
import type { Kärna } from "./karna.js";
import { lägeFrån, namnFrån, requireSignatur, requireÄgare } from "./regler.js";

export function scopes(k: Kärna) {
  const { storage } = k;

  /**
   * Changes one existing Scope: signs, checks it exists, and writes one
   * Uppdatering unless the values would not change (then returns null).
   */
  async function ändraScope(
    projektId: ProjektId,
    scopeId: ScopeId,
    typ: string,
    vem: PersonId | null,
    ändring: (före: ScopeValues, personer: Person[]) => ScopeValues | null,
  ): Promise<Uppdatering | null> {
    const personer = await storage.listPersoner();
    const signerad = requireSignatur(personer, vem);
    await k.requireProjekt(projektId);
    const före = nuvarande(await storage.readHistorik(projektId))[scopeId];
    if (!före) throw new DomainError("finns-inte", `Scopet ${scopeId} finns inte`);
    const efter = ändring(före, personer);
    if (efter !== null && lika(före, efter)) return null;
    return k.skriv(projektId, typ, [{ scopeId, före, efter }], signerad.id);
  }

  return {
    /** Adds a Scope at Läge 0. Ägare is required and must be an active Person. */
    async addScope(
      projektId: ProjektId,
      { namn, ägare }: { namn: string; ägare: PersonId },
      vem: PersonId | null,
    ): Promise<{ id: ScopeId; uppdatering: Uppdatering }> {
      const personer = await storage.listPersoner();
      const signerad = requireSignatur(personer, vem);
      const efter: ScopeValues = { namn: namnFrån(namn), läge: 0, ägare: requireÄgare(personer, ägare) };
      await k.requireProjekt(projektId);
      const id = k.newId();
      const uppdatering = await k.skriv(
        projektId,
        UPPDATERING_TYP.ny,
        [{ scopeId: id, före: null, efter }],
        signerad.id,
      );
      return { id, uppdatering };
    },

    /** Moves a Scope to a new Läge (clamped to 0–100). Null when it is already there. */
    async moveScope(projektId: ProjektId, scopeId: ScopeId, läge: number, vem: PersonId | null) {
      const nytt = lägeFrån(läge);
      return ändraScope(projektId, scopeId, UPPDATERING_TYP.flytt, vem, (s) => ({ ...s, läge: nytt }));
    },

    async renameScope(projektId: ProjektId, scopeId: ScopeId, namn: string, vem: PersonId | null) {
      const nytt = namnFrån(namn);
      return ändraScope(projektId, scopeId, UPPDATERING_TYP.bytNamn, vem, (s) => ({ ...s, namn: nytt }));
    },

    /** Hands a Scope to another active Person. The Ägare can never be cleared. */
    async changeScopeÄgare(projektId: ProjektId, scopeId: ScopeId, ägare: PersonId, vem: PersonId | null) {
      return ändraScope(projektId, scopeId, UPPDATERING_TYP.bytÄgare, vem, (s, personer) => ({
        ...s,
        ägare: requireÄgare(personer, ägare),
      }));
    },

    /** Removes a Scope. Its id stays in the Historik, so Ångra can bring it back. */
    async removeScope(projektId: ProjektId, scopeId: ScopeId, vem: PersonId | null) {
      return ändraScope(projektId, scopeId, UPPDATERING_TYP.taBort, vem, () => null);
    },
  };
}
