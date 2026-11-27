<script lang="ts">
  // "Ändra i Notion": the namn, Funktionsområde and dates come from Notion and
  // are read-only here (ADR 0003); this links to the page where they change.
  let { url }: { url: string | null } = $props();
</script>

{#if url}
  <a class="notion" href={url} target="_blank" rel="noopener noreferrer">Ändra i Notion</a>
{/if}

<style>
  .notion {
    font-size: 14px;
    color: var(--dim);
    white-space: nowrap;
  }
  .notion:hover {
    color: var(--tx);
  }
</style>
