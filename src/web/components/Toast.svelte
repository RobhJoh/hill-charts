<script lang="ts">
  import { felText } from "../lib/fel.js";
  // A short-lived notice at the bottom of the screen with one action,
  // e.g. "Scope borttagen · Ångra". Closes itself after `ms`. With `kvittens`,
  // a done action first says so (e.g. "Ångrat") for a second, then closes.
  let {
    text,
    åtgärd,
    ms = 8000,
    kvittens,
    onåtgärd,
    onstäng,
  }: {
    text: string;
    åtgärd: string;
    ms?: number;
    /** Said for a second after the action is done, before closing. */
    kvittens?: string;
    onåtgärd: () => Promise<unknown> | void;
    onstäng: () => void;
  } = $props();

  let fel = $state("");
  let klar = $state(false);

  $effect(() => {
    const t = setTimeout(onstäng, klar ? 1000 : ms);
    return () => clearTimeout(t);
  });

  async function gör() {
    try {
      await onåtgärd();
      if (kvittens) klar = true;
      else onstäng();
    } catch (e) {
      fel = felText(e);
    }
  }
</script>

<div class="toast" role="status">
  {#if klar}
    <span>{kvittens}</span>
  {:else}
    <span>{fel || text}</span>
    <span aria-hidden="true">·</span>
    <button class="quiet" onclick={gör}>{åtgärd}</button>
  {/if}
</div>

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: var(--panel);
    border: 1px solid var(--line);
    color: var(--tx);
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.3);
    z-index: 20;
    max-width: calc(100vw - 32px);
  }
</style>
