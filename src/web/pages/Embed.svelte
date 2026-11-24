<script lang="ts">
  import { felText } from "../lib/fel.js";
  // The Notion embed (#43), variant B "Himmel + lista" of prototype/embed:
  // the Projekt's Hill chart in the `dag` theme beside a compact Scope list,
  // filling whatever box Notion gives it. Editing is drag only (plus the
  // keyboard on a focused star). Outward links are plain anchors with
  // target=_blank: window.open fails in Notion's desktop app.
  //
  // The first drag without a remembered Signatur is held while a bottom strip
  // asks "Vem flyttade?"; abandoning the strip throws the drag away and the
  // star snaps back. The Signatur lives in the embed's own (partitioned)
  // storage; when storage throws, it is asked for again each session.
  import type { ProjektVy } from "../../core/index.js";
  import HillChart from "../components/HillChart.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import { api, ApiError } from "../lib/api.js";
  import { lägeFärg } from "../lib/hill.js";
  import { projektHref } from "../lib/links.js";
  import { följLive, senasteLaddning } from "../lib/live.js";
  import { Avbruten, laddaPersoner, signatur } from "../lib/signatur.svelte.js";
  import { tema } from "../lib/tema.svelte.js";

  let { id }: { id: string } = $props();

  tema.visa("dag");

  let projekt = $state<ProjektVy | undefined>();
  let saknas = $state(false);
  let fel = $state("");
  let valt = $state<string | null>(null);
  let bredd = $state(0);
  /** The Signatur strip opened from the header's person icon (no edit held). */
  let byter = $state(false);
  let vald = $state("");

  /** Under ~520px: no list, all star labels, short link. */
  const smal = $derived(bredd > 0 && bredd < 520);
  const länk = $derived(projekt ? location.origin + projektHref(projekt) : location.origin);
  const visaStrip = $derived(signatur.frågar || byter);

  const load = senasteLaddning(() => api.getProjekt(id), {
    svar(svar) {
      projekt = svar;
      fel = "";
    },
    fel(e) {
      if (e instanceof ApiError && e.status === 404) saknas = true;
      else fel = felText(e, "Kunde inte läsa in");
    },
  });
  load();
  laddaPersoner().catch(() => {});

  // Live sync: re-fetch on every Uppdatering and every (re)connect, also when
  // the page is visible again (mobile webviews drop sockets in the background).
  $effect(() => följLive([id], () => void load()));

  async function flytta(scopeId: string, läge: number) {
    fel = "";
    try {
      await signatur.signera((vem) => api.changeScope(id, scopeId, { läge }, vem));
    } catch (e) {
      if (!(e instanceof Avbruten)) fel = felText(e, "Kunde inte spara");
      throw e;
    } finally {
      await load();
    }
  }

  async function öppnaByt() {
    await laddaPersoner().catch(() => {});
    vald = signatur.person?.id ?? "";
    byter = true;
  }

  function spara(event: SubmitEvent) {
    event.preventDefault();
    if (!vald) return;
    signatur.välj(vald);
    byter = false;
    vald = "";
  }

  /** Abandon: a held drag is thrown away (its star snaps back). */
  function avbryt() {
    byter = false;
    vald = "";
    signatur.avbryt();
  }
</script>

<svelte:head>
  <title>
    {projekt?.borttagen ? "Det här Projektet är borttaget · Apogee" : projekt ? `${projekt.namn} · Apogee` : "Apogee"}
  </title>
</svelte:head>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape" && visaStrip) avbryt();
  }}
/>

<div class="ap" class:smal bind:clientWidth={bredd}>
  {#if saknas}
    <div class="besked">
      <p><strong>Det här Projektet finns inte längre.</strong></p>
      <p><a href={location.origin + "/"} target="_blank" rel="noopener">Öppna Apogee ↗</a></p>
    </div>
  {:else if projekt?.borttagen}
    <div class="besked">
      <p><strong>Det här Projektet är borttaget.</strong></p>
      <p class="meta">{projekt.namn} togs bort av {projekt.borttagen.vem.namn}.</p>
      <p><a href={länk} target="_blank" rel="noopener">Öppna i Apogee ↗</a></p>
    </div>
  {:else if projekt}
    <header>
      <div class="namn">
        <div class="t" title={projekt.namn}>{projekt.namn}</div>
        <div class="m">
          {#if smal}
            <Nedrakning nedräkning={projekt.nedräkning} nästaMilstolpe={projekt.nästaMilstolpe} liten />
          {:else if projekt.nästaMilstolpe}
            ◆ {projekt.nästaMilstolpe.text}
          {/if}
        </div>
      </div>
      {#if !smal && projekt.nedräkning}
        <div class="cd"><Nedrakning nedräkning={projekt.nedräkning} /></div>
      {/if}
      <button
        class="vem"
        onclick={öppnaByt}
        title={signatur.person ? `Signatur: ${signatur.person.namn}. Byt` : "Välj signatur"}
        aria-label={signatur.person ? `Signatur: ${signatur.person.namn}. Byt` : "Välj signatur"}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
          <circle cx="8" cy="5.5" r="2.8" />
          <path d="M2.5 14c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
        </svg>
      </button>
      <a class="öppna" href={länk} target="_blank" rel="noopener">
        <svg width="13" height="13" viewBox="0 0 22 22" aria-hidden="true">
          <path d="M11 1 L12.6 9.4 L21 11 L12.6 12.6 L11 21 L9.4 12.6 L1 11 L9.4 9.4Z" fill="var(--red)" />
        </svg>
        {smal ? "Öppna ↗" : "Öppna i Apogee ↗"}
      </a>
    </header>

    <div class="kropp">
      <div class="himmel">
        <HillChart
          namn={projekt.namn}
          scopes={projekt.scopes}
          tema="dag"
          kompakt
          etiketter={smal ? true : "valt"}
          {valt}
          onvälj={(v) => (valt = v)}
          onflytta={flytta}
        />
      </div>
      {#if !smal}
        <ul class="lista" aria-label="Scopes">
          {#each projekt.scopes as s (s.id)}
            <li>
              <button class:sel={s.id === valt} onclick={() => (valt = s.id)} aria-pressed={s.id === valt}>
                <span class="prick" style:background={lägeFärg(s.läge, "dag")}></span>
                <span class="sn" title={s.namn}>{s.namn}</span>
                <span class="äg">{s.ägare.namn}{s.ägare.aktiv ? "" : " (inaktiv)"}</span>
                <span class="l">{s.läge}</span>
              </button>
            </li>
          {:else}
            <li class="tom">Inga Scopes än.</li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if fel}<p class="fel" role="alert">{fel}</p>{/if}

    {#if visaStrip}
      <form class="strip" onsubmit={spara} aria-label="Välj signatur">
        {#if signatur.aktiva.length === 0}
          <span>Det finns inga Personer än.</span>
        {:else}
          <label>
            <span class="q">Vem flyttade?</span>
            <select bind:value={vald} required>
              <option value="" disabled>Person</option>
              {#each signatur.aktiva as p (p.id)}<option value={p.id}>{p.namn}</option>{/each}
            </select>
          </label>
          <button class="pr" disabled={!vald}>Spara</button>
        {/if}
        <span class="inte">
          Inte med? <a href={location.origin + "/installningar/personer"} target="_blank" rel="noopener"
            >Öppna Inställningar i Apogee ↗</a
          >
        </span>
        <button type="button" class="stäng" onclick={avbryt} aria-label="Avbryt" title="Avbryt">×</button>
      </form>
    {/if}
  {/if}
</div>

<style>
  .ap {
    /* Stjärnatlas dag, on Notion's white page. */
    --bg: #ffffff;
    --panel: #f6f8fc;
    --line: #d3dbea;
    --grid: #e6ebf4;
    --tx: #0f1a3a;
    --mid: #4a5878;
    --dim: #5d6a88;
    --orbit: #8a9ac0;
    --red: #c8402b;
    --redtx: #b8381f;
    --sel: #e6ecf8;
    --halo: #fff;
    --star: #9aa8c7;
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--tx);
    font: 400 14px/1.35 Barlow, system-ui, sans-serif;
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 9px 14px;
    border-bottom: 1px solid var(--line);
    flex: none;
  }
  .namn {
    flex: 1;
    min-width: 0;
  }
  .t {
    font: 600 16px Barlow, system-ui, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .m {
    font-size: 13px;
    color: var(--dim);
    min-height: 1em;
  }
  .cd {
    min-width: 150px;
    font-size: 13px;
  }
  .vem {
    display: flex;
    padding: 5px;
    border: none;
    color: var(--dim);
  }
  .vem:hover {
    color: var(--tx);
  }
  .öppna {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font: 600 13px Barlow, system-ui, sans-serif;
    color: var(--mid);
    text-decoration: none;
    white-space: nowrap;
  }
  .öppna:hover {
    text-decoration: underline;
  }
  .kropp {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .himmel {
    flex: 1;
    min-width: 0;
  }
  .lista {
    width: 230px;
    flex: none;
    list-style: none;
    padding: 4px 0;
    border-left: 1px solid var(--line);
    background: var(--panel);
    overflow: auto;
    font-size: 13px;
  }
  .lista button {
    display: grid;
    grid-template-columns: 7px minmax(0, 1fr) auto 26px;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 5px 12px;
    border: none;
    border-radius: 0;
    text-align: left;
    font: 400 13px Barlow, system-ui, sans-serif;
  }
  .lista button:hover,
  .lista button.sel {
    background: var(--sel);
  }
  .prick {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .sn {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .äg {
    color: var(--dim);
    white-space: nowrap;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .l {
    font-weight: 700;
    text-align: right;
  }
  .tom {
    padding: 8px 12px;
    color: var(--dim);
  }
  .fel {
    flex: none;
    padding: 4px 14px;
    font-size: 13px;
    color: var(--redtx);
  }
  .strip {
    flex: none;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 8px 14px;
    background: var(--panel);
    border-top: 1px solid var(--line);
    font-size: 13px;
  }
  .strip label {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .q {
    font-weight: 600;
    font-size: 14px;
  }
  .strip select {
    padding: 3px 6px;
    min-width: 140px;
  }
  .strip .pr {
    padding: 4px 12px;
  }
  .inte {
    color: var(--dim);
  }
  .stäng {
    margin-left: auto;
    border: none;
    padding: 2px 8px;
    font-size: 18px;
    line-height: 1;
    color: var(--dim);
  }
  .besked {
    margin: auto;
    padding: 16px;
    text-align: center;
  }
  .besked p + p {
    margin-top: 6px;
  }
  .meta {
    color: var(--dim);
  }
</style>
