<script lang="ts">
  // The small sky chart shown for a Projekt in lists: the orbit with a dot per
  // Scope in its Läge colour. Stuck Scopes are drawn dimmer with a red ring.
  import { hillY, lägeFärg, type Tema } from "../lib/hill.js";

  let {
    scopes = [],
    tema,
    width = 180,
    height = 50,
  }: {
    scopes?: { läge: number; stilla: boolean }[];
    tema: Tema;
    width?: number;
    height?: number;
  } = $props();

  const skala = $derived(height / 50);
  const x = (läge: number) => 6 + ((width - 12) * läge) / 100;
  const y = (läge: number) => height - 8 * skala - (height - 18 * skala) * hillY(läge);

  const path = $derived(
    Array.from({ length: 26 }, (_, j) => {
      const läge = j * 4;
      return `${j ? "L" : "M"}${x(läge).toFixed(1)},${y(läge).toFixed(1)}`;
    }).join(" "),
  );
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
  <path d={path} fill="none" stroke="var(--orbit)" stroke-width=".8" opacity=".7" />
  {#each scopes as s, i (i)}
    {#if s.stilla}
      <circle cx={x(s.läge)} cy={y(s.läge)} r={4 * skala} fill="none" stroke="var(--red)" stroke-width=".8" stroke-dasharray="2 1.5" />
    {/if}
    <circle cx={x(s.läge)} cy={y(s.läge)} r={(s.stilla ? 1.8 : 2.6) * skala} fill={lägeFärg(s.läge, tema)} />
  {/each}
</svg>
