<script lang="ts">
  // Shown for unknown routes ("Finns inte") and for ids that are Raderade or
  // never existed. The server cannot tell those two apart, so a known kind of
  // page (`vad`, e.g. "Projektet") gets a text true in both cases (#62);
  // otherwise `längre` says "Finns inte längre".
  let { längre = false, vad }: { längre?: boolean; vad?: string } = $props();
  const rubrik = $derived(vad ? `Hittar inte ${vad}` : längre ? "Finns inte längre" : "Finns inte");
  const text = $derived(
    vad
      ? `Länken kan vara felskriven, eller så har ${vad} raderats.`
      : längre
        ? "Det här finns inte längre."
        : "Sidan finns inte.",
  );
</script>

<svelte:head><title>{rubrik} · Apogee</title></svelte:head>

<div class="page">
  <h1>{rubrik}</h1>
  <p class="meta">
    {text}
    <a href="/">Till alla Funktionsområden</a>
  </p>
</div>

<style>
  p {
    margin-top: 12px;
  }
</style>
