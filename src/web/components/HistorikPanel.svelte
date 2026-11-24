<script lang="ts">
  // The Historik panel: a Projekt's Uppdateringar newest first (consecutive
  // drags merged into one "N drag" row), each with Visa, Återställ hit and
  // (on single rows) Ångra bara denna. Reads the rows itself; writes and the
  // Visa preview are the parent's callbacks, so the parent can sign, reload
  // and show the preview on its chart.
  import type { HistorikRad, PersonVy } from "../../core/index.js";
  import { api } from "../lib/api.js";
  import { Avbruten } from "../lib/signatur.svelte.js";
  import { beskrivAlla, beskrivRad, UTAN_NAMN, visaTid } from "../lib/historik.js";

  let {
    projektId,
    personer,
    version,
    visad = null,
    onvisa,
    onåterställ,
    onångra,
    onstäng,
  }: {
    projektId: string;
    personer: PersonVy[];
    /** Changes whenever the chart changes; the rows are re-read then. */
    version: unknown;
    /** The Uppdatering being previewed with Visa, if any. */
    visad?: string | null;
    onvisa: (rad: HistorikRad<PersonVy> | null) => void;
    onåterställ: (uppdateringId: string) => Promise<unknown>;
    onångra: (uppdateringId: string) => Promise<unknown>;
    onstäng: () => void;
  } = $props();

  let rader = $state<HistorikRad<PersonVy>[]>([]);
  let laddar = $state(true);
  let fel = $state("");
  let felRad = $state<string | null>(null);
  let upptagen = $state(false);

  $effect(() => {
    void version;
    api
      .historikVy(projektId)
      .then((r) => (rader = r))
      .catch((e) => (fel = e instanceof Error ? e.message : "Kunde inte läsa Historiken"))
      .finally(() => (laddar = false));
  });

  const namn = (id: string) => personer.find((p) => p.id === id)?.namn ?? "Okänd";

  async function kör(radId: string, arbete: () => Promise<unknown>) {
    upptagen = true;
    fel = "";
    felRad = null;
    try {
      await arbete();
    } catch (e) {
      if (e instanceof Avbruten) return;
      fel = e instanceof Error ? e.message : "Något gick fel";
      felRad = radId;
    } finally {
      upptagen = false;
    }
  }
</script>

<section class="historik" aria-label="Historik">
  <div class="topp">
    <h2>Historik</h2>
    <button class="quiet" onclick={onstäng}>Stäng</button>
  </div>

  {#if laddar}
    <p class="meta">Läser in …</p>
  {:else if rader.length === 0}
    <p class="meta">Inga Uppdateringar än.</p>
  {/if}
  {#if fel && felRad === null}<p class="error" role="alert">{fel}</p>{/if}

  <ol>
    {#each rader as rad (rad.id)}
      {@const alla = beskrivAlla(rad, namn)}
      <li class:visad={rad.id === visad} class:bort={rad.bortåterställd}>
        <p class="vad">
          <strong>{rad.vem?.namn ?? UTAN_NAMN}</strong>
          {beskrivRad(rad, namn)}
          {#if rad.antal > 1}<span class="tag">{rad.antal} drag</span>{/if}
          {#if rad.bortåterställd}<span class="tag">bortåterställd</span>{/if}
          {#if rad.ångrad}<span class="tag">ångrad</span>{/if}
        </p>
        <p class="meta"><time datetime={rad.tid}>{visaTid(rad.tid)}</time></p>
        {#if alla.length > 1}
          <details>
            <summary>{alla.length} ändringar</summary>
            <ul>
              {#each alla as text, i (i)}
                <li>{text}</li>
              {/each}
            </ul>
          </details>
        {/if}
        <div class="knappar">
          {#if rad.id === visad}
            <button class="quiet" onclick={() => onvisa(null)}>Dölj</button>
          {:else}
            <button class="quiet" onclick={() => onvisa(rad)}>Visa</button>
          {/if}
          <button class="quiet" disabled={upptagen} onclick={() => kör(rad.id, () => onåterställ(rad.id))}>
            Återställ hit
          </button>
          {#if rad.kanÅngras}
            <button class="quiet" disabled={upptagen} onclick={() => kör(rad.id, () => onångra(rad.id))}>
              Ångra bara denna
            </button>
          {/if}
        </div>
        {#if fel && felRad === rad.id}<p class="error" role="alert">{fel}</p>{/if}
      </li>
    {/each}
  </ol>
</section>

<style>
  .topp {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  ol {
    list-style: none;
    margin: 16px 0 0;
    padding: 0;
  }
  ol > li {
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  ol > li.visad {
    background: var(--sel);
    margin: 0 -10px;
    padding: 12px 10px;
  }
  ol > li.bort .vad {
    color: var(--mid);
  }
  .vad {
    margin: 0;
    line-height: 1.4;
  }
  .meta {
    margin: 2px 0 0;
  }
  .tag {
    display: inline-block;
    margin-left: 4px;
    padding: 0 6px;
    border: 1px solid var(--line);
    border-radius: 9px;
    font-size: 12px;
    color: var(--mid);
  }
  details {
    margin-top: 6px;
    color: var(--mid);
    font-size: 14px;
  }
  details ul {
    margin: 4px 0 0;
    padding-left: 18px;
  }
  .knappar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
</style>
