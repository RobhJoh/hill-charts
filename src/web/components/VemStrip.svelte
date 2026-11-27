<script lang="ts">
  // The non-modal "Vem?" strip: shown while an edit is held for a Signatur.
  // No skip and no adding from here; the edit runs once a Person is chosen.
  import { signatur } from "../lib/signatur.svelte.js";

  let vald = $state("");

  function spara(event: SubmitEvent) {
    event.preventDefault();
    if (vald) signatur.välj(vald);
    vald = "";
  }
</script>

{#if signatur.frågar}
  <form class="strip" onsubmit={spara} aria-label="Välj signatur">
    {#if signatur.aktiva.length === 0}
      <span>
        Det finns inga Personer än. <a href="/installningar/personer">Lägg till dig under Inställningar</a>
        för att kunna ändra.
      </span>
    {:else}
      <label>
        <span class="q">Vem?</span>
        <select bind:value={vald} required>
          <option value="" disabled>Välj Person</option>
          {#each signatur.aktiva as p (p.id)}<option value={p.id}>{p.namn}</option>{/each}
        </select>
      </label>
      <button class="pr" disabled={!vald}>Spara</button>
      <span class="meta">Kommer ihåg valet på den här enheten.</span>
    {/if}
  </form>
{/if}

<style>
  .strip {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 14px 28px;
    background: var(--panel);
    border-top: 1px solid var(--btn);
  }
  label {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .q {
    font-weight: 600;
    font-size: 17px;
  }
  select {
    min-width: 200px;
  }
  @media (max-width: 900px) {
    .strip {
      padding: 12px 16px;
    }
    .meta {
      display: none;
    }
  }
</style>
