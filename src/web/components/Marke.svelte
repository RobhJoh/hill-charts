<script lang="ts">
  // The Apogee mark: the four-pointed ✦ star in the accent, as in the site
  // header, the embed's "Öppna i Apogee" link and its borttaget message.
  let { storlek = 22 }: { storlek?: number } = $props();
</script>

<svg width={storlek} height={storlek} viewBox="0 0 22 22" aria-hidden="true">
  <path d="M11 1 L12.6 9.4 L21 11 L12.6 12.6 L11 21 L9.4 12.6 L1 11 L9.4 9.4Z" fill="var(--red)" />
</svg>
