<script lang="ts">
  import type { FunktionsområdeVy } from "../../core/index.js";
  import NamnForm from "../components/NamnForm.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import Tidsplan from "../components/Tidsplan.svelte";
  import Borttagna from "../components/Borttagna.svelte";
  import ProjektCells from "../components/ProjektCells.svelte";
  import TaBort from "../components/TaBort.svelte";
  import { api, ApiError } from "../lib/api.js";
  import { signatur } from "../lib/signatur.svelte.js";
  import { funktionsområdeHref, projektHref } from "../lib/links.js";
  import { router } from "../lib/router.svelte.js";
  import Saknas from "./Saknas.svelte";

  let { id }: { id: string } = $props();

  let fo = $state<FunktionsområdeVy | undefined>();
  let saknas = $state(false);
  let loadError = $state("");
  let läge = $state<"visa" | "byt namn" | "nytt projekt">("visa");

  async function load() {
    try {
      fo = await api.getFunktionsområde(id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) saknas = true;
      else loadError = e instanceof Error ? e.message : "Kunde inte läsa in";
    }
  }
  load();

  /** Dates and Milstolpar of a Funktionsområde: saved without Historik. */
  const mål = $derived({ funktionsområde: id });
  async function ändraTid(edit: (vem: string) => Promise<unknown>) {
    try {
      await signatur.signera(edit);
    } finally {
      await load();
    }
  }

  async function bytNamn(namn: string) {
    await signatur.signera((vem) => api.renameFunktionsområde(id, namn, vem));
    await load();
    läge = "visa";
    if (fo) router.navigate(funktionsområdeHref(fo), { replace: true });
  }

  /** Ta bort: only when all its Projekt are Avslutade (the core says why not). */
  async function taBort() {
    await signatur.signera((vem) => api.taBortFunktionsområde(id, vem));
    router.navigate("/");
  }

  async function återställProjekt(projektId: string) {
    await signatur.signera((vem) => api.återställProjekt(projektId, vem));
    await load();
  }

  async function raderaProjekt(projektId: string, namn: string) {
    await signatur.signera((vem) => api.raderaProjekt(projektId, namn, vem));
    await load();
  }

  async function skapaProjekt(namn: string) {
    const p = await signatur.signera((vem) => api.createProjekt(id, namn, vem));
    router.navigate(projektHref(p));
  }
</script>

<svelte:head><title>{fo ? `${fo.namn} · Apogee` : "Apogee"}</title></svelte:head>

{#if saknas}
  <Saknas />
{:else}
  <div class="page">
    <div class="crumbs"><a href="/">Alla Funktionsområden</a></div>
    {#if loadError}
      <p class="error">{loadError}</p>
    {:else if fo}
      {#if läge === "byt namn"}
        <NamnForm
          label="Nytt namn på Funktionsområdet"
          value={fo.namn}
          submitLabel="Spara"
          onsubmit={bytNamn}
          oncancel={() => (läge = "visa")}
        />
      {:else}
        <div class="pagehead">
          <div>
            <div class="titlerow">
              <h1>{fo.namn}</h1>
              <button class="quiet" onclick={() => (läge = "byt namn")}>Byt namn</button>
              {#if !fo.borttagen}
                <TaBort fråga="Ta bort {fo.namn} med {fo.projekt.length} Projekt?" ontabort={taBort} />
              {/if}
            </div>
            <div class="meta">
              {fo.projekt.length} Projekt{#if fo.stilla > 0}{" · "}<span class="stilla">{fo.stilla} stilla</span>{/if}
            </div>
            <div class="tid">
              <Nedrakning nedräkning={fo.nedräkning} nästaMilstolpe={fo.nästaMilstolpe} />
              <Tidsplan
                tidsplan={fo.tidsplan}
                onsätt={(input) => ändraTid((vem) => api.setDatum(mål, input, vem))}
                onlägg={(m) => ändraTid((vem) => api.addMilstolpe(mål, m, vem))}
                onändra={(mid, ä) => ändraTid((vem) => api.changeMilstolpe(mål, mid, ä, vem))}
                ontabort={(mid) => ändraTid((vem) => api.removeMilstolpe(mål, mid, vem))}
              />
            </div>
          </div>
          {#if läge === "visa"}
            <button class="pr" onclick={() => (läge = "nytt projekt")}>Nytt Projekt</button>
          {/if}
        </div>
      {/if}

      {#if läge === "nytt projekt"}
        <NamnForm
          label="Namn på Projektet"
          submitLabel="Skapa"
          onsubmit={skapaProjekt}
          oncancel={() => (läge = "visa")}
        />
      {/if}

      <section>
        <ProjektCells projekt={fo.projekt} stor />
      </section>

      <Borttagna
        rubrik="Borttagna Projekt"
        rader={fo.borttagnaProjekt}
        onåterställ={återställProjekt}
        onradera={raderaProjekt}
      />
    {/if}
  </div>
{/if}

<style>
  section {
    margin-top: 32px;
  }
  .tid {
    margin-top: 14px;
  }
  .stilla {
    color: var(--redtx);
  }
</style>
