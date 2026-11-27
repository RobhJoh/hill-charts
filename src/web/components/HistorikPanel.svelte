<script lang="ts">
  import { felText } from "../lib/fel.js";
  // The Historik panel: a Projekt's Uppdateringar newest first (consecutive
  // drags merged into one "N drag" row), each with Visa and (on single rows)
  // Ångra bara denna, shown on hover, focus or the chosen row (tap on a phone).
  // Återställ hit is only in the parent's Visa banner (Q7 a), so the chart is
  // always seen before it is restored. Reads the rows itself; writes and the
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
    onångra: (uppdateringId: string) => Promise<unknown>;
    onstäng: () => void;
  } = $props();

  let rader = $state<HistorikRad<PersonVy>[]>([]);
  let laddar = $state(true);
  let fel = $state("");
  let felRad = $state<string | null>(null);
  let upptagen = $state(false);
  /** The row whose actions are shown after a click or tap on it. */
  let vald = $state<string | null>(null);

  $effect(() => {
    void version;
    api
      .historikVy(projektId)
      .then((r) => (rader = r))
      .catch((e) => (fel = felText(e, "Kunde inte läsa Historiken")))
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
      fel = felText(e);
      felRad = radId;
    } finally {
      upptagen = false;
    }
  }
</script>

<section class="historik" aria-label="Historik">
  <div class="topp">
    <h2>Historik</h2>
    <button class="quiet" onclick={onstäng}>← Scopes</button>
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
      <li class:visad={rad.id === visad} class:vald={rad.id === vald} class:bort={rad.bortåterställd}>
        <button
          class="rad"
          aria-expanded={rad.id === vald || rad.id === visad}
          onclick={() => (vald = vald === rad.id ? null : rad.id)}
        >
          <span class="vad">
            <strong>{rad.vem?.namn ?? UTAN_NAMN}</strong>
            {beskrivRad(rad, namn)}
            {#if rad.antal > 1}<span class="tag">{rad.antal} drag</span>{/if}
            {#if rad.bortåterställd}<span class="tag">bortåterställd</span>{/if}
            {#if rad.ångrad}<span class="tag">ångrad</span>{/if}
          </span>
          <span class="meta"><time datetime={rad.tid}>{visaTid(rad.tid)}</time></span>
        </button>
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
  /* The row itself is the control that shows its actions (a tap on a phone). */
  .rad {
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    text-align: left;
    font-weight: 400;
    font-size: 15px;
  }
  .vad {
    display: block;
    line-height: 1.4;
  }
  .meta {
    display: block;
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
  /* Actions only on hover, focus or the chosen row (Q7 a): no wall of buttons. */
  .knappar {
    display: none;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  ol > li:focus-within .knappar,
  ol > li.vald .knappar,
  ol > li.visad .knappar {
    display: flex;
  }
  /* With a mouse the actions sit over the row's lower right corner, so rows
     don't jump as the pointer moves down the list. */
  @media (hover: hover) {
    ol > li {
      position: relative;
    }
    ol > li:hover .knappar {
      display: flex;
    }
    .knappar {
      position: absolute;
      right: 0;
      bottom: 8px;
      margin: 0;
      background: var(--panel);
    }
    ol > li.visad .knappar {
      right: 10px;
      background: var(--sel);
    }
  }
</style>
