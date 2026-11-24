<script lang="ts">
  // Projekt as mini sky charts: name, Scope count and a red stuck count.
  // Avslutade Projekt are dimmed and say so.
  import type { ProjektRad } from "../../core/index.js";
  import { tema } from "../lib/tema.svelte.js";
  import { projektHref } from "../lib/links.js";
  import MiniHill from "./MiniHill.svelte";

  let {
    projekt,
    stor = false,
  }: {
    projekt: ProjektRad[];
    /** The Funktionsområde page shows the same cells at a larger size. */
    stor?: boolean;
  } = $props();
</script>

{#if projekt.length > 0}
  <div class="cells" class:stor>
    {#each projekt as p (p.id)}
      <a class="cell" class:avslutat={p.avslutat} href={projektHref(p)}>
        <MiniHill scopes={p.scopes} tema={tema.nu} width={stor ? 270 : 180} height={stor ? 75 : 50} />
        <b>{p.namn}</b>
        <span class="meta">
          {#if p.avslutat}Avslutat ·{/if}
          {p.scopes.length} Scopes{#if p.stilla > 0}{" · "}<span class="stilla">{p.stilla} stilla</span>{/if}
        </span>
      </a>
    {/each}
  </div>
{:else}
  <p class="none">Inga Projekt ännu.</p>
{/if}

<style>
  .cells {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    border-left: 1px solid var(--line);
  }
  .cells.stor {
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  }
  .cell {
    display: block;
    padding: 14px 16px 12px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    color: var(--tx);
  }
  .cell :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }
  .cell:hover {
    background: var(--sel);
  }
  .cell.avslutat {
    opacity: 0.55;
  }
  .cell b {
    display: block;
    font-weight: 600;
  }
  .meta {
    display: block;
    font-size: 13px;
    color: var(--dim);
  }
  .stilla {
    color: var(--redtx);
  }
  .none {
    color: var(--dim);
    font-size: 14px;
    padding: 10px 0;
  }
</style>
