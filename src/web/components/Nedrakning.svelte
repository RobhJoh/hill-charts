<script lang="ts">
  // The countdown ("22 dagar kvar av 6 veckor") with its Appetit bar, and the
  // next Milstolpe beside it. Red when Över tid. Renders nothing without dates.
  import type { Nedräkning, NästaMilstolpe } from "../../core/index.js";

  let {
    nedräkning,
    nästaMilstolpe = null,
    liten = false,
  }: {
    nedräkning: Nedräkning | null;
    nästaMilstolpe?: NästaMilstolpe | null;
    /** Compact form for lists. */
    liten?: boolean;
  } = $props();

  const över = $derived(nedräkning?.läge === "över tid");
</script>

{#if nedräkning || nästaMilstolpe}
  <span class="nedräkning" class:liten>
    {#if nedräkning}
      <span class="cd">
        <span class="text" class:över>{nedräkning.text}</span>
        {#if nedräkning.andel !== null}
          <span class="bar" aria-hidden="true">
            <span class="fill" class:över style:width="{Math.round(nedräkning.andel * 100)}%"></span>
          </span>
        {/if}
      </span>
    {/if}
    {#if nästaMilstolpe}<span class="milstolpe">◆ {nästaMilstolpe.text}</span>{/if}
  </span>
{/if}

<style>
  .nedräkning {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 14px;
    color: var(--mid);
  }
  .liten {
    font-size: 13px;
    gap: 2px 10px;
    color: var(--dim);
  }
  .cd {
    display: inline-flex;
    flex-direction: column;
    gap: 4px;
    min-width: 150px;
  }
  .liten .cd {
    min-width: 0;
  }
  .text.över {
    color: var(--redtx);
    font-weight: 600;
  }
  .bar {
    display: block;
    height: 4px;
    background: var(--grid);
  }
  .liten .bar {
    height: 3px;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--mid);
  }
  .fill.över {
    background: var(--red);
  }
  .milstolpe {
    white-space: nowrap;
  }
</style>
