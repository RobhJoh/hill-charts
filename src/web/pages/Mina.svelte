<script lang="ts">
  // /mina: goes to the remembered Signatur's Stjärnkarta. Viewers are never
  // asked who they are: without a remembered Signatur it points to Personer.
  import { felText } from "../lib/fel.js";
  import { personHref } from "../lib/links.js";
  import { router } from "../lib/router.svelte.js";
  import { signatur } from "../lib/signatur.svelte.js";

  let ingen = $state(false);
  let fel = $state("");

  signatur
    .ihågkommen()
    .then((person) => {
      if (!person) ingen = true;
      else if (router.route.sida === "mina") router.navigate(personHref(person), { replace: true });
    })
    .catch((e) => (fel = felText(e, "Kunde inte läsa in")));
</script>

<svelte:head><title>Mina Scopes · Apogee</title></svelte:head>

<div class="page">
  <h1>Mina Scopes</h1>
  {#if ingen}
    <p class="meta">
      Ingen Signatur är vald på den här enheten. Hitta din Stjärnkarta under
      <a href="/installningar/personer">Personer</a>.
    </p>
  {:else if fel}
    <p class="error">{fel}</p>
  {/if}
</div>
