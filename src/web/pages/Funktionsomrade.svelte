<script lang="ts">
  import { personNamn } from "../lib/agare.js";
  import { felText } from "../lib/fel.js";
  import type { FunktionsområdeVy } from "../../core/index.js";
  import AndraINotion from "../components/AndraINotion.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import Tidsplan from "../components/Tidsplan.svelte";
  import Borttagna from "../components/Borttagna.svelte";
  import ProjektCells from "../components/ProjektCells.svelte";
  import Borttaget from "../components/Borttaget.svelte";
  import KopieraLank from "../components/KopieraLank.svelte";
  import Mer, { type MerPost } from "../components/Mer.svelte";
  import { STATUS_ORD } from "../lib/status.js";
  import { api, ApiError } from "../lib/api.js";
  import { signatur } from "../lib/signatur.svelte.js";
  import { funktionsområdeHref } from "../lib/links.js";
  import { router } from "../lib/router.svelte.js";
  import StillaAntal from "../components/StillaAntal.svelte";
  import NotionStatus from "../components/NotionStatus.svelte";
  import Saknas from "./Saknas.svelte";

  let { id }: { id: string } = $props();

  let fo = $state<FunktionsområdeVy | undefined>();
  let saknas = $state(false);
  let loadError = $state("");
  let tidsplan = $state<ReturnType<typeof Tidsplan>>();
  let länk = $state<ReturnType<typeof KopieraLank>>();

  /** Q18 b: Milstolpar and the rare actions are in Mer; namn and dates are changed in Notion. */
  const mer = $derived.by((): MerPost[] => {
    if (!fo) return [];
    return [
      { grupp: "Tidsplan", text: "Ny Milstolpe", gör: () => tidsplan?.öppnaMilstolpe() },
      { avdelare: true, text: "Kopiera länk", gör: () => void länk?.kopiera() },
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

  /** Milstolpar of a Funktionsområde: saved without Historik. */
  const mål = $derived({ funktionsområde: id });
  async function ändraTid(edit: (vem: string) => Promise<unknown>) {
    try {
      await signatur.signera(edit);
    } finally {
      await load();
    }
  }

  async function raderaProjekt(projektId: string, namn: string) {
    await signatur.signera((vem) => api.raderaProjekt(projektId, namn, vem));
    await load();
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
      <div class="pagehead">
        <div>
          <div class="titlerow">
            <h1>{fo.namn}</h1>
            <Mer poster={mer} />
            <KopieraLank bind:this={länk} knapp={false} href={funktionsområdeHref(fo)} />
            <AndraINotion url={fo.notionUrl} />
          </div>
          <div class="meta">
            {STATUS_ORD[fo.status]}<NotionStatus status={fo.notionStatus} före=" · " /> · {fo.projekt.length} Projekt{#if fo.funktionsansvarig}{" · "}Funktionsansvarig {personNamn(fo.funktionsansvarig)}{/if}{#if fo.stilla > 0}{" · "}<StillaAntal antal={fo.stilla} />{/if}
          </div>
          <div class="tid">
            <Nedrakning nedräkning={fo.nedräkning} nästaMilstolpe={fo.nästaMilstolpe} />
            <Tidsplan
              bind:this={tidsplan}
              knappar={false}
              tidsplan={fo.tidsplan}
              onlägg={(m) => ändraTid((vem) => api.addMilstolpe(mål, m, vem))}
              onändra={(mid, ä) => ändraTid((vem) => api.changeMilstolpe(mål, mid, ä, vem))}
              ontabort={(mid) => ändraTid((vem) => api.removeMilstolpe(mål, mid, vem))}
            />
          </div>
        </div>
      </div>

      <section>
        <ProjektCells projekt={fo.projekt} stor />
      </section>

      <Borttagna rubrik="Borttagna Projekt" rader={fo.borttagnaProjekt} onradera={raderaProjekt} />
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
</style>
