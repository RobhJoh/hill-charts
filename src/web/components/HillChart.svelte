<script lang="ts">
  // The Hill chart in the Stjärnatlas direction: Scopes are stars on a
  // graduated Läge grid, riding the orbit. Purely props-driven: it never
  // fetches or writes; a drop calls `onflytta` and the parent refreshes
  // `scopes` (after its own write, a live update, or a restore).
  //
  // Drag by mouse or touch; with the keyboard, focus a star and use the arrow
  // keys (Shift = 10 steps, Home/End = 0/100), Enter or leaving commits,
  // Escape cancels. Each commit is one call to `onflytta`.
  import type { ScopeVy } from "../../core/index.js";
  import {
    RUTA,
    dagarSedan,
    lägeFrånX,
    lägeFärg,
    placeraEtiketter,
    punkt,
    radie,
    type Tema,
  } from "../lib/hill.js";

  let {
    namn,
    scopes,
    tema,
    valt = null,
    nu = new Date(),
    etiketter = true,
    onvälj,
    onflytta,
  }: {
    /** The Projekt's name, for the chart's accessible label. */
    namn: string;
    scopes: ScopeVy[];
    tema: Tema;
    /** The selected Scope's id (red ring). */
    valt?: string | null;
    /** "Now", for star size by days since moved. */
    nu?: Date;
    /** Draw star labels (the embed's narrow layout may turn them off). */
    etiketter?: boolean;
    onvälj?: (id: string | null) => void;
    /** Commit a new Läge. Leave out for a read-only chart. Rejecting snaps the star back. */
    onflytta?: (id: string, läge: number) => Promise<unknown> | void;
  } = $props();

  const { x0: X0, w: W, bas: BASE, topp: TOPP } = RUTA;

  const orbit = Array.from({ length: 201 }, (_, j) => {
    const [x, y] = punkt(j / 2);
    return `${j ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);

  // A deterministic starfield, so it never jumps on re-render.
  const himmel = (() => {
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: 70 }, () => ({
      cx: 20 + r() * 860,
      cy: 40 + r() * 560,
      r: [0.6, 0.8, 1, 1.3][Math.floor(r() * 4)]!,
      o: 0.08 + r() * 0.17,
    }));
  })();

  /** Läge shown while a star is dragged, being keyed, or its write is pending. */
  let pågående = $state<Record<string, number>>({});
  let draget: { id: string; pekare: number } | null = null;
  let svg: SVGSVGElement | undefined = $state();

  const visatLäge = (s: ScopeVy) => pågående[s.id] ?? s.läge;

  const stjärnor = $derived(
    scopes.map((s) => {
      const läge = visatLäge(s);
      const [x, y] = punkt(läge);
      return { s, läge, x, y, r: radie(dagarSedan(s.flyttad, nu)), färg: lägeFärg(läge, tema) };
    }),
  );

  const placerade = $derived.by(() => {
    if (!etiketter) return new Map();
    // The selected star's label gets first pick, then left to right.
    const ordning = [...stjärnor].sort((a, b) => Number(b.s.id === valt) - Number(a.s.id === valt) || a.läge - b.läge);
    const lista = placeraEtiketter(ordning.map((t) => ({ id: t.s.id, läge: t.läge, text: `${t.s.namn} ${t.läge}` })));
    return new Map(lista.map((e) => [e.id, e]));
  });

  function lägeVid(event: PointerEvent): number {
    const ctm = svg!.getScreenCTM();
    if (!ctm) return 0;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return lägeFrånX(p.x);
  }

  async function släpp(s: ScopeVy) {
    const läge = pågående[s.id];
    if (läge === undefined) return;
    if (läge === s.läge || !onflytta) {
      delete pågående[s.id];
      return;
    }
    try {
      await onflytta(s.id, läge);
    } catch {
      // Not saved (e.g. the Signatur was abandoned): snap back.
    } finally {
      delete pågående[s.id];
    }
  }

  function pointerdown(event: PointerEvent, s: ScopeVy) {
    onvälj?.(s.id);
    // Focus the star so the keyboard can take over (preventDefault below stops the default focus).
    (event.currentTarget as SVGGElement).focus({ preventScroll: true });
    if (!onflytta || event.button !== 0) return;
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    draget = { id: s.id, pekare: event.pointerId };
    pågående[s.id] = visatLäge(s);
    event.preventDefault();
  }

  function pointermove(event: PointerEvent, s: ScopeVy) {
    if (draget?.id !== s.id || draget.pekare !== event.pointerId) return;
    pågående[s.id] = lägeVid(event);
  }

  function pointerup(event: PointerEvent, s: ScopeVy) {
    if (draget?.id !== s.id || draget.pekare !== event.pointerId) return;
    draget = null;
    släpp(s);
  }

  function pointercancel(s: ScopeVy) {
    if (draget?.id !== s.id) return;
    draget = null;
    delete pågående[s.id];
  }

  let tangentTimer: ReturnType<typeof setTimeout> | undefined;

  function keydown(event: KeyboardEvent, s: ScopeVy) {
    if (!onflytta) return;
    const steg = event.shiftKey ? 10 : 1;
    const nu = visatLäge(s);
    let nytt: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") nytt = nu + steg;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") nytt = nu - steg;
    else if (event.key === "Home") nytt = 0;
    else if (event.key === "End") nytt = 100;
    else if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(tangentTimer);
      släpp(s);
      return;
    } else if (event.key === "Escape") {
      clearTimeout(tangentTimer);
      delete pågående[s.id];
      return;
    }
    if (nytt === undefined) return;
    event.preventDefault();
    onvälj?.(s.id);
    pågående[s.id] = Math.min(100, Math.max(0, nytt));
    // A pause in key presses is a drop, so holding an arrow writes one Uppdatering.
    clearTimeout(tangentTimer);
    tangentTimer = setTimeout(() => släpp(s), 900);
  }

  function blur(s: ScopeVy) {
    if (pågående[s.id] !== undefined && draget?.id !== s.id) {
      clearTimeout(tangentTimer);
      släpp(s);
    }
  }
</script>

<svg
  bind:this={svg}
  viewBox="0 0 {RUTA.bredd} {RUTA.höjd}"
  role="group"
  aria-label="Hill chart för {namn}"
  class:redigerbar={!!onflytta}
>
  {#each himmel as h, i (i)}
    <circle cx={h.cx} cy={h.cy} r={h.r} opacity={h.o} fill="var(--star)" />
  {/each}
  {#each Array.from({ length: 11 }, (_, i) => X0 + (W * i) / 10) as x (x)}
    <line x1={x} y1={TOPP} x2={x} y2={BASE} stroke="var(--grid)" />
  {/each}
  <rect x={X0} y={TOPP} width={W} height={BASE - TOPP} fill="none" stroke="var(--line)" />
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

  {#each stjärnor as { s, läge, x, y, r, färg } (s.id)}
    {@const e = placerade.get(s.id)}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g
      class="scope"
      class:dras={pågående[s.id] !== undefined}
      role={onflytta ? "slider" : "img"}
      tabindex={onflytta || onvälj ? 0 : undefined}
      aria-label="{s.namn}, Läge {läge}, Ägare {s.ägare.namn}"
      aria-valuemin={onflytta ? 0 : undefined}
      aria-valuemax={onflytta ? 100 : undefined}
      aria-valuenow={onflytta ? läge : undefined}
      onpointerdown={(ev) => pointerdown(ev, s)}
      onpointermove={(ev) => pointermove(ev, s)}
      onpointerup={(ev) => pointerup(ev, s)}
      onpointercancel={() => pointercancel(s)}
      onkeydown={(ev) => keydown(ev, s)}
      onfocus={() => onvälj?.(s.id)}
      onblur={() => blur(s)}
    >
      <circle cx={x} cy={y} r={r * 2.6} fill={färg} opacity=".13" />
      <circle cx={x} cy={y} r={Math.max(r, 16)} fill="transparent" />
      <circle cx={x} cy={y} {r} fill={färg} />
      {#if s.id === valt}
        <circle class="ring" cx={x} cy={y} r="20" />
      {/if}
      {#if e}
        {#if e.ledare}
          <line class="ledare" x1={e.ledare.x1} y1={e.ledare.y1} x2={e.ledare.x2} y2={e.ledare.y2} />
        {/if}
        <text class="sn" x={e.x} y={e.y} text-anchor={e.anchor}>{s.namn} <tspan class="sm">{läge}</tspan></text>
      {/if}
    </g>
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-select: none;
  }
  svg.redigerbar {
    touch-action: none;
  }
  .gt {
    font: 500 13px Barlow, system-ui, sans-serif;
    fill: var(--dim);
  }
  .scope {
    outline: none;
  }
  .redigerbar .scope {
    cursor: grab;
  }
  .redigerbar .scope.dras {
    cursor: grabbing;
  }
  .scope:focus-visible .ring,
  .ring {
    fill: none;
    stroke: var(--red);
    stroke-width: 1.2;
  }
  .scope:focus-visible circle:nth-child(3) {
    stroke: var(--red);
    stroke-width: 2;
  }
  .sn {
    font: 600 15px Barlow, system-ui, sans-serif;
    fill: var(--tx);
    paint-order: stroke;
    stroke: var(--halo);
    stroke-width: 5px;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .sm {
    font-weight: 500;
    fill: var(--mid);
  }
  .ledare {
    stroke: var(--dim);
    stroke-width: 0.8;
    opacity: 0.7;
  }
</style>
