<script lang="ts">
  // Inställningar › Personer: everyone who can sign edits and own Scopes.
  // Add, rename, remove (handover of their Scopes in Pågående Projekt),
  // Återaktivera, and the Personer-historik. Nothing here has an Ångra.
  // Each Person shows their load (story 78) and links to their Stjärnkarta.
  import { PERSON_HÄNDELSE_TYP, type PersonHändelse, type PersonRad, type PersonVy } from "../../core/index.js";
  import { api, ApiError } from "../lib/api.js";
  import { lägeFärg } from "../lib/hill.js";
  import { personHref } from "../lib/links.js";
  import { tema } from "../lib/tema.svelte.js";
  import { laddaPersoner, signatur } from "../lib/signatur.svelte.js";

  let personer = $state<PersonVy[] | undefined>();
  let historik = $state<PersonHändelse[]>([]);
  /** Load per Person (Scopes, Projekt, stuck, Läge dots), by id. */
  let last = $state<Record<string, PersonRad>>({});
  let loadError = $state("");
  let namn = $state("");
  let error = $state("");
  let busy = $state(false);
  let visaInaktiva = $state(false);
  /** An inaktiv Person whose name was just typed: offer Återaktivera. */
  let inaktivTräff = $state<PersonVy | undefined>();

  /** The Person being renamed, and the name being typed. */
  let byterNamn = $state<string | undefined>();
  let nyttNamn = $state("");
  /** The Person being removed, and who takes over their Scopes. */
  let tarBort = $state<PersonVy | undefined>();
  let nyÄgare = $state("");
  let radError = $state("");

  const aktiva = $derived((personer ?? []).filter((p) => p.aktiv));
  const inaktiva = $derived((personer ?? []).filter((p) => !p.aktiv));
  const visade = $derived(visaInaktiva ? (personer ?? []) : aktiva);
  const namnPå = (id: string | null) =>
    id === null ? "Någon utan namn" : (personer?.find((p) => p.id === id)?.namn ?? "Okänd");

  async function load() {
    try {
      const [p, h, rader] = await Promise.all([laddaPersoner(), api.personerHistorik(), api.personerÖversikt()]);
      personer = p;
      historik = h.reverse();
      last = Object.fromEntries(rader.map((r) => [r.id, r]));
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Kunde inte läsa in";
    }
  }
  load();

  const meddelande = (e: unknown) => (e instanceof Error ? e.message : "Något gick fel");

  async function läggTill(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = "";
    inaktivTräff = undefined;
    try {
      // The first Person is added without a Signatur; every later one is signed.
      if ((await laddaPersoner()).length === 0) await api.createPerson(namn, null);
      else await signatur.signera((vem) => api.createPerson(namn, vem));
      namn = "";
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.fel === "finns-inaktiv") inaktivTräff = e.person;
      if (!inaktivTräff) error = meddelande(e);
    } finally {
      busy = false;
    }
  }

  async function återaktivera(p: PersonVy) {
    busy = true;
    error = radError = "";
    try {
      await signatur.signera((vem) => api.reactivatePerson(p.id, vem));
      if (inaktivTräff?.id === p.id) {
        inaktivTräff = undefined;
        namn = "";
      }
      await load();
    } catch (e) {
      radError = meddelande(e);
    } finally {
      busy = false;
    }
  }

  function börjaByta(p: PersonVy) {
    tarBort = undefined;
    radError = "";
    byterNamn = p.id;
    nyttNamn = p.namn;
  }

  async function sparaNamn(event: SubmitEvent, p: PersonVy) {
    event.preventDefault();
    busy = true;
    radError = "";
    try {
      if (nyttNamn.trim() !== p.namn) await signatur.signera((vem) => api.renamePerson(p.id, nyttNamn, vem));
      byterNamn = undefined;
      await load();
    } catch (e) {
      radError = meddelande(e);
    } finally {
      busy = false;
    }
  }

  function börjaTaBort(p: PersonVy) {
    byterNamn = undefined;
    radError = "";
    tarBort = p;
    nyÄgare = "";
  }

  async function bekräftaTaBort(event: SubmitEvent) {
    event.preventDefault();
    const p = tarBort;
    if (!p || !nyÄgare) return;
    busy = true;
    radError = "";
    try {
      await signatur.signera((vem) => api.removePerson(p.id, nyÄgare, vem));
      tarBort = undefined;
      await load();
    } catch (e) {
      radError = meddelande(e);
    } finally {
      busy = false;
    }
  }

  const VAD: Record<PersonHändelse["typ"], string> = {
    [PERSON_HÄNDELSE_TYP.ny]: "lade till",
    [PERSON_HÄNDELSE_TYP.bytNamn]: "bytte namn på",
    [PERSON_HÄNDELSE_TYP.taBort]: "tog bort",
    [PERSON_HÄNDELSE_TYP.återaktivera]: "återaktiverade",
  };
  const tidFormat = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" });
</script>

<svelte:head><title>Personer · Apogee</title></svelte:head>

<div class="page">
  <div class="crumbs">Inställningar</div>
  <h1>Personer</h1>
  {#if personer}
    <div class="meta">
      {aktiva.length} {aktiva.length === 1 ? "Person" : "Personer"}{#if inaktiva.length}, {inaktiva.length} inaktiva{/if}
    </div>
  {/if}

  <form onsubmit={läggTill}>
    <label>
      <span class="cap">Lägg till en Person</span>
      <input bind:value={namn} maxlength="200" required placeholder="Namn" oninput={() => (inaktivTräff = undefined)} />
    </label>
    <button class="pr" disabled={busy}>Lägg till</button>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if inaktivTräff}
      {@const träff = inaktivTräff}
      <p class="offer" role="alert">
        {träff.namn} finns redan men är inaktiv.
        <button type="button" disabled={busy} onclick={() => återaktivera(träff)}>Återaktivera {träff.namn}</button>
      </p>
    {/if}
  </form>

  {#if loadError}
    <p class="error">{loadError}</p>
  {:else if personer && personer.length === 0}
    <p class="empty">
      Inga Personer ännu. Lägg till dig själv först; sedan signeras varje ändring med en Person.
    </p>
  {:else if personer}
    {#if inaktiva.length}
      <button
        type="button"
        class="quiet toggle"
        class:on={visaInaktiva}
        aria-pressed={visaInaktiva}
        onclick={() => (visaInaktiva = !visaInaktiva)}>Visa inaktiva ({inaktiva.length})</button
      >
    {/if}
    {#if radError}<p class="error" role="alert">{radError}</p>{/if}
    <ul>
      {#each visade as p (p.id)}
        <li class:inaktiv={!p.aktiv}>
          {#if byterNamn === p.id}
            <form class="rad" onsubmit={(e) => sparaNamn(e, p)}>
              <input bind:value={nyttNamn} maxlength="200" required aria-label="Nytt namn för {p.namn}" />
              <button class="pr" disabled={busy}>Spara</button>
              <button type="button" class="quiet" onclick={() => (byterNamn = undefined)}>Avbryt</button>
            </form>
          {:else}
            <span class="namn">
              {#if p.aktiv}<a href={personHref(p)} title="Stjärnkarta för {p.namn}">{p.namn}</a>{:else}{p.namn}{/if}
              {#if !p.aktiv}<span class="meta">(inaktiv)</span>{/if}
              {#if p.id === signatur.person?.id}<span class="meta">Din signatur</span>{/if}
            </span>
            {@const rad = last[p.id]}
            {#if rad && p.aktiv}
              <span class="last">
                <span class="meta">
                  {rad.räkning.scopes} Scopes i {rad.räkning.projekt} Projekt{#if rad.räkning.stilla}
                    · <span class="stilla">{rad.räkning.stilla} stilla</span>{/if}
                </span>
                <span class="strip" aria-hidden="true">
                  {#each rad.lägen as l, i (i)}
                    <span class="dot" class:stilla={l.stilla} style:left="{l.läge}%" style:background={lägeFärg(l.läge, tema.nu)}
                    ></span>
                  {/each}
                </span>
              </span>
            {/if}
            <span class="actions">
              {#if p.aktiv}
                <button type="button" class="quiet" onclick={() => börjaByta(p)}>Byt namn</button>
                <button type="button" class="quiet" onclick={() => börjaTaBort(p)}>Ta bort</button>
              {:else}
                <button type="button" class="quiet" disabled={busy} onclick={() => återaktivera(p)}>Återaktivera</button>
              {/if}
            </span>
          {/if}
          {#if tarBort?.id === p.id}
            <form class="handover" onsubmit={bekräftaTaBort} aria-label="Ta bort {p.namn}">
              <p>
                {p.namn}s Scopes i Pågående Projekt går till en ny Ägare. Scopes i Avslutade och
                Borttagna Projekt behåller {p.namn}. {p.namn} blir inaktiv och kan återaktiveras.
              </p>
              <label>
                <span class="cap">Ny Ägare</span>
                <select bind:value={nyÄgare} required>
                  <option value="" disabled>Välj Person</option>
                  {#each aktiva.filter((x) => x.id !== p.id) as x (x.id)}<option value={x.id}>{x.namn}</option>{/each}
                </select>
              </label>
              <button class="pr" disabled={busy || !nyÄgare}>Ta bort {p.namn}</button>
              <button type="button" class="quiet" onclick={() => (tarBort = undefined)}>Avbryt</button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>

    <h2>Personer-historik</h2>
    {#if historik.length === 0}
      <p class="meta">Inga ändringar ännu.</p>
    {:else}
      <ol class="historik">
        {#each historik as h (h.id)}
          <li>
            <span>
              <strong>{namnPå(h.vem)}</strong>
              {VAD[h.typ]}
              {#if h.typ === PERSON_HÄNDELSE_TYP.bytNamn}
                <strong>{h.förraNamn}</strong> → <strong>{h.nyttNamn}</strong>
              {:else}
                <strong>{h.nyttNamn}</strong>
              {/if}
              {#if h.nyÄgare}<span class="meta">· Scopes till {namnPå(h.nyÄgare)}</span>{/if}
            </span>
            <time class="meta" datetime={h.tid}>{tidFormat.format(new Date(h.tid))}</time>
          </li>
        {/each}
      </ol>
    {/if}
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
  .offer {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .toggle {
    margin-top: 20px;
  }
  .toggle.on {
    border-color: var(--btn);
    color: var(--tx);
  }
  ul,
  ol {
    list-style: none;
    padding: 0;
    margin-top: 16px;
    border-top: 1px solid var(--line);
    max-width: 640px;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }
  .namn {
    font-weight: 600;
  }
  .namn {
    min-width: 180px;
  }
  .namn a {
    text-decoration: none;
  }
  .namn a:hover {
    text-decoration: underline;
  }
  .last {
    flex: 1 1 180px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 260px;
  }
  .last .stilla {
    color: var(--redtx);
  }
  .strip {
    position: relative;
    height: 14px;
    margin: 0 4px;
    border-bottom: 1px solid var(--grid);
  }
  .dot {
    position: absolute;
    top: 3px;
    width: 8px;
    height: 8px;
    margin-left: -4px;
    border-radius: 50%;
  }
  .dot.stilla {
    outline: 1px dashed var(--red);
    outline-offset: 2px;
  }
  .inaktiv .namn {
    color: var(--dim);
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  form.rad,
  form.handover {
    margin: 0;
    flex: 1 1 100%;
    align-items: center;
  }
  form.rad input {
    flex: 1 1 200px;
    max-width: 320px;
  }
  form.handover {
    padding: 12px;
    background: var(--panel);
    border: 1px solid var(--line);
    align-items: flex-end;
  }
  h2 {
    font: 600 20px Barlow, system-ui, sans-serif;
    margin-top: 48px;
  }
  .historik li {
    font-size: 14px;
  }
</style>
