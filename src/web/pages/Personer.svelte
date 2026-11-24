<script lang="ts">
  // Inställningar › Personer: everyone who can sign edits and own Scopes.
  import type { PersonVy } from "../../core/index.js";
  import { api } from "../lib/api.js";
  import { laddaPersoner, signatur } from "../lib/signatur.svelte.js";

  let personer = $state<PersonVy[] | undefined>();
  let loadError = $state("");
  let namn = $state("");
  let error = $state("");
  let busy = $state(false);

  async function load() {
    try {
      personer = await laddaPersoner();
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Kunde inte läsa in";
    }
  }
  load();

  async function läggTill(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = "";
    try {
      // The first Person is added without a Signatur; every later one is signed.
      if ((await laddaPersoner()).length === 0) await api.createPerson(namn, null);
      else await signatur.signera((vem) => api.createPerson(namn, vem));
      namn = "";
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : "Något gick fel";
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Personer · Apogee</title></svelte:head>

<div class="page">
  <div class="crumbs">Inställningar</div>
  <h1>Personer</h1>
  {#if personer}<div class="meta">{personer.length} {personer.length === 1 ? "Person" : "Personer"}</div>{/if}

  <form onsubmit={läggTill}>
    <label>
      <span class="cap">Lägg till en Person</span>
      <input bind:value={namn} maxlength="200" required placeholder="Namn" />
    </label>
    <button class="pr" disabled={busy}>Lägg till</button>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </form>

  {#if loadError}
    <p class="error">{loadError}</p>
  {:else if personer && personer.length === 0}
    <p class="empty">
      Inga Personer ännu. Lägg till dig själv först; sedan signeras varje ändring med en Person.
    </p>
  {:else if personer}
    <ul>
      {#each personer as p (p.id)}
        <li>
          {p.namn}
          {#if p.id === signatur.person?.id}<span class="meta">Din signatur</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  form {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    margin: 28px 0 8px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1 1 260px;
    max-width: 420px;
  }
  form p {
    flex-basis: 100%;
  }
  ul {
    list-style: none;
    padding: 0;
    margin-top: 24px;
    border-top: 1px solid var(--line);
    max-width: 640px;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
    font-weight: 600;
  }
</style>
