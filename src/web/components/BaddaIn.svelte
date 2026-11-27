<script lang="ts">
  // "Bädda in" (#43): hands out the Notion embed URL (the Projekt URL plus
  // /embed) together with a link line to paste below the embed, since Notion's
  // phone apps never show embeds. The link line is copied as a rich link (with
  // a plain-text fallback), so Notion pastes it as "Namn · Apogee".
  //
  // The panel is a modal <dialog> (#63): it sits in the top layer over a
  // blurred backdrop, centred on desktop and as a bottom sheet on phone, so it
  // never runs off a narrow screen. Escape and a click outside close it; focus
  // goes to the embed field on open and back to "Bädda in" on close.
  import { utanförRutan } from "../lib/popover.js";

  let { namn, href }: { namn: string; href: string } = $props();

  let öppen = $state(false);
  let dialog = $state<HTMLDialogElement>();
  let knapp = $state<HTMLButtonElement>();
  let fält = $state<HTMLInputElement>();
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

  function öppna() {
    dialog?.showModal();
    öppen = true;
    fält?.focus();
  }

  // Covers Stäng, Escape (the dialog's own cancel) and a click outside.
  function stängd() {
    öppen = false;
    knapp?.focus();
  }

  function klickIDialog(e: MouseEvent) {
    if (dialog && e.target === dialog && utanförRutan(dialog.getBoundingClientRect(), e)) dialog.close();
  }

  $effect(() => () => clearTimeout(timer));
</script>

<button class="quiet" aria-haspopup="dialog" aria-expanded={öppen} bind:this={knapp} onclick={öppna}>Bädda in</button>
<!-- Escape is handled by the dialog itself (cancel, then close); the click handler is only for the backdrop. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog class="panel" aria-labelledby="badda-rubrik" bind:this={dialog} onclose={stängd} onclick={klickIDialog}>
  <h2 class="rubrik" id="badda-rubrik">Bädda in i Notion</h2>
  <label>
    <span class="cap">1. Klistra in i Notion och välj Create embed</span>
    <span class="rad">
      <input readonly value={embedUrl} bind:this={fält} onfocus={(e) => e.currentTarget.select()} />
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
  <button class="quiet stäng" onclick={() => dialog?.close()}>Stäng</button>
</dialog>

<style>
  /* A modal in the top layer: centred on desktop, never wider than the
     screen minus 16 px on each side. */
  .panel {
    width: min(480px, calc(100vw - 32px));
    max-width: none;
    margin: auto; /* the global reset zeroes the dialog's own centring */
    padding: 14px 16px;
    color: var(--tx);
    background: var(--panel);
    border: 1px solid var(--btn);
    border-radius: 2px;
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
  }
  .panel[open] {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .panel::backdrop {
    background: rgb(0 0 0 / 0.3);
    -webkit-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
  }
  /* Phone: a bottom sheet held 16 px in from the page edges. */
  @media (max-width: 600px) {
    .panel {
      inset-inline: 16px;
      margin: auto 0 16px;
      width: auto;
    }
  }
  .rubrik {
    margin: 0;
    font-size: inherit;
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
