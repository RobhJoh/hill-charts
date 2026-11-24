<script lang="ts">
  import type { FunktionsområdeVy, Översikt } from "../../core/index.js";
  import Borttagna from "../components/Borttagna.svelte";
  import NamnForm from "../components/NamnForm.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import ProjektCells from "../components/ProjektCells.svelte";
  import { api } from "../lib/api.js";
  import { signatur } from "../lib/signatur.svelte.js";
  import { funktionsområdeHref } from "../lib/links.js";

  let översikt = $state<Översikt | undefined>();
  let borttagna = $state<FunktionsområdeVy[]>([]);
  let loadError = $state("");
  let skapar = $state(false);

  async function load() {
    try {
      [översikt, borttagna] = await Promise.all([api.overview(), api.borttagnaFunktionsområden()]);
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Kunde inte läsa in";
    }
  }
  load();

  const antalProjekt = $derived(översikt?.reduce((n, fo) => n + fo.projekt.length, 0) ?? 0);

  /** Each Borttaget Funktionsområde with every Projekt Radera would erase with it. */
  const borttagnaRader = $derived(
    borttagna.map((fo) => ({
      ...fo,
      borttagen: fo.borttagen!,
      följer: [...fo.projekt, ...fo.borttagnaProjekt].map((p) => p.namn),
    })),
  );

  async function återställ(id: string) {
    await signatur.signera((vem) => api.återställFunktionsområde(id, vem));
    await load();
  }

  async function radera(id: string, namn: string) {
    await signatur.signera((vem) => api.raderaFunktionsområde(id, namn, vem));
    await load();
  }

  async function skapa(namn: string) {
    await signatur.signera((vem) => api.createFunktionsområde(namn, vem));
    skapar = false;
    await load();
  }
</script>

<svelte:head><title>Apogee</title></svelte:head>

<div class="page">
  <div class="pagehead">
    <div>
      <h1>Alla Funktionsområden</h1>
      {#if översikt}<div class="meta">{antalProjekt} Projekt</div>{/if}
    </div>
    {#if !skapar}
      <button class="pr" onclick={() => (skapar = true)}>Nytt Funktionsområde</button>
    {/if}
  </div>

  {#if skapar}
    <NamnForm
      label="Namn på Funktionsområdet"
      submitLabel="Skapa"
      onsubmit={skapa}
      oncancel={() => (skapar = false)}
    />
  {/if}

  {#if loadError}
    <p class="error">{loadError}</p>
  {:else if översikt && översikt.length === 0}
    <p class="empty">Inga Funktionsområden ännu. Skapa det första för att samla Projekt i det.</p>
  {:else if översikt}
    {#each översikt as fo (fo.id)}
      <section>
        <h2>
          <a href={funktionsområdeHref(fo)}>{fo.namn}</a>
          <span
            >{fo.projekt.length} Projekt{#if fo.stilla > 0}{" · "}<em class="stilla">{fo.stilla} stilla</em>{/if}</span
          >
        </h2>
        {#if fo.nedräkning || fo.nästaMilstolpe}
          <div class="cd"><Nedrakning nedräkning={fo.nedräkning} nästaMilstolpe={fo.nästaMilstolpe} liten /></div>
        {/if}
        <ProjektCells projekt={fo.projekt} />
      </section>
    {/each}
  {/if}

  <Borttagna rubrik="Borttagna Funktionsområden" rader={borttagnaRader} onåterställ={återställ} onradera={radera} />
</div>

<style>
  section {
    margin-top: 40px;
  }
  h2 {
    font: 600 18px Barlow, system-ui, sans-serif;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid var(--line);
    padding-bottom: 10px;
    margin-bottom: 6px;
  }
  h2 a {
    text-decoration: none;
  }
  h2 a:hover {
    text-decoration: underline;
  }
  h2 span {
    font: 400 14px Barlow, system-ui, sans-serif;
    color: var(--dim);
  }
  .cd {
    margin: 4px 0 10px;
  }
  .stilla {
    font-style: normal;
    color: var(--redtx);
  }
</style>
