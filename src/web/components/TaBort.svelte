<script lang="ts">
  // "Ta bort" with an inline confirmation that says what goes. A blocked Ta
  // bort shows the reason from the core.
  import { Avbruten } from "../lib/signatur.svelte.js";

  type Props = {
    /** The confirmation, e.g. "Ta bort Kassan med 3 Scopes?" */
    fråga: string;
    ontabort: () => Promise<void>;
  };
  let { fråga, ontabort }: Props = $props();

  let öppen = $state(false);
  let busy = $state(false);
  let fel = $state("");

  async function bekräfta() {
    busy = true;
    fel = "";
    try {
      await ontabort();
      öppen = false;
    } catch (e) {
      if (!(e instanceof Avbruten)) fel = e instanceof Error ? e.message : "Något gick fel";
    } finally {
      busy = false;
    }
  }
</script>

{#if öppen}
  <span class="fråga" role="group" aria-label="Bekräfta Ta bort">
    <span>{fråga} Det kan återställas.</span>
    <button class="pr" disabled={busy} onclick={bekräfta}>Ta bort</button>
    <button onclick={() => ((öppen = false), (fel = ""))}>Avbryt</button>
    {#if fel}<span class="error" role="alert">{fel}</span>{/if}
  </span>
{:else}
  <button class="quiet" onclick={() => (öppen = true)}>Ta bort</button>
{/if}

<style>
  .fråga {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .error {
    flex-basis: 100%;
  }
</style>
