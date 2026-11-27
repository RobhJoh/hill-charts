<script lang="ts">
  // Notion-status (GLOSSARY.md): shown exactly as it reads in Notion, beside
  // the derived status. It decides nothing in Apogee and may disagree with it.
  // Nothing is shown when it is empty in Notion.
  let { status, före = "" }: { status: string | null; före?: string } = $props();
</script>

{#if status}{före}<span class="notionstatus" title="Status i Notion. Styr inget i Apogee."
    >I Notion: {status}</span
  >{/if}

<style>
  .notionstatus {
    color: var(--dim);
    font-style: normal;
    font-weight: normal;
  }
</style>
