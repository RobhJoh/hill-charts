<script lang="ts">
  import { projektHref } from "../lib/links.js";
  import MiniHill from "./MiniHill.svelte";

  let { projekt }: { projekt: { id: string; namn: string }[] } = $props();
</script>

{#if projekt.length > 0}
  <div class="cells">
    {#each projekt as p (p.id)}
      <a class="cell" href={projektHref(p)}>
        <MiniHill />
        <b>{p.namn}</b>
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
  .cell {
    display: block;
    padding: 14px 16px 12px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    color: var(--tx);
  }
  .cell:hover {
    background: var(--sel);
  }
  .cell b {
    display: block;
    font-weight: 600;
  }
  .none {
    color: var(--dim);
    font-size: 14px;
    padding: 10px 0;
  }
</style>
