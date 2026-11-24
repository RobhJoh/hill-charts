<script lang="ts">
  import { router } from "./lib/router.svelte.js";
  import Start from "./pages/Start.svelte";
  import Funktionsomrade from "./pages/Funktionsomrade.svelte";
  import Projekt from "./pages/Projekt.svelte";
  import Personer from "./pages/Personer.svelte";
  import Stjarnkarta from "./pages/Stjarnkarta.svelte";
  import Mina from "./pages/Mina.svelte";
  import { personHref } from "./lib/links.js";
  import Saknas from "./pages/Saknas.svelte";
  import VemStrip from "./components/VemStrip.svelte";
  import { laddaPersoner, signatur } from "./lib/signatur.svelte.js";
  import { tema } from "./lib/tema.svelte.js";

  const route = $derived(router.route);

  // Load Personer so the header can show the remembered Signatur.
  laddaPersoner().catch(() => {});

  // An edit held for a Signatur is thrown away when its page is left.
  $effect(() => {
    void router.route;
    return () => signatur.avbryt();
  });
</script>

<header>
  <a class="mk" href="/">
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M11 1 L12.6 9.4 L21 11 L12.6 12.6 L11 21 L9.4 12.6 L1 11 L9.4 9.4Z" fill="var(--red)" />
    </svg>
    Apogee
  </a>
  <div class="right">
    {#if signatur.person}
      <!-- Mina Scopes: the remembered Signatur's Stjärnkarta; absent when none is remembered. -->
      <a
        class="nav"
        href={personHref(signatur.person)}
        aria-current={route.sida === "person" && route.id === signatur.person.id ? "page" : undefined}>Mina Scopes</a
      >
    {/if}
    {#if signatur.person}
      <label class="sig">
        <span class="cap">Signatur</span>
        <select
          value={signatur.person.id}
          onchange={(e) => signatur.välj(e.currentTarget.value)}
          aria-label="Byt signatur"
        >
          {#each signatur.aktiva as p (p.id)}<option value={p.id}>{p.namn}</option>{/each}
        </select>
      </label>
    {/if}
    <button
      class="quiet tema"
      onclick={() => tema.växla()}
      aria-label={tema.nu === "natt" ? "Byt till ljust tema (dag)" : "Byt till mörkt tema (natt)"}
      title={tema.nu === "natt" ? "Dag" : "Natt"}
    >
      {tema.nu === "natt" ? "Dag" : "Natt"}
    </button>
    <a
      class="gear"
      href="/installningar/personer"
      title="Inställningar"
      aria-label="Inställningar"
      aria-current={route.sida === "personer" ? "page" : undefined}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">
        <circle cx="12" cy="12" r="3.2" />
        <circle cx="12" cy="12" r="6.6" />
        <path d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M5.2 18.8l2.1-2.1M16.7 7.3l2.1-2.1" />
      </svg>
    </a>
  </div>
</header>

<main>
  {#if route.sida === "start"}
    <Start />
  {:else if route.sida === "funktionsområde"}
    {#key route.id}<Funktionsomrade id={route.id} />{/key}
  {:else if route.sida === "projekt"}
    {#key route.id}<Projekt id={route.id} />{/key}
  {:else if route.sida === "personer"}
    <Personer />
  {:else if route.sida === "person"}
    {#key route.id}<Stjarnkarta id={route.id} />{/key}
  {:else if route.sida === "mina"}
    <Mina />
  {:else}
    <Saknas />
  {/if}
</main>

<VemStrip />

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
  .right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .sig {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sig select {
    padding: 4px 8px;
    max-width: 180px;
  }
  .nav {
    text-decoration: none;
    color: var(--mid);
    padding: 17px 0;
  }
  .nav:hover,
  .nav[aria-current="page"] {
    color: var(--tx);
  }
  .nav[aria-current="page"] {
    box-shadow: inset 0 -2px 0 var(--red);
  }
  .gear {
    display: flex;
    color: var(--dim);
    padding: 6px;
  }
  .gear:hover,
  .gear[aria-current="page"] {
    color: var(--tx);
  }
  @media (max-width: 900px) {
    header {
      padding: 0 16px;
    }
    .sig .cap {
      display: none;
    }
  }
</style>
