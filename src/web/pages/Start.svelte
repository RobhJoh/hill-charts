<script lang="ts">
  import { felText } from "../lib/fel.js";
  import type { FunktionsområdeVy, SynkStatus, UtanFunktionsområdeVy, Översikt } from "../../core/index.js";
  import Borttagna from "../components/Borttagna.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import ProjektCells from "../components/ProjektCells.svelte";
  import { api } from "../lib/api.js";
  import { signatur } from "../lib/signatur.svelte.js";
  import { funktionsområdeHref, projektHref } from "../lib/links.js";
  import StillaAntal from "../components/StillaAntal.svelte";
  import NotionStatus from "../components/NotionStatus.svelte";
  import { samladStatus } from "../lib/stilla.js";
  import { STATUS_ORD } from "../lib/avslutat.js";
  import { visaTid } from "../lib/historik.js";

  let översikt = $state<Översikt | undefined>();
  let utan = $state<UtanFunktionsområdeVy | null>(null);
  let borttagna = $state<FunktionsområdeVy[]>([]);
  let synk = $state<SynkStatus | undefined>();
  let loadError = $state("");
  let hämtar = $state(false);
  let synkError = $state("");

  async function load() {
    try {
      [översikt, utan, borttagna, synk] = await Promise.all([
        api.overview(),
        api.utanFunktionsområde(),
        api.borttagnaFunktionsområden(),
        api.synkStatus(),
      ]);
    } catch (e) {
      loadError = felText(e, "Kunde inte läsa in");
    }
  }
  load();

  /** "5 pågående · 3 stilla · 1 över tid", naming the Projekt that need attention. */
  const status = $derived(översikt ? samladStatus(översikt) : undefined);

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

  /** Hämta från Notion nu: needs no Signatur, since it only reads Notion. */
  async function hämta() {
    hämtar = true;
    synkError = "";
    try {
      await api.synkaFrånNotion();
      await load();
    } catch (e) {
      synkError = felText(e, "Kunde inte hämta från Notion");
    } finally {
      hämtar = false;
    }
  }
</script>

<svelte:head><title>Apogee</title></svelte:head>

<div class="page">
  <div class="pagehead">
    <div>
      <h1>Alla Funktionsområden</h1>
      {#if status}
        <p class="meta status">
          {status.pågående} pågående{#if status.stilla > 0}{" · "}<StillaAntal antal={status.stilla} /> i
            {#each status.stillaProjekt as p, i (p.id)}<a href={projektHref(p)}>{p.namn}</a
              >{i < status.stillaProjekt.length - 1 ? ", " : ""}{/each}{/if}{#if status.överTid > 0}{" · "}<span
              class="övertid">{status.överTid} över tid</span
            >:
            {#each status.överTidProjekt as p, i (p.id)}<a href={projektHref(p)}>{p.namn}</a
              >{i < status.överTidProjekt.length - 1 ? ", " : ""}{/each}{/if}{#if status.stilla === 0 && status.överTid === 0}{" · "}inget
            står still{/if}
        </p>
      {/if}
    </div>
    <!-- Funktionsområden and Projekt come from Notion (ADR 0003); a plain outlined button, as before. -->
    <div class="synk">
      <button onclick={hämta} disabled={hämtar}>{hämtar ? "Hämtar…" : "Hämta från Notion nu"}</button>
      {#if synk}
        <p class="meta">
          Senast hämtat från Notion: {synk.senastHämtat ? visaTid(synk.senastHämtat) : "aldrig"}
        </p>
      {/if}
      {#if synkError}<p class="error" role="alert">{synkError}</p>{/if}
    </div>
  </div>

  {#if loadError}
    <p class="error">{loadError}</p>
  {:else if översikt && översikt.length === 0 && !utan}
    <p class="empty">Inga Projekt ännu. Kryssa i Apogee på ett Projekt i Notion för att hämta hit det.</p>
  {:else if översikt}
    {#each översikt as fo (fo.id)}
      <section>
        <h2>
          <a href={funktionsområdeHref(fo)}>{fo.namn}<span class="pil" aria-hidden="true">›</span></a>
          <span
            >{STATUS_ORD[fo.status]}<NotionStatus status={fo.notionStatus} före=" · " /> · {fo.projekt.length} Projekt{#if fo.stilla > 0}{" · "}<StillaAntal antal={fo.stilla} />{/if}</span
          >
        </h2>
        {#if fo.nedräkning || fo.nästaMilstolpe}
          <div class="cd"><Nedrakning nedräkning={fo.nedräkning} nästaMilstolpe={fo.nästaMilstolpe} liten /></div>
        {/if}
        <ProjektCells projekt={fo.projekt} />
      </section>
    {/each}
    {#if utan}
      <!-- Not a Funktionsområde: no page, dates, status or Över tid of its own (GLOSSARY). -->
      <section>
        <h2>
          <span class="utan">Utan funktionsområde</span>
          <span>{utan.projekt.length} Projekt</span>
        </h2>
        <ProjektCells projekt={utan.projekt} />
      </section>
    {/if}
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
  h2 span.utan {
    font: inherit;
    color: var(--tx);
  }
  h2 a:hover {
    text-decoration: underline;
  }
  /* The heading opens the Funktionsområde page: a quiet arrow says so without hover. */
  h2 .pil {
    font: inherit;
    margin-left: 0.3em;
    color: var(--dim);
  }
  h2 a:hover .pil {
    color: var(--tx);
  }
  h2 span {
    font: 400 14px Barlow, system-ui, sans-serif;
    color: var(--dim);
  }
  .cd {
    margin: 4px 0 10px;
  }
  /* Cells right under the heading use its rule as their top edge (no double line). */
  h2:has(+ :global(.cells)) {
    margin-bottom: 0;
  }
  h2 + :global(.cells) {
    border-top: 0;
  }
  .status {
    margin: 0;
  }
  .synk {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .synk p {
    margin: 0;
    text-align: right;
  }
  .status a {
    color: inherit;
  }
  .övertid {
    color: var(--redtx);
  }
</style>
