<script lang="ts">
  // The "borttaget" page (#40): an old link to a Borttagen Projekt or
  // Funktionsområde says so, offers "Återställ" right here when it can be
  // restored on its own (#62), and keeps the Borttagna list as the secondary
  // way. An empty, dimmed graduated grid with the orbit sits behind the text,
  // so the page still belongs to the Stjärnatlas. (#43's embed shows the same
  // for a Borttagen Projekt.)
  import type { BorttagenVy } from "../../core/index.js";
  import HillChart from "./HillChart.svelte";
  import { felText } from "../lib/fel.js";
  import { Avbruten } from "../lib/signatur.svelte.js";
  import { tema } from "../lib/tema.svelte.js";

  type Props = {
    /** "Projektet är borttaget" / "Funktionsområdet är borttaget". */
    rubrik: string;
    namn: string;
    borttagen: BorttagenVy;
    /** Where the Borttagna list is, and what to call the link. */
    lista: { href: string; text: string };
    /** The same signed command as "Återställ" in the Borttagna list; omitted when it cannot be restored here. */
    onåterställ?: () => Promise<unknown>;
  };
  let { rubrik, namn, borttagen, lista, onåterställ }: Props = $props();

  const datum = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" });

  let upptagen = $state(false);
  let fel = $state("");

  async function återställ() {
    if (!onåterställ) return;
    upptagen = true;
    fel = "";
    try {
      await onåterställ();
    } catch (e) {
      if (!(e instanceof Avbruten)) fel = felText(e, "Kunde inte återställa");
    } finally {
      upptagen = false;
    }
  }
</script>

<div class="borttaget">
  <div class="bakgrund" aria-hidden="true" inert>
    <HillChart namn={namn} scopes={[]} tema={tema.nu} />
  </div>
  <div class="page">
    <h1>{rubrik}</h1>
    <p class="meta">
      <strong>{namn}</strong> togs bort av {borttagen.vem.namn}{#if !borttagen.vem.aktiv}{" "}(inaktiv){/if}
      {datum.format(new Date(borttagen.tid))}.
    </p>
    <p class="handlingar">
      {#if onåterställ}
        <button class="pr" disabled={upptagen} onclick={återställ}>Återställ</button>
      {/if}
      <a href={lista.href}>{lista.text}</a>
    </p>
    {#if fel}<p class="error" role="alert">{fel}</p>{/if}
  </div>
</div>

<style>
  .borttaget {
    position: relative;
    overflow: hidden;
    min-height: calc(100vh - 56px);
  }
  /* The empty chart, dimmed, behind the text: recognition, not content. */
  .bakgrund {
    position: absolute;
    inset: 24px 0 auto;
    max-width: 1100px;
    margin: 0 auto;
    opacity: 0.3;
    pointer-events: none;
  }
  .page {
    position: relative;
  }
  p {
    margin-top: 12px;
  }
  .handlingar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    margin-top: 20px;
  }
</style>
