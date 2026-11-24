<script lang="ts">
  import type { Förhandsvisning, HistorikRad, Översikt, PersonVy, ProjektVy } from "../../core/index.js";
  import HillChart from "../components/HillChart.svelte";
  import HistorikPanel from "../components/HistorikPanel.svelte";
  import Toast from "../components/Toast.svelte";
  import { beskrivRad, UTAN_NAMN, visaTid } from "../lib/historik.js";
  import NamnForm from "../components/NamnForm.svelte";
  import ScopeIndex from "../components/ScopeIndex.svelte";
  import { api, ApiError } from "../lib/api.js";
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

  /** Reloads the Projekt and its Hill chart (after a write; live sync can call it too). */
  async function load() {
    try {
      projekt = await api.getProjekt(id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) saknas = true;
      else loadError = e instanceof Error ? e.message : "Kunde inte läsa in";
    }
  }
  load();
  laddaPersoner()
    .then((p) => (personer = p))
    .catch(() => {});

  /** Runs a signed chart edit, then reloads. Errors reach the caller (and are shown). */
  async function redigera<T>(edit: (vem: string) => Promise<T>): Promise<T> {
    try {
      return await signatur.signera(edit);
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

  // --- Historik (#35): panel, Visa preview, Återställ hit, Ångra, removal toast ---
  let historikÖppen = $state(false);
  let visning = $state<{ rad: HistorikRad<PersonVy>; vy: Förhandsvisning } | null>(null);
  /** The removal the "Scope borttagen · Ångra" toast would undo. */
  let borttagning = $state<string | null>(null);

  async function visa(rad: HistorikRad<PersonVy> | null) {
    visning = rad ? { rad, vy: await api.förhandsvisa(id, rad.id) } : null;
  }

  async function återställ(uppdateringId: string) {
    await redigera((vem) => api.återställHit(id, uppdateringId, vem));
    visning = null;
  }

  async function ångra(uppdateringId: string) {
    await redigera((vem) => api.ångra(id, uppdateringId, vem));
    visning = null;
  }

  async function taBort(scopeId: string) {
    const { uppdatering } = await redigera((vem) => api.removeScope(id, scopeId, vem));
    borttagning = uppdatering.id;
  }

  function stängHistorik() {
    historikÖppen = false;
    visning = null;
  }

  async function läggTill(namn: string, ägare: string) {
    let nytt: string | undefined;
    await redigera(async (vem) => (nytt = (await api.addScope(id, namn, ägare, vem)).id));
    valt = nytt ?? null;
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
          <button class="ny" aria-pressed={historikÖppen} onclick={() => (historikÖppen ? stängHistorik() : (historikÖppen = true))}>
            Historik
          </button>
          <button class="pr" onclick={() => (nyScope = true)}>Ny Scope</button>
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

      {#if visning}
        {@const namn = (pid: string) => personer.find((p) => p.id === pid)?.namn ?? "Okänd"}
        <div class="visning" role="status">
          <span>
            Visar läget efter: <strong>{visning.rad.vem?.namn ?? UTAN_NAMN}</strong>
            {beskrivRad(visning.rad, namn)} · {visaTid(visning.rad.tid)}.
            {visning.vy.skiljer.length === 0
              ? "Samma som nu."
              : `${visning.vy.skiljer.length} Scopes skiljer sig från nu (streckad ring).`}
          </span>
          <button class="pr" disabled={visning.vy.skiljer.length === 0} onclick={() => återställ(visning!.rad.id)}>
            Återställ hit
          </button>
          <button class="quiet" onclick={() => (visning = null)}>Tillbaka till nu</button>
        </div>
        <div class="chart">
          <HillChart namn={projekt.namn} scopes={visning.vy.scopes} tema={tema.nu} markerade={visning.vy.skiljer} />
        </div>
      {:else}
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
      {/if}
      {#if skrivFel}<p class="error" role="alert">{skrivFel}</p>{/if}
    </div>

    <aside>
      {#if historikÖppen}
        <HistorikPanel
          projektId={id}
          {personer}
          version={projekt}
          visad={visning?.rad.id ?? null}
          onvisa={visa}
          onåterställ={återställ}
          onångra={ångra}
          onstäng={stängHistorik}
        />
      {:else}
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
        ontabort={taBort}
      />
      {/if}
    </aside>
    </div>
    {#if borttagning}
      {@const mål = borttagning}
      <Toast text="Scope borttagen" åtgärd="Ångra" onåtgärd={() => ångra(mål)} onstäng={() => (borttagning = null)} />
    {/if}
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
    grid-template-columns: minmax(0, 1fr) 340px;
    min-height: calc(100vh - 56px);
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
  .visning {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    padding: 10px 14px;
    border: 1px dashed var(--orbit);
    background: var(--sel);
  }
  .visning span {
    flex: 1 1 280px;
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
