<script lang="ts">
  // "Bädda in" (#43): hands out the Notion embed URL (the Projekt URL plus
  // /embed) together with a link line to paste below the embed, since Notion's
  // phone apps never show embeds. The link line is copied as a rich link (with
  // a plain-text fallback), so Notion pastes it as "Namn · Apogee".
  // With knapp={false} the page's Mer menu opens the panel (bind öppen).
  let {
    namn,
    href,
    öppen = $bindable(false),
    knapp = true,
  }: { namn: string; href: string; öppen?: boolean; knapp?: boolean } = $props();

  let kopierad = $state<"embed" | "rad" | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const url = $derived(location.origin + href);
  const embedUrl = $derived(url + "/embed");
  const radText = $derived(`${namn} · Apogee`);

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function klar(vad: "embed" | "rad") {
    kopierad = vad;
    clearTimeout(timer);
    timer = setTimeout(() => (kopierad = null), 1800);
  }

  async function kopieraEmbed() {
    try {
      await navigator.clipboard.writeText(embedUrl);
      klar("embed");
    } catch {
      // No clipboard (e.g. in some iframes): the field is selectable by hand.
    }
  }

  async function kopieraRad() {
    const html = `<a href="${escape(url)}">${escape(radText)}</a>`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([`${radText} ${url}`], { type: "text/plain" }),
        }),
      ]);
      klar("rad");
    } catch {
      try {
        await navigator.clipboard.writeText(`${radText} ${url}`);
        klar("rad");
      } catch {
        // Selectable by hand.
      }
    }
  }

  $effect(() => () => clearTimeout(timer));
</script>

<span class="badda">
  {#if knapp}
    <button class="quiet" aria-expanded={öppen} onclick={() => (öppen = !öppen)}>Bädda in</button>
  {/if}
  {#if öppen}
    <div class="panel" role="dialog" aria-label="Bädda in i Notion">
      <p class="rubrik">Bädda in i Notion</p>
      <label>
        <span class="cap">1. Klistra in i Notion och välj Create embed</span>
        <span class="rad">
          <input
            readonly
            value={embedUrl}
            onfocus={(e) => e.currentTarget.select()}
            {@attach (el) => {
              if (!knapp) el.focus();
            }}
          />
          <button class="quiet" onclick={kopieraEmbed}>{kopierad === "embed" ? "Kopierad" : "Kopiera"}</button>
        </span>
      </label>
      <div class="lbl">
        <span class="cap">2. Klistra in länken under, för Notions mobilappar som inte visar inbäddningar</span>
        <span class="rad">
          <a class="länk" href={url} target="_blank" rel="noopener">{radText}</a>
          <button class="quiet" onclick={kopieraRad}>{kopierad === "rad" ? "Kopierad" : "Kopiera"}</button>
        </span>
      </div>
      <button class="quiet stäng" onclick={() => (öppen = false)}>Stäng</button>
    </div>
  {/if}
</span>

<style>
  .badda {
    position: relative;
    display: inline-block;
  }
  .panel {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 4;
    width: min(440px, 90vw);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid var(--btn);
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
  }
  .rubrik {
    font-weight: 600;
  }
  label,
  .lbl {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cap {
    font-size: 13px;
    color: var(--dim);
  }
  .rad {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
  }
  .länk {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .stäng {
    align-self: flex-end;
  }
</style>
