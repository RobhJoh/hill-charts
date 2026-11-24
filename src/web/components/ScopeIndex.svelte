<script lang="ts">
  // The Scope index beside the Hill chart: Namn, Ägare and Läge, highest Läge
  // first, with the colour legend. Rows edit Namn and Ägare and remove a
  // Scope; the "Ny Scope" form adds one. Writes are the parent's callbacks.
  import type { PersonVy, ScopeVy } from "../../core/index.js";
  import { lägeFärg, rampGradient, type Tema } from "../lib/hill.js";

  let {
    scopes,
    personer,
    tema,
    valt = null,
    nyScope = $bindable(false),
    onvälj,
    onlägg,
    onbytnamn,
    onbytägare,
    ontabort,
  }: {
    scopes: ScopeVy[];
    /** All Personer; only active ones can be chosen as Ägare. */
    personer: PersonVy[];
    tema: Tema;
    valt?: string | null;
    /** Whether the "Ny Scope" form is open. */
    nyScope?: boolean;
    onvälj: (id: string | null) => void;
    onlägg: (namn: string, ägare: string) => Promise<unknown>;
    onbytnamn: (id: string, namn: string) => Promise<unknown>;
    onbytägare: (id: string, ägare: string) => Promise<unknown>;
    ontabort: (id: string) => Promise<unknown>;
  } = $props();

  const aktiva = $derived(personer.filter((p) => p.aktiv));

  let nyNamn = $state("");
  let nyÄgare = $state("");
  let byterNamn = $state<string | null>(null);
  let namnUtkast = $state("");
  let fel = $state("");
  let upptagen = $state(false);

  async function kör(arbete: () => Promise<unknown>): Promise<boolean> {
    upptagen = true;
    fel = "";
    try {
      await arbete();
      return true;
    } catch (e) {
      fel = e instanceof Error ? e.message : "Något gick fel";
      return false;
    } finally {
      upptagen = false;
    }
  }

  async function lägg(event: SubmitEvent) {
    event.preventDefault();
    if (await kör(() => onlägg(nyNamn, nyÄgare))) {
      nyNamn = "";
      nyÄgare = "";
      nyScope = false;
    }
  }

  function börjaByta(s: ScopeVy) {
    byterNamn = s.id;
    namnUtkast = s.namn;
    fel = "";
  }

  async function bytNamn(event: SubmitEvent, s: ScopeVy) {
    event.preventDefault();
    if (await kör(() => onbytnamn(s.id, namnUtkast))) byterNamn = null;
  }
</script>

<section class="index" aria-label="Scopes">
  {#if nyScope}
    <form class="ny" onsubmit={lägg}>
      <label>
        <span class="cap">Namn</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input bind:value={nyNamn} required maxlength="200" autofocus />
      </label>
      <label>
        <span class="cap">Ägare</span>
        <select bind:value={nyÄgare} required>
          <option value="" disabled>Välj Ägare …</option>
          {#each aktiva as p (p.id)}<option value={p.id}>{p.namn}</option>{/each}
        </select>
      </label>
      {#if aktiva.length === 0}
        <p class="meta">Lägg till Personer under <a href="/installningar/personer">Inställningar</a> först.</p>
      {/if}
      <div class="knappar">
        <button class="pr" disabled={upptagen || !nyNamn.trim() || !nyÄgare}>Lägg till</button>
        <button type="button" onclick={() => (nyScope = false)}>Avbryt</button>
      </div>
    </form>
  {/if}

  {#if fel}<p class="error" role="alert">{fel}</p>{/if}

  {#if scopes.length === 0}
    <p class="meta tom">Inga Scopes ännu.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th scope="col"><span class="sr">Färg</span></th>
          <th scope="col">Namn</th>
          <th scope="col">Ägare</th>
          <th scope="col" class="num">Läge</th>
        </tr>
      </thead>
      <tbody>
        {#each scopes as s (s.id)}
          <tr class:valt={s.id === valt}>
            <td><span class="dot" style:background={lägeFärg(s.läge, tema)}></span></td>
            <td class="namn">
              {#if byterNamn === s.id}
                <form onsubmit={(e) => bytNamn(e, s)}>
                  <!-- svelte-ignore a11y_autofocus -->
                  <input
                    bind:value={namnUtkast}
                    aria-label="Nytt namn på {s.namn}"
                    required
                    maxlength="200"
                    autofocus
                    onkeydown={(e) => e.key === "Escape" && (byterNamn = null)}
                  />
                </form>
              {:else}
                <button class="länk" onclick={() => onvälj(s.id === valt ? null : s.id)} aria-pressed={s.id === valt}>
                  {s.namn}
                </button>
              {/if}
            </td>
            <td>
              <select
                value={s.ägare.id}
                aria-label="Ägare för {s.namn}"
                disabled={upptagen}
                onchange={(e) => {
                  const ny = e.currentTarget.value;
                  e.currentTarget.value = s.ägare.id; // shown again from the reloaded Scope
                  kör(() => onbytägare(s.id, ny));
                }}
              >
                {#if !s.ägare.aktiv}
                  <option value={s.ägare.id} disabled>{s.ägare.namn} (inaktiv)</option>
                {/if}
                {#each aktiva as p (p.id)}<option value={p.id}>{p.namn}</option>{/each}
              </select>
            </td>
            <td class="num">{s.läge}{#if s.stilla}<span class="stilla" title="Ingen rörelse på {s.stillaDagar} dagar">{s.stillaDagar} d</span>{/if}</td>
          </tr>
          {#if s.id === valt}
            <tr class="valt åtg">
              <td></td>
              <td colspan="3">
                {#if byterNamn === s.id}
                  <button class="quiet" onclick={() => (byterNamn = null)}>Avbryt</button>
                {:else}
                  <button class="quiet" onclick={() => börjaByta(s)} aria-label="Byt namn på {s.namn}">Byt namn</button>
                  <button class="quiet" onclick={() => kör(() => ontabort(s.id))} aria-label="Ta bort {s.namn}">
                    Ta bort
                  </button>
                {/if}
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}

  <div class="legend">
    <span class="cap">Läge</span>
    <div class="bar" style:background={rampGradient(tema)}></div>
    <div class="ticks"><span>0 uppför</span><span>50 krön</span><span>100 klar</span></div>
  </div>
  <p class="meta">Dra en stjärna längs banan för att ändra dess Läge, eller markera den och använd piltangenterna.</p>
</section>

<style>
  .index {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .ny {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--line);
  }
  .ny label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .knappar {
    display: flex;
    gap: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
    text-align: left;
    font-weight: 600;
    font-size: 13px;
    color: var(--dim);
    padding: 0 6px 8px;
    border-bottom: 1px solid var(--line);
  }
  td {
    padding: 6px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
  }
  tr.valt td {
    background: var(--sel);
  }
  .num {
    text-align: right;
    white-space: nowrap;
  }
  .stilla {
    display: block;
    font-size: 12px;
    color: var(--redtx);
  }
  .dot {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .namn {
    width: 100%;
  }
  .namn input {
    width: 100%;
    padding: 4px 6px;
  }
  .länk {
    border: none;
    padding: 0;
    font: 500 14px Barlow, system-ui, sans-serif;
    text-align: left;
  }
  .länk:hover {
    text-decoration: underline;
  }
  td select {
    padding: 3px 4px;
    max-width: 120px;
    background: transparent;
    border-color: transparent;
  }
  td select:hover {
    border-color: var(--btn);
  }
  tr.valt:has(+ tr.åtg) td {
    border-bottom: none;
  }
  .åtg td {
    padding-top: 0;
  }
  .åtg button {
    font-size: 13px;
    padding: 2px 6px;
  }
  .legend .bar {
    height: 8px;
    margin: 6px 0 4px;
  }
  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--dim);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
