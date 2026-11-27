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
  import Embed from "./pages/Embed.svelte";
  import VemStrip from "./components/VemStrip.svelte";
  import { laddaPersoner, signatur } from "./lib/signatur.svelte.js";
  import { tema } from "./lib/tema.svelte.js";
  import { initialer } from "./lib/initialer.js";

  const route = $derived(router.route);

  // Load Personer so the header can show the remembered Signatur.
  laddaPersoner().catch(() => {});

  // An edit held for a Signatur is thrown away when its page is left.
  $effect(() => {
    void router.route;
    return () => signatur.avbryt();
  });

  // The phone header's Signatur menu (Q16 a).
  let menyÖppen = $state(false);
  let byter = $state(false);
  let menyRot = $state<HTMLElement>();

  function stängMeny(fokusTillbaka = false) {
    menyÖppen = false;
    byter = false;
    if (fokusTillbaka) menyRot?.querySelector<HTMLElement>(".initialer")?.focus();
  }

  // Leaving the page closes the menu.
  $effect(() => {
    void router.route;
    return () => stängMeny();
  });

  function utanför(e: PointerEvent) {
    if (menyÖppen && menyRot && !menyRot.contains(e.target as Node)) stängMeny();
  }

  function tangent(e: KeyboardEvent) {
    if (menyÖppen && e.key === "Escape") stängMeny(true);
  }
</script>

<svelte:window onpointerdown={utanför} onkeydown={tangent} />

{#if route.sida === "embed"}
  <!-- The Notion embed is its own small page: no site header, its own Signatur strip. -->
  {#key route.id}<Embed id={route.id} />{/key}
{:else}
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
        class="nav bred"
        href={personHref(signatur.person)}
        aria-current={route.sida === "person" && route.id === signatur.person.id ? "page" : undefined}>Mina Scopes</a
      >
      <label class="sig bred">
        <span class="cap">Signatur</span>
        <select
          value={signatur.person.id}
          onchange={(e) => signatur.välj(e.currentTarget.value)}
          aria-label="Byt signatur"
        >
          {#each signatur.aktiva as p (p.id)}<option value={p.id}>{p.namn}</option>{/each}
        </select>
      </label>
      <!-- Phone (Q16 a): the Signatur as initials, opening a menu with Mina Scopes, Byt Signatur and tema. -->
      <div class="meny" bind:this={menyRot}>
        <button
          class="initialer"
          aria-expanded={menyÖppen}
          aria-controls="signaturmeny"
          aria-label="Signatur: {signatur.person.namn}"
          onclick={() => (menyÖppen ? stängMeny() : (menyÖppen = true))}
        >
          <span class="bubbla" aria-hidden="true">{initialer(signatur.person.namn)}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d={menyÖppen ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"} />
          </svg>
        </button>
        {#if menyÖppen}
          <div class="panel" id="signaturmeny">
            <div class="vem">
              <span class="cap">Signatur</span>
              <strong>{signatur.person.namn}</strong>
            </div>
            <div class="grupp">
              <a
                class="rad"
                href={personHref(signatur.person)}
                aria-current={route.sida === "person" && route.id === signatur.person.id ? "page" : undefined}
                onclick={() => stängMeny()}>Mina Scopes</a
              >
              <button class="rad" aria-expanded={byter} onclick={() => (byter = !byter)}>Byt Signatur</button>
              {#if byter}
                <ul aria-label="Byt signatur">
                  {#each signatur.aktiva as p (p.id)}
                    <li>
                      <button
                        class="rad person"
                        aria-pressed={p.id === signatur.person.id}
                        onclick={() => {
                          signatur.välj(p.id);
                          stängMeny();
                        }}>{p.namn}</button
                      >
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
            <div class="tema-rad">
              <span id="tema-etikett">Tema</span>
              <div class="segment" role="group" aria-labelledby="tema-etikett">
                <button aria-pressed={tema.nu === "natt"} onclick={() => tema.sätt("natt")}>Natt</button>
                <button aria-pressed={tema.nu === "dag"} onclick={() => tema.sätt("dag")}>Dag</button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
    <!-- The theme toggle shows the current theme: a moon in natt, a sun in dag. -->
    <button
      class="quiet tema"
      class:bred={!!signatur.person}
      onclick={() => tema.växla()}
      aria-label={tema.nu === "natt" ? "Byt till ljust tema (dag)" : "Byt till mörkt tema (natt)"}
      title={tema.nu === "natt" ? "Natt" : "Dag"}
    >
      {#if tema.nu === "natt"}
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
          <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
      {/if}
    </button>
    <a
      class="gear"
      href="/installningar/personer"
      title="Inställningar"
      aria-label="Inställningar"
      aria-current={route.sida === "personer" ? "page" : undefined}
    >
      <!-- A cog with teeth, not rays: it must not read as the sun of the theme toggle. -->
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
        <path d="M19.19 9.54L21.8 10.01L21.8 13.99L19.19 14.46L18.83 15.34L20.33 17.53L17.53 20.33L15.34 18.83L14.46 19.19L13.99 21.8L10.01 21.8L9.54 19.19L8.66 18.83L6.47 20.33L3.67 17.53L5.17 15.34L4.81 14.46L2.2 13.99L2.2 10.01L4.81 9.54L5.17 8.66L3.67 6.47L6.47 3.67L8.66 5.17L9.54 4.81L10.01 2.2L13.99 2.2L14.46 4.81L15.34 5.17L17.53 3.67L20.33 6.47L18.83 8.66Z" />
        <circle cx="12" cy="12" r="3.2" />
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
{/if}

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
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .nav,
  .mk {
    white-space: nowrap;
  }
  .tema {
    display: flex;
    padding: 6px;
  }
  /* Kugghjulet står sist, med lite mer avstånd till temaväxlaren. */
  .gear {
    margin-left: 6px;
  }
  /* Phone only: the initials button and its menu. */
  .meny {
    display: none;
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
  /* Telefon (Q16 a): ✦ Apogee, initialknappen och kugghjulet på en rad. */
  @media (max-width: 599px) {
    header {
      gap: 12px;
    }
    .right {
      gap: 8px;
    }
    .bred {
      display: none;
    }
    .gear {
      margin-left: 0;
      padding: 12px;
    }
    .tema {
      padding: 12px;
    }
    .meny {
      display: block;
    }
  }
  .initialer {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 10px 0 4px;
    border-radius: 17px;
    background: var(--panel);
    border-color: var(--btn);
    color: var(--tx);
  }
  .bubbla {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--sel);
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.02em;
  }
  .panel {
    position: absolute;
    top: 56px;
    right: 16px;
    width: min(320px, calc(100vw - 32px));
    max-height: calc(100vh - 72px);
    overflow-y: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 2px;
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
  }
  .vem {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--line);
  }
  .vem strong {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .grupp {
    padding: 4px 0;
    border-bottom: 1px solid var(--line);
  }
  .grupp ul {
    list-style: none;
    margin: 0;
    padding: 0 0 4px;
  }
  .rad {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: 0 16px;
    border: 0;
    border-radius: 0;
    background: none;
    color: var(--mid);
    text-align: left;
    text-decoration: none;
  }
  .rad:hover,
  .rad[aria-current="page"] {
    color: var(--tx);
    background: var(--sel);
  }
  .rad.person {
    padding-left: 28px;
  }
  /* A menu row has no outline to press: the chosen Signatur reads in --tx, bold. */
  .rad.person[aria-pressed="true"] {
    color: var(--tx);
    font-weight: 600;
  }
  .tema-rad {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    color: var(--mid);
  }
  .segment {
    display: flex;
  }
  .segment button {
    min-height: 44px;
    padding: 0 14px;
    color: var(--mid);
  }
  .segment button + button {
    margin-left: -1px;
  }
  /* The global pressed rule gives the outline and --sel; only the text, dimmed here, needs lifting. */
  .segment button[aria-pressed="true"] {
    color: var(--tx);
  }
</style>
