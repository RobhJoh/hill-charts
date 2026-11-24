<script lang="ts">
  import type { Översikt, PersonVy, ProjektRad, ProjektVy } from "../../core/index.js";
  import HillChart from "../components/HillChart.svelte";
  import MiniHill from "../components/MiniHill.svelte";
  import NamnForm from "../components/NamnForm.svelte";
  import ScopeIndex from "../components/ScopeIndex.svelte";
  import { api, ApiError } from "../lib/api.js";
  import { följProjekt, liveUrl } from "../lib/live.js";
  import { Avbruten, laddaPersoner, signatur } from "../lib/signatur.svelte.js";
  import { tema } from "../lib/tema.svelte.js";
  import { funktionsområdeHref, projektHref } from "../lib/links.js";
  import { router } from "../lib/router.svelte.js";
  import Saknas from "./Saknas.svelte";

  let { id }: { id: string } = $props();

  let projekt = $state<ProjektVy | undefined>();
  let saknas = $state(false);
  let loadError = $state("");
  let läge = $state<"visa" | "byt namn" | "flytta">("visa");
  let funktionsområden = $state<Översikt>([]);
  let flyttaTill = $state("");
  let flyttError = $state("");
  let personer = $state<PersonVy[]>([]);
  let valt = $state<string | null>(null);
  let nyScope = $state(false);
  let skrivFel = $state("");
  /** The other Projekt in the same Funktionsområde, as mini charts. */
  let grannar = $state<ProjektRad[]>([]);

  let laddning = 0;
  /** Reloads the Projekt and its Hill chart (after a write, and on live sync). */
  async function load() {
    const denna = ++laddning;
    try {
      const svar = await api.getProjekt(id);
      // Live sync can reload in quick succession: only the latest answer counts.
      if (denna !== laddning) return;
      projekt = svar;
      const fo = await api.getFunktionsområde(svar.funktionsområde.id).catch(() => undefined);
      if (denna === laddning && fo) grannar = fo.projekt.filter((p) => p.id !== id);
    } catch (e) {
      if (denna !== laddning) return;
      if (e instanceof ApiError && e.status === 404) saknas = true;
      else loadError = e instanceof Error ? e.message : "Kunde inte läsa in";
    }
  }
  load();
  // Live sync (#36): re-fetch whenever anyone writes to this Projekt's Historik,
  // and on every (re)connect to catch up on what happened while offline.
  $effect(() => {
    const följ = följProjekt(liveUrl(id), { onÄndring: () => void load() });
    const synlig = () => {
      if (document.visibilityState === "visible") följ.återanslut();
    };
    document.addEventListener("visibilitychange", synlig);
    window.addEventListener("online", följ.återanslut);
    return () => {
      document.removeEventListener("visibilitychange", synlig);
      window.removeEventListener("online", följ.återanslut);
      följ.stäng();
    };
  });
  laddaPersoner()
    .then((p) => (personer = p))
    .catch(() => {});

  /** Runs a signed chart edit, then reloads. Errors reach the caller (and are shown). */
  async function redigera(edit: (vem: string) => Promise<unknown>) {
    try {
      await signatur.signera(edit);
    } finally {
      await load();
      personer = await laddaPersoner().catch(() => personer);
    }
  }

  async function flyttaScope(scopeId: string, läge: number) {
    skrivFel = "";
    try {
      await redigera((vem) => api.changeScope(id, scopeId, { läge }, vem));
    } catch (e) {
      if (!(e instanceof Avbruten)) skrivFel = e instanceof Error ? e.message : "Kunde inte spara";
      throw e;
    }
  }

  async function läggTill(namn: string, ägare: string) {
    let nytt: string | undefined;
    await redigera(async (vem) => (nytt = (await api.addScope(id, namn, ägare, vem)).id));
    valt = nytt ?? null;
  }

  /** Markera Avslutat / Öppna igen. */
  async function växlaAvslutat(markera: boolean) {
    skrivFel = "";
    try {
      await redigera((vem) => (markera ? api.markAvslutat(id, vem) : api.reopenProjekt(id, vem)));
    } catch (e) {
      if (!(e instanceof Avbruten)) skrivFel = e instanceof Error ? e.message : "Kunde inte spara";
    }
  }

  async function bytNamn(namn: string) {
    await signatur.signera((vem) => api.renameProjekt(id, namn, vem));
    await load();
    läge = "visa";
    if (projekt) router.navigate(projektHref(projekt), { replace: true });
  }

  async function öppnaFlytta() {
    funktionsområden = await api.overview();
    flyttaTill = "";
    flyttError = "";
    läge = "flytta";
  }

  async function flytta(event: SubmitEvent) {
    event.preventDefault();
    if (!flyttaTill) return;
    try {
      await signatur.signera((vem) => api.moveProjekt(id, flyttaTill, vem));
      await load();
      läge = "visa";
    } catch (e) {
      flyttError = e instanceof Error ? e.message : "Kunde inte flytta";
    }
  }
</script>

<svelte:head><title>{projekt ? `${projekt.namn} · Apogee` : "Apogee"}</title></svelte:head>

{#if saknas}
  <Saknas />
{:else}
  {#if loadError}
    <div class="page"><p class="error">{loadError}</p></div>
  {:else if projekt}
    <div class="projekt">
    <nav class="grannar" aria-label="Andra Projekt i {projekt.funktionsområde.namn}">
      <div class="cap">{projekt.funktionsområde.namn}</div>
      {#each grannar as g (g.id)}
        <a href={projektHref(g)} class:avslutat={g.avslutat}>
          <MiniHill scopes={g.scopes} tema={tema.nu} width={160} height={46} />
          <span class="gnamn">{g.namn}</span>
          {#if g.stilla > 0}<span class="stilla">{g.stilla} stilla</span>{/if}
        </a>
      {:else}
        <p class="meta">Inga andra Projekt.</p>
      {/each}
    </nav>
    <div class="huvud">
      <nav class="crumbs" aria-label="Brödsmulor">
        <a href="/">Alla Funktionsområden</a>
        <span aria-hidden="true">/</span>
        <a href={funktionsområdeHref(projekt.funktionsområde)}>{projekt.funktionsområde.namn}</a>
      </nav>

      {#if läge === "byt namn"}
        <NamnForm
          label="Nytt namn på Projektet"
          value={projekt.namn}
          submitLabel="Spara"
          onsubmit={bytNamn}
          oncancel={() => (läge = "visa")}
        />
      {:else}
        <div class="titlerow">
          <h1>{projekt.namn}</h1>
          <button class="quiet" onclick={() => (läge = "byt namn")}>Byt namn</button>
          <button class="quiet" onclick={öppnaFlytta}>Flytta</button>
          <button class="pr ny" onclick={() => (nyScope = true)}>Ny Scope</button>
        </div>
        <div class="status">
          {#if projekt.markeradAvslutat}
            <span>Avslutat</span>
            <button class="quiet" onclick={() => växlaAvslutat(false)}>Öppna igen</button>
          {:else}
            {#if projekt.avslutat}<span>Avslutat · alla Scopes på Läge 100</span>{:else}<span>Pågående</span>{/if}
            <button class="quiet" onclick={() => växlaAvslutat(true)}>Markera Avslutat</button>
          {/if}
        </div>
      {/if}

      {#if läge === "flytta"}
        <form class="flytta" onsubmit={flytta}>
          <label>
            <span class="cap">Flytta till Funktionsområde</span>
            <select bind:value={flyttaTill} required>
              <option value="" disabled>Välj …</option>
              {#each funktionsområden as fo (fo.id)}
                <option value={fo.id} disabled={fo.id === projekt.funktionsområde.id}>{fo.namn}</option>
              {/each}
            </select>
          </label>
          <button class="pr" disabled={!flyttaTill}>Flytta</button>
          <button type="button" onclick={() => (läge = "visa")}>Avbryt</button>
          {#if flyttError}<p class="error" role="alert">{flyttError}</p>{/if}
        </form>
      {/if}

      <div class="chart">
        <HillChart
          namn={projekt.namn}
          scopes={projekt.scopes}
          tema={tema.nu}
          {valt}
          onvälj={(s) => (valt = s)}
          onflytta={flyttaScope}
        />
      </div>
      {#if skrivFel}<p class="error" role="alert">{skrivFel}</p>{/if}
    </div>

    <aside>
      <ScopeIndex
        scopes={projekt.scopes}
        {personer}
        tema={tema.nu}
        {valt}
        bind:nyScope
        onvälj={(s) => (valt = s)}
        onlägg={läggTill}
        onbytnamn={(scopeId, namn) => redigera((vem) => api.changeScope(id, scopeId, { namn }, vem))}
        onbytägare={(scopeId, ägare) => redigera((vem) => api.changeScope(id, scopeId, { ägare }, vem))}
        ontabort={(scopeId) => redigera((vem) => api.removeScope(id, scopeId, vem))}
      />
    </aside>
    </div>
  {/if}
{/if}

<style>
  .crumbs {
    display: flex;
    gap: 8px;
  }
  .flytta {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    margin: 16px 0;
  }
  .flytta label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 240px;
  }
  .flytta p {
    flex-basis: 100%;
  }
  .projekt {
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr) 340px;
    min-height: calc(100vh - 56px);
  }
  .grannar {
    border-right: 1px solid var(--line);
    padding: 28px 18px;
  }
  .grannar .cap {
    margin-bottom: 10px;
  }
  .grannar a {
    display: block;
    padding: 8px 6px;
    text-decoration: none;
    color: var(--tx);
    border-bottom: 1px solid var(--line);
  }
  .grannar a:hover {
    background: var(--sel);
  }
  .grannar a.avslutat {
    opacity: 0.55;
  }
  .grannar :global(svg) {
    display: block;
  }
  .gnamn {
    display: block;
    font-weight: 600;
    font-size: 14px;
  }
  .stilla {
    font-size: 13px;
    color: var(--redtx);
  }
  .status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    color: var(--dim);
    font-size: 14px;
  }
  .huvud {
    padding: 28px 28px 48px;
    min-width: 0;
  }
  aside {
    background: var(--panel);
    border-left: 1px solid var(--line);
    padding: 28px 22px;
  }
  .titlerow .ny {
    margin-left: auto;
  }
  .chart {
    margin-top: 20px;
    border: 1px solid var(--line);
    background: var(--chart-ground);
  }
  @media (max-width: 900px) {
    .projekt {
      grid-template-columns: minmax(0, 1fr);
      min-height: 0;
    }
    .grannar {
      display: none;
    }
    .huvud {
      padding: 20px 16px 24px;
    }
    aside {
      border-left: none;
      border-top: 1px solid var(--line);
      padding: 20px 16px 64px;
    }
  }
</style>
