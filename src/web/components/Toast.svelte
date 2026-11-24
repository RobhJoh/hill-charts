<script lang="ts">
  import { felText } from "../lib/fel.js";
  // A short-lived notice at the bottom of the screen with one action,
  // e.g. "Scope borttagen · Ångra". Closes itself after `ms`.
  let {
    text,
    åtgärd,
    ms = 8000,
    onåtgärd,
    onstäng,
  }: {
    text: string;
    åtgärd: string;
    ms?: number;
    onåtgärd: () => Promise<unknown> | void;
    onstäng: () => void;
  } = $props();

  let fel = $state("");

  $effect(() => {
    const t = setTimeout(onstäng, ms);
    return () => clearTimeout(t);
  });

  async function gör() {
    try {
      await onåtgärd();
      onstäng();
    } catch (e) {
      fel = felText(e);
    }
  }
</script>

<div class="toast" role="status">
  <span>{fel || text}</span>
  <span aria-hidden="true">·</span>
  <button class="quiet" onclick={gör}>{åtgärd}</button>
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
