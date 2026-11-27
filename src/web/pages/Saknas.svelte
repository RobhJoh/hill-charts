<script lang="ts">
  // Shown for unknown routes ("Finns inte") and for ids that are Raderade or
  // never existed ("Finns inte längre", as the server's 404 page title says).
  // An empty sky: the hill with no stars, and one clear way back.
  import MiniHill from "../components/MiniHill.svelte";
  import { tema } from "../lib/tema.svelte.js";

  let { längre = false }: { längre?: boolean } = $props();
  const rubrik = $derived(längre ? "Finns inte längre" : "Finns inte");
</script>

<svelte:head><title>{rubrik} · Apogee</title></svelte:head>

<div class="page">
  <div class="kulle"><MiniHill tema={tema.nu} width={220} height={60} /></div>
  <h1>{rubrik}</h1>
  <p class="meta">Här finns inga stjärnor.</p>
  <p><a class="knapp" href="/">Till alla Funktionsområden</a></p>
</div>

<style>
  .kulle {
    margin-bottom: 16px;
  }
  p {
    margin-top: 12px;
  }
  .knapp {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin-top: 8px;
    padding: 0 16px;
    border: 1px solid var(--btn);
    border-radius: 2px;
    color: var(--tx);
    text-decoration: none;
  }
  .knapp:hover {
    border-color: var(--mid);
  }
</style>
