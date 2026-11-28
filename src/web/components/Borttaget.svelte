<script lang="ts">
  // The "borttaget" page (#40): an old link to a Borttagen Projekt or
  // Funktionsområde says so and links to the Borttagna list. It comes back by
  // itself when it returns in Notion (#76). An empty, dimmed graduated grid with the orbit sits behind the text,
  // so the page still belongs to the Stjärnatlas. (#43's embed shows the same
  // for a Borttagen Projekt.)
  import type { BorttagenVy } from "../../core/index.js";
  import HillChart from "./HillChart.svelte";
  import { tema } from "../lib/tema.svelte.js";

  type Props = {
    /** "Projektet är borttaget" / "Funktionsområdet är borttaget". */
    rubrik: string;
    namn: string;
    borttagen: BorttagenVy;
    /** Where the Borttagna list is, and what to call the link. */
    lista: { href: string; text: string };
  };
  let { rubrik, namn, borttagen, lista }: Props = $props();

  const datum = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" });
</script>

<div class="borttaget">
  <div class="bakgrund" aria-hidden="true" inert>
    <HillChart namn={namn} scopes={[]} tema={tema.nu} />
  </div>
  <div class="page">
    <h1>{rubrik}</h1>
    <p class="meta">
      <strong>{namn}</strong> finns inte längre i Notion sedan {datum.format(new Date(borttagen.tid))}. Det kommer
      tillbaka av sig självt när det kryssas i igen.
    </p>
    <p class="handlingar">
      <a href={lista.href}>{lista.text}</a>
    </p>
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
