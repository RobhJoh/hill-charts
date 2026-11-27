<script lang="ts">
  // "Kopiera länk": copies the clean canonical URL (current name, no query
  // string). Where the clipboard is unavailable (e.g. inside some iframes) the
  // URL is shown selected instead, for copying by hand.
  // With knapp={false} the page's Mer menu calls kopiera() and only the receipt shows.
  let { href, knapp = true }: { href: string; knapp?: boolean } = $props();

  let läge = $state<"vila" | "kopierad" | "visa">("vila");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const url = $derived(location.origin + href);

  export async function kopiera() {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(url);
      läge = "kopierad";
      timer = setTimeout(() => (läge = "vila"), 1800);
    } catch {
      läge = "visa";
    }
  }

  $effect(() => () => clearTimeout(timer));
</script>

{#if läge === "visa"}
  <span class="visa">
    <input
      readonly
      value={url}
      aria-label="Länk att kopiera"
      onfocus={(e) => e.currentTarget.select()}
      {@attach (el) => el.select()}
    />
    <button class="quiet" onclick={() => (läge = "vila")}>Stäng</button>
  </span>
{:else if !knapp}
  <span class="kvitto" role="status">{läge === "kopierad" ? "Länken är kopierad" : ""}</span>
{:else}
  <button class="quiet" onclick={kopiera} aria-live="polite">
    {läge === "kopierad" ? "Kopierad" : "Kopiera länk"}
  </button>
{/if}

<style>
  .visa {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .kvitto {
    font-size: 14px;
    color: var(--mid);
  }
  .kvitto:empty {
    display: none;
  }
  input {
    width: 22em;
    max-width: 60vw;
    padding: 4px 8px;
  }
</style>
