<script lang="ts">
  // /mina: goes to the remembered Signatur's Stjärnkarta, or asks "Vem?" first
  // (the strip at the bottom) and goes there once a Person is chosen.
  import { api } from "../lib/api.js";
  import { personHref } from "../lib/links.js";
  import { router } from "../lib/router.svelte.js";
  import { signatur } from "../lib/signatur.svelte.js";

  let fel = $state("");

  signatur
    .begär()
    .then(async (id) => {
      const person = (await api.listPersoner()).find((p) => p.id === id);
      if (router.route.sida === "mina" && person) router.navigate(personHref(person), { replace: true });
    })
    .catch((e) => {
      // Avbruten: the page was left before a Signatur was chosen.
      fel = e instanceof Error ? e.message : "";
    });
</script>

<svelte:head><title>Mina Scopes · Apogee</title></svelte:head>

<div class="page">
  <h1>Mina Scopes</h1>
  {#if signatur.frågar}
    <p class="meta">Välj vem du är, så visas din Stjärnkarta.</p>
  {:else if fel}
    <p class="meta">{fel}</p>
  {/if}
</div>
