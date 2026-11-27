<script lang="ts">
  // A count of Stilla Scopes ("2 stilla") in the accent text colour, explained
  // by a title on hover and by hidden text for screen readers.
  import { STILLA_FÖRKLARING } from "../lib/stilla.js";

  let { antal }: { antal: number } = $props();
</script>

<span class="stilla" title={STILLA_FÖRKLARING}
  >{antal} stilla<span class="sr">: {STILLA_FÖRKLARING.toLowerCase()}</span></span
>

<style>
  .stilla {
    color: var(--redtx);
    font-style: normal;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
