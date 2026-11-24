<script lang="ts">
  import type { Översikt, ProjektVy } from "../../core/index.js";
  import EmptyHill from "../components/EmptyHill.svelte";
  import NamnForm from "../components/NamnForm.svelte";
  import { api, ApiError } from "../lib/api.js";
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

  async function load() {
    try {
      projekt = await api.getProjekt(id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) saknas = true;
      else loadError = e instanceof Error ? e.message : "Kunde inte läsa in";
    }
  }
  load();

  async function bytNamn(namn: string) {
    await api.renameProjekt(id, namn);
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
      await api.moveProjekt(id, flyttaTill);
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
  <div class="page">
    {#if loadError}
      <p class="error">{loadError}</p>
    {:else if projekt}
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
        <EmptyHill namn={projekt.namn} />
        <p class="meta">Inga Scopes ännu.</p>
      </div>
    {/if}
  </div>
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
  .chart {
    margin-top: 24px;
    padding: 18px 22px 16px;
    border: 1px solid var(--line);
    background: radial-gradient(ellipse at 50% 60%, #11204a 0%, var(--chart) 55%, var(--bg) 100%);
  }
  .chart p {
    text-align: center;
  }
</style>
