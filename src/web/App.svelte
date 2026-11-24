<script lang="ts">
  import { router } from "./lib/router.svelte.js";
  import Start from "./pages/Start.svelte";
  import Funktionsomrade from "./pages/Funktionsomrade.svelte";
  import Projekt from "./pages/Projekt.svelte";
  import Saknas from "./pages/Saknas.svelte";

  const route = $derived(router.route);
</script>

<header>
  <a class="mk" href="/">
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M11 1 L12.6 9.4 L21 11 L12.6 12.6 L11 21 L9.4 12.6 L1 11 L9.4 9.4Z" fill="var(--red)" />
    </svg>
    Apogee
  </a>
</header>

<main>
  {#if route.sida === "start"}
    <Start />
  {:else if route.sida === "funktionsområde"}
    {#key route.id}<Funktionsomrade id={route.id} />{/key}
  {:else if route.sida === "projekt"}
    {#key route.id}<Projekt id={route.id} />{/key}
  {:else}
    <Saknas />
  {/if}
</main>

<style>
  header {
    height: 56px;
    display: flex;
    align-items: center;
    gap: 32px;
    padding: 0 28px;
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 2;
  }
  .mk {
    display: flex;
    align-items: center;
    gap: 10px;
    font: 700 22px Barlow, system-ui, sans-serif;
    text-decoration: none;
  }
  @media (max-width: 900px) {
    header {
      padding: 0 16px;
    }
  }
</style>
