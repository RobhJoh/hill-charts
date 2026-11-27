<script lang="ts">
  import { felText } from "../lib/fel.js";
  // "Ta bort" with an inline confirmation that says what goes. A blocked Ta
  // bort shows the reason from the core.
  import { Avbruten } from "../lib/signatur.svelte.js";

  type Props = {
    /** The confirmation, e.g. "Ta bort Kassan med 3 Scopes?" */
    fråga: string;
    ontabort: () => Promise<void>;
    /** The confirmation is showing; bind it when a Mer menu opens it. */
    öppen?: boolean;
    /** Show the "Ta bort" button; false when a Mer menu has it instead. */
    knapp?: boolean;
  };
  let { fråga, ontabort, öppen = $bindable(false), knapp = true }: Props = $props();

  let busy = $state(false);
  let fel = $state("");

  async function bekräfta() {
    busy = true;
    fel = "";
    try {
      await ontabort();
      öppen = false;
    } catch (e) {
      if (!(e instanceof Avbruten)) fel = felText(e);
    } finally {
      busy = false;
    }
  }
</script>

{#if öppen}
  <span class="fråga" role="group" aria-label="Bekräfta Ta bort">
    <span>{fråga} Det kan återställas.</span>
    <!-- Opened from a menu: focus goes to the decision. -->
    <button class="pr" disabled={busy} onclick={bekräfta} {@attach (el) => { if (!knapp) el.focus(); }}>Ta bort</button>
    <button onclick={() => ((öppen = false), (fel = ""))}>Avbryt</button>
    {#if fel}<span class="error" role="alert">{fel}</span>{/if}
  </span>
{:else if knapp}
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
