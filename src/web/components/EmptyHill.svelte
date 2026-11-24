<script lang="ts">
  // The Hill chart's graduated Läge grid and orbit, with no Scopes yet.
  // The Hill chart ticket adds the stars on top of this.
  import { hillY } from "../lib/hill.js";

  let { namn }: { namn: string } = $props();

  const X0 = 70;
  const W = 760;
  const BASE = 560;
  const HT = 380;
  const point = (läge: number) => [X0 + (W * läge) / 100, BASE - HT * hillY(läge)] as const;

  const orbit = Array.from({ length: 201 }, (_, j) => {
    const [x, y] = point(j / 2);
    return `${j ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
</script>

<svg viewBox="0 0 900 640" role="img" aria-label="Hill chart för {namn}">
  {#each Array.from({ length: 11 }, (_, i) => X0 + (W * i) / 10) as x (x)}
    <line x1={x} y1="40" x2={x} y2={BASE} stroke="var(--grid)" />
  {/each}
  <rect x={X0} y="40" width={W} height={BASE - 40} fill="none" stroke="var(--line)" />
  {#each ticks as läge (läge)}
    {@const x = X0 + (W * läge) / 100}
    <line x1={x} y1={BASE} x2={x} y2={BASE + (läge % 10 ? 5 : 10)} stroke="var(--dim)" />
    {#if läge % 10 === 0}
      <text class="gt" {x} y={BASE + 26} text-anchor="middle">{läge}</text>
    {/if}
  {/each}
  <path d={orbit} fill="none" stroke="var(--orbit)" stroke-width="1.4" />
  <text class="gt" x={X0} y={BASE + 50}>← Uppför · lista ut</text>
  <text class="gt" x={X0 + W} y={BASE + 50} text-anchor="end">Nedför · genomföra →</text>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .gt {
    font: 500 13px Barlow, system-ui, sans-serif;
    fill: var(--dim);
  }
</style>
