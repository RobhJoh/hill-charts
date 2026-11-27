<script lang="ts">
  // The dates (Appetit) and Milstolpar of a Projekt or Funktionsområde. The
  // dates come from Notion and are only shown (ADR 0003); Milstolpar are
  // edited here.
  import { dagarMellan, type Milstolpe, type Tidsplan } from "../../core/index.js";
  import { visaDatum } from "../lib/datum.js";
  import { Avbruten } from "../lib/signatur.svelte.js";

  let {
    tidsplan,
    varningar = [],
    onlägg,
    onändra,
    ontabort,
    knappar = true,
    skrivskyddad = false,
  }: {
    tidsplan: Tidsplan;
    /** Quiet warnings, e.g. "slutar efter Funktionsområdet". */
    varningar?: string[];
    onlägg: (m: { namn: string; datum: string }) => Promise<unknown>;
    onändra: (id: string, ändring: { namn: string; datum: string }) => Promise<unknown>;
    ontabort: (id: string) => Promise<unknown>;
    /** Show "Ny Milstolpe"; false when a Mer menu opens it instead (Q18 b). */
    knappar?: boolean;
    /** Milstolpar shown, not edited. */
    skrivskyddad?: boolean;
  } = $props();

  let öppen = $state<"inget" | "ny milstolpe" | string>("inget");
  let fel = $state("");

  // Milstolpe form (new or the one being edited)
  let mNamn = $state("");
  let mDatum = $state("");

  const appetitDagar = $derived(
    tidsplan.startdatum && tidsplan.slutdatum ? dagarMellan(tidsplan.startdatum, tidsplan.slutdatum) : null,
  );
  const appetitText = (dagar: number) =>
    dagar % 7 === 0 ? `${dagar / 7} ${dagar === 7 ? "vecka" : "veckor"}` : `${dagar} dagar`;

  async function kör(åtgärd: () => Promise<unknown>) {
    fel = "";
    try {
      await åtgärd();
      öppen = "inget";
    } catch (e) {
      if (e instanceof Error && !(e instanceof Avbruten)) fel = e.message;
    }
  }

  export function öppnaMilstolpe(m?: Milstolpe) {
    mNamn = m?.namn ?? "";
    mDatum = m?.datum ?? "";
    fel = "";
    öppen = m ? m.id : "ny milstolpe";
  }

  function sparaMilstolpe(event: SubmitEvent) {
    event.preventDefault();
    const värden = { namn: mNamn, datum: mDatum };
    const id = öppen;
    void kör(() => (id === "ny milstolpe" ? onlägg(värden) : onändra(id, värden)));
  }
</script>

<div class="tidsplan">
  <div class="rad">
    {#if tidsplan.startdatum || tidsplan.slutdatum}
      <span>
        {#if tidsplan.startdatum}{visaDatum(tidsplan.startdatum)} –{:else}Slutdatum{/if}
        {tidsplan.slutdatum ? visaDatum(tidsplan.slutdatum) : ""}
        {#if appetitDagar !== null}<span class="dim">· Appetit {appetitText(appetitDagar)}</span>{/if}
      </span>
    {:else}
      <span class="dim">Inga datum</span>
    {/if}
    {#each varningar as v (v)}<span class="varning">{v}</span>{/each}
    {#if knappar && !skrivskyddad}
      <button class="quiet" onclick={() => öppnaMilstolpe()}>Ny Milstolpe</button>
    {/if}
  </div>

  {#if öppen === "ny milstolpe"}
    {@render milstolpeForm()}
  {/if}

  {#if tidsplan.milstolpar.length > 0}
    <ul class="milstolpar">
      {#each tidsplan.milstolpar as m (m.id)}
        <li>
          {#if öppen === m.id}
            {@render milstolpeForm()}
          {:else}
            <span>◆ {m.namn}</span>
            <span class="dim">{visaDatum(m.datum)}</span>
            {#if !skrivskyddad}
              <button class="quiet" onclick={() => öppnaMilstolpe(m)}>Ändra</button>
              <button class="quiet" onclick={() => kör(() => ontabort(m.id))}>Ta bort</button>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#if fel}<p class="error" role="alert">{fel}</p>{/if}
</div>

{#snippet milstolpeForm()}
  <form onsubmit={sparaMilstolpe}>
    <label>
      <span class="cap">Milstolpe</span>
      <input bind:value={mNamn} required maxlength="200" placeholder="t.ex. Acceptanstest" />
    </label>
    <label>
      <span class="cap">Datum</span>
      <input type="date" bind:value={mDatum} required />
    </label>
    <button class="pr">Spara</button>
    <button type="button" onclick={() => (öppen = "inget")}>Avbryt</button>
  </form>
{/snippet}

<style>
  .tidsplan {
    margin-top: 10px;
    font-size: 14px;
  }
  .rad {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  .dim {
    color: var(--dim);
  }
  .varning {
    color: var(--mid);
    font-style: italic;
  }
  .varning::before {
    content: "· ";
  }
  form {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 10px;
    margin: 12px 0;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .milstolpar {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  .milstolpar li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 4px 0;
    border-top: 1px solid var(--line);
  }
</style>
