<script lang="ts">
  // Shown for unknown routes ("Finns inte") and for ids that are Raderade or
  // never existed ("Finns inte längre", as the server's 404 page title says).
  let { längre = false }: { längre?: boolean } = $props();
  const rubrik = $derived(längre ? "Finns inte längre" : "Finns inte");
</script>

<svelte:head><title>{rubrik} · Apogee</title></svelte:head>

<div class="page">
  <h1>{rubrik}</h1>
  <p class="meta">
    {längre ? "Det här finns inte längre." : "Sidan finns inte."}
    <a href="/">Till alla Funktionsområden</a>
  </p>
</div>

<style>
  p {
    margin-top: 12px;
  }
</style>
