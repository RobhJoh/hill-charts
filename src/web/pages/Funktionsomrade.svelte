<script lang="ts">
  import { felText } from "../lib/fel.js";
  import type { FunktionsområdeVy } from "../../core/index.js";
  import NamnForm from "../components/NamnForm.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import Tidsplan from "../components/Tidsplan.svelte";
  import Borttagna from "../components/Borttagna.svelte";
  import ProjektCells from "../components/ProjektCells.svelte";
  import TaBort from "../components/TaBort.svelte";
  import Borttaget from "../components/Borttaget.svelte";
  import KopieraLank from "../components/KopieraLank.svelte";
  import Mer, { type MerPost } from "../components/Mer.svelte";
  import { taBortSpärr } from "../lib/mer.js";
  import { STATUS_ORD } from "../lib/avslutat.js";
  import { datumKnapp } from "../lib/datum.js";
  import { api, ApiError } from "../lib/api.js";
  import { signatur } from "../lib/signatur.svelte.js";
  import { funktionsområdeHref, projektHref } from "../lib/links.js";
  import { router } from "../lib/router.svelte.js";
  import StillaAntal from "../components/StillaAntal.svelte";
  import Saknas from "./Saknas.svelte";

  let { id }: { id: string } = $props();

  let fo = $state<FunktionsområdeVy | undefined>();
  let saknas = $state(false);
  let loadError = $state("");
  let läge = $state<"visa" | "byt namn" | "nytt projekt">("visa");
  let tidsplan = $state<ReturnType<typeof Tidsplan>>();
  let länk = $state<ReturnType<typeof KopieraLank>>();
  let taBortÖppen = $state(false);

  /** Q18 b: only Nytt Projekt stays out; the Tidsplan and the rare actions are in Mer. */
  const mer = $derived.by((): MerPost[] => {
    if (!fo) return [];
    return [
      { grupp: "Tidsplan", text: datumKnapp(fo.tidsplan), gör: () => tidsplan?.öppnaDatum() },
      { text: "Ny Milstolpe", gör: () => tidsplan?.öppnaMilstolpe() },
      { avdelare: true, text: "Byt namn", gör: () => (läge = "byt namn") },
      { text: "Kopiera länk", gör: () => void länk?.kopiera() },
      { avdelare: true, text: "Ta bort", farlig: true, spärr: taBortSpärr(fo.projekt), gör: () => (taBortÖppen = true) },
    ];
  });

  async function load() {
    try {
      fo = await api.getFunktionsområde(id);
      // Canonical URL in the address bar (the server redirects; client-side links may be stale).
      const href = funktionsområdeHref(fo);
      if (router.route.sida === "funktionsområde" && location.pathname !== href) {
        router.navigate(href + location.search + location.hash, { replace: true });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) saknas = true;
      else loadError = felText(e, "Kunde inte läsa in");
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

<svelte:head>
  <title>{fo?.borttagen ? "Funktionsområdet är borttaget · Apogee" : fo ? `${fo.namn} · Apogee` : "Apogee"}</title>
</svelte:head>

{#if saknas}
  <Saknas längre />
{:else if fo?.borttagen}
  <Borttaget
    rubrik="Funktionsområdet är borttaget"
    namn={fo.namn}
    borttagen={fo.borttagen}
    lista={{ href: "/", text: "Till Borttagna Funktionsområden" }}
  />
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
              <Mer poster={mer} />
              <KopieraLank bind:this={länk} knapp={false} href={funktionsområdeHref(fo)} />
            </div>
            {#if taBortÖppen}
              <div class="tabort">
                <TaBort
                  bind:öppen={taBortÖppen}
                  knapp={false}
                  fråga="Ta bort {fo.namn} med {fo.projekt.length} Projekt?"
                  ontabort={taBort}
                />
              </div>
            {/if}
            <div class="meta">
              {STATUS_ORD[fo.status]} · {fo.projekt.length} Projekt{#if fo.stilla > 0}{" · "}<StillaAntal antal={fo.stilla} />{/if}
            </div>
            <div class="tid">
              <Nedrakning nedräkning={fo.nedräkning} nästaMilstolpe={fo.nästaMilstolpe} />
              <Tidsplan
                bind:this={tidsplan}
                knappar={false}
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
  .tabort {
    margin-top: 8px;
    font-size: 14px;
  }
</style>
