<script lang="ts">
  // The small sky chart shown for a Projekt in lists. Scopes are drawn on it
  // once the Hill chart exists; for now it shows the empty orbit.
  import { hillY } from "../lib/hill.js";

  let { width = 180, height = 50 }: { width?: number; height?: number } = $props();

  const path = $derived(
    Array.from({ length: 26 }, (_, j) => {
      const läge = j * 4;
      const x = 6 + ((width - 12) * läge) / 100;
      const y = height - 8 - (height - 18) * hillY(läge);
      return `${j ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" "),
  );
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
  <path d={path} fill="none" stroke="var(--orbit)" stroke-width=".8" opacity=".7" />
</svg>
