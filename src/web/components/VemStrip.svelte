<script lang="ts">
  // The non-modal "Vem?" strip: shown while an edit is held for a Signatur.
  // It says what waits and why; Avbryt throws the held edit away (a held
  // star glides back). No adding Personer from here; the edit runs once a
  // Person is chosen. Focus moves to the Person list when it opens and back
  // to where it was (the dragged star) after Spara or Avbryt.
  import { tick } from "svelte";
  import { signatur } from "../lib/signatur.svelte.js";
  import { VÄNTAR, vemFråga } from "../lib/vemremsa.js";

  let vald = $state("");
  let lista: HTMLSelectElement | undefined = $state();
  /** Where focus was when the strip opened, to give it back. */
  let tillbaka: HTMLElement | SVGElement | null = null;

  const fråga = $derived(vemFråga(signatur.hållen));

  $effect(() => {
    if (!signatur.frågar) return;
    const aktiv = document.activeElement;
    tillbaka = aktiv instanceof HTMLElement || aktiv instanceof SVGElement ? aktiv : null;
    void tick().then(() => lista?.focus());
  });

  async function återlämna() {
    const mål = tillbaka;
    tillbaka = null;
    await tick();
    if (mål?.isConnected) mål.focus({ preventScroll: true });
  }

  function spara(event: SubmitEvent) {
    event.preventDefault();
    if (!vald) return;
    signatur.välj(vald);
    vald = "";
    void återlämna();
  }

  function avbryt() {
    vald = "";
    signatur.avbryt();
    void återlämna();
  }
</script>

<p class="sr" role="status" aria-live="polite">{signatur.frågar ? `${fråga} ${VÄNTAR}` : ""}</p>

{#if signatur.frågar}
  <form class="strip" onsubmit={spara} aria-label="Välj signatur">
    {#if signatur.aktiva.length === 0}
      <span>
        Det finns inga Personer än. <a href="/installningar/personer">Lägg till dig under Inställningar</a>
        för att kunna ändra.
      </span>
    {:else}
      <label>
        <span class="q">{fråga}</span>
        <select bind:this={lista} bind:value={vald} required>
          <option value="" disabled>Välj Person</option>
          {#each signatur.aktiva as p (p.id)}<option value={p.id}>{p.namn}</option>{/each}
        </select>
      </label>
      <button class="pr" disabled={!vald}>Spara</button>
    {/if}
    <button type="button" class="quiet" onclick={avbryt}>Avbryt</button>
    <span class="väntar">{VÄNTAR}</span>
    {#if signatur.aktiva.length > 0}<span class="meta">Kommer ihåg valet på den här enheten.</span>{/if}
  </form>
{/if}

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape" && signatur.frågar) avbryt();
  }}
/>

<style>
  .strip {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 8px 14px;
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
  .väntar {
    color: var(--mid);
  }
  .meta {
    color: var(--dim);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  @media (max-width: 900px) {
    .strip {
      padding: 12px 16px;
    }
    label {
      flex-wrap: wrap;
    }
    select {
      min-width: 0;
      flex: 1 1 180px;
    }
    /* The explanation keeps its own rows on a phone. */
    .väntar,
    .meta {
      flex-basis: 100%;
      font-size: 14px;
    }
  }
</style>
