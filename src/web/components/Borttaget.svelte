<script lang="ts">
  // The "borttaget" page (#40): an old link to a Borttagen Projekt or
  // Funktionsområde says so and points to the Borttagna list where it can be
  // restored. No chart. (#43's embed shows the same for a Borttagen Projekt.)
  import type { BorttagenVy } from "../../core/index.js";

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

<div class="page">
  <h1>{rubrik}</h1>
  <p class="meta">
    <strong>{namn}</strong> togs bort av {borttagen.vem.namn}{#if !borttagen.vem.aktiv}{" "}(inaktiv){/if}
    {datum.format(new Date(borttagen.tid))}.
  </p>
  <p><a href={lista.href}>{lista.text}</a></p>
</div>

<style>
  p {
    margin-top: 12px;
  }
</style>
