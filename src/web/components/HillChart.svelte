<script lang="ts">
  // The Hill chart in the Stjärnatlas direction: Scopes are stars on a
  // graduated Läge grid, riding the orbit. Purely props-driven: it never
  // fetches or writes; a drop calls `onflytta` and the parent refreshes
  // `scopes` (after its own write, a live update, or a restore).
  //
  // Drag by mouse or touch; with the keyboard, focus a star and use the arrow
  // keys (Shift = 10 steps, Home/End = 0/100), Enter or leaving commits,
  // Escape cancels. Each commit is one call to `onflytta`.
  //
  // `kompakt` is the Notion embed's hill (#43): it fills its box in real
  // pixels (13px type at any size), with no starfield, grid or scale; the
  // halves' names stand under the baseline when the box is over 150 px high.
  import { untrack } from "svelte";
  import type { ScopeVy } from "../../core/index.js";
  import {
    RUTA,
    dagarSedan,
    etikettText,
    etiketterSomFår,
    glimtVidSpar,
    kompaktRuta,
    lägeFrånX,
    lägeFärg,
    placeraEtiketter,
    punkt,
    radie,
    riktigaPixlar,
    stillaNot,
    type Etikett,
    TELEFON_TRÄFF,
    telefonDiagram,
    type Hinder,
    type Ruta,
    type Tema,
  } from "../lib/hill.js";

  let {
    namn,
    scopes,
    tema,
    valt = null,
    pekad = null,
    markerade = [],
    nu = new Date(),
    etiketter = true,
    kompakt = false,
    märken = {},
    dimmade = [],
    pulsVidSpar = false,
    väntar = null,
    puls = null,
    onvälj,
    onpeka,
    onflytta,
  }: {
    /** The Projekt's name, for the chart's accessible label. */
    namn: string;
    scopes: ScopeVy[];
    tema: Tema;
    /** The selected Scope's id (solid accent ring and ✦ before its label). */
    valt?: string | null;
    /** The Scope pointed at in a list beside the chart (the embed): a thin ring and its label. */
    pekad?: string | null;
    /** Scopes to highlight with a dashed ring (Historik's Visa: they differ from now). */
    markerade?: string[];
    /** "Now", for star size by days since moved. */
    nu?: Date;
    /**
     * Draw star labels: all, none, only the selected star's ("valt"), or all
     * that fit without a collision ("plats", the wide embed beside its list).
     */
    etiketter?: boolean | "valt" | "plats";
    /** The embed's compact hill, filling its box. */
    kompakt?: boolean;
    /** A short mark before a Scope's label, by Scope id (the Stjärnkarta's Projekt letter). */
    märken?: Record<string, string>;
    /** Scopes drawn dimmed (the Stjärnkarta's Avslutade Projekt). */
    dimmade?: string[];
    /** Pulse a star's glow after every saved drop, not only at the crest or 100 (the Stjärnkarta). */
    pulsVidSpar?: boolean;
    /** The star whose move is held for a Signatur: dashed ring until it is saved. */
    väntar?: string | null;
    /** A star whose glow pulses once (a saved move's receipt): the same glint as `pulsVidSpar`. */
    puls?: string | null;
    onvälj?: (id: string | null) => void;
    /** A star is pointed at (hover), or no longer (null). */
    onpeka?: (id: string | null) => void;
    /** Commit a new Läge. Leave out for a read-only chart. Rejecting snaps the star back. */
    onflytta?: (id: string, läge: number) => Promise<unknown> | void;
  } = $props();

  /** The compact hill's box, measured; the big chart's width, to tell a phone. */
  let boxBredd = $state(0);
  let boxHöjd = $state(0);

  /** Läge shown while a star is dragged, being keyed, or its write is pending. */
  let pågående = $state<Record<string, number>>({});
  const visatLäge = (s: ScopeVy) => pågående[s.id] ?? s.läge;

  /**
   * Under 900 px (a phone, or a narrow column) the big chart draws in real
   * pixels (Q9 a, #59) rather than shrink its viewBox: 13px labels, all of
   * them, stacked with leaders and the box grown to fit (Q17 b), and 44px hit
   * areas. Its Stilla stars end their label in "· 26 d" like the embed's.
   */
  const telefon = $derived(!kompakt && riktigaPixlar(boxBredd));

  /** The compact chart has no room for the note, so a Stilla star's label ends in "· 26 d". */
  const stillaTillägg = (s: ScopeVy) =>
    (kompakt || telefon) && s.stilla && pågående[s.id] === undefined ? ` · ${s.stillaDagar} d` : "";

  /** The labelled stars and their texts: the selected star's label gets first pick, then left to right. */
  const etikettStjärnor = $derived(
    !etiketter
      ? []
      : scopes
          .filter((s) => etiketter !== "valt" || s.id === valt || s.id === pekad)
          .map((s) => ({ s, läge: visatLäge(s) }))
          .sort((a, b) => Number(b.s.id === valt) - Number(a.s.id === valt) || a.läge - b.läge)
          .map(({ s, läge }) => ({
            id: s.id,
            läge,
            text: `${etikettText({ namn: s.namn, läge, märke: märken[s.id], vald: s.id === valt })}${stillaTillägg(s)}`,
          })),
  );

  const telefonen = $derived(telefon ? telefonDiagram(boxBredd, etikettStjärnor) : null);

  const ruta: Ruta = $derived(
    kompakt ? kompaktRuta(Math.max(boxBredd, 120), Math.max(boxHöjd, 80)) : (telefonen?.ruta ?? RUTA),
  );
  const { x0: X0, w: W, bas: BASE, topp: TOPP } = $derived(ruta);

  const orbit = $derived(
    Array.from({ length: 201 }, (_, j) => {
      const [x, y] = punkt(j / 2, ruta);
      return `${j ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" "),
  );
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

  let draget: { id: string; pekare: number } | null = null;
  let svg: SVGSVGElement | undefined = $state();

  const stjärnor = $derived(
    scopes.map((s) => {
      const läge = visatLäge(s);
      const [x, y] = punkt(läge, ruta);
      const r = radie(dagarSedan(s.flyttad, nu)) * (kompakt ? 0.78 : 1);
      return { s, läge, x, y, r, färg: lägeFärg(läge, tema) };
    }),
  );

  /** The big chart's "Ingen rörelse på N dagar" notes, by Scope id (hidden while a star moves). */
  const noter = $derived(
    new Map(
      kompakt || telefon
        ? []
        : stjärnor
            .filter((t) => t.s.stilla && pågående[t.s.id] === undefined)
            .map((t) => [t.s.id, stillaNot(t.läge, t.s.stillaDagar ?? 0, ruta)] as const),
    ),
  );

  const placerade = $derived.by(() => {
    if (!etiketter) return new Map();
    // Labels keep clear of the Stilla notes and their leaders.
    const hinder: Hinder[] = [...noter.values()].flatMap((n) => n.hinder);
    let lista: Etikett[];
    if (telefonen) lista = telefonen.etiketter;
    else if (etiketter === "plats") {
      // Pointing at a Scope only moves labels when its own would be left out.
      const valda = valt ? [valt] : [];
      lista = etiketterSomFår(etikettStjärnor, ruta, hinder, valda);
      if (pekad && !lista.some((e) => e.id === pekad))
        lista = etiketterSomFår(etikettStjärnor, ruta, hinder, [...valda, pekad]);
    } else lista = placeraEtiketter(etikettStjärnor, ruta, hinder);
    return new Map(lista.map((e) => [e.id, e]));
  });

  function lägeVid(event: PointerEvent): number {
    const ctm = svg!.getScreenCTM();
    if (!ctm) return 0;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return lägeFrånX(p.x, ruta);
  }

  /** A short glint on a star whose drop crossed the crest or landed on 100 (or any saved drop, with `pulsVidSpar`). */
  let glimt = $state<{ id: string; sort: "krön" | "mål" | "puls"; n: number } | null>(null);
  let glimtTimer: ReturnType<typeof setTimeout> | undefined;

  function tänd(id: string, sort: "krön" | "mål" | "puls") {
    clearTimeout(glimtTimer);
    glimt = { id, sort, n: untrack(() => glimt?.n ?? 0) + 1 };
    glimtTimer = setTimeout(() => (glimt = null), 900);
  }

  function glimta(id: string, från: number, till: number) {
    const sort = glimtVidSpar(från, till, pulsVidSpar);
    if (sort) tänd(id, sort);
  }

  // A receipt from outside (the embed's saved move): the same pulse as `pulsVidSpar`.
  $effect(() => {
    if (puls) tänd(puls, "puls");
  });

  /** Stars whose drop is being written (or held for a Signatur). */
  const skickas = new Set<string>();
  /** Stars gliding back after a drop that was not saved. */
  let glider = $state<Record<string, true>>({});

  async function släpp(s: ScopeVy) {
    const läge = pågående[s.id];
    // Already committing: e.g. the star lost focus to the Signatur strip.
    if (läge === undefined || skickas.has(s.id)) return;
    if (läge === s.läge || !onflytta) {
      delete pågående[s.id];
      return;
    }
    skickas.add(s.id);
    try {
      await onflytta(s.id, läge);
      glimta(s.id, s.läge, läge);
    } catch {
      // Not saved (e.g. the Signatur was abandoned): glide back.
      glider[s.id] = true;
      setTimeout(() => delete glider[s.id], 400);
    } finally {
      skickas.delete(s.id);
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

<div class="box" class:kompakt class:telefon bind:clientWidth={boxBredd} bind:clientHeight={boxHöjd}>
<svg
  bind:this={svg}
  viewBox="0 0 {ruta.bredd} {ruta.höjd}"
  role="group"
  aria-label="Hill chart för {namn}"
  class:redigerbar={!!onflytta}
>
  {#if kompakt}
    {@const [kx] = punkt(50, ruta)}
    <line x1={ruta.x0} y1={ruta.bas} x2={ruta.x0 + ruta.w} y2={ruta.bas} stroke="var(--line)" />
    <line x1={kx} y1={ruta.topp} x2={kx} y2={ruta.bas} stroke="var(--grid)" stroke-dasharray="2 3" />
  {:else}
    {#each himmel as h, i (i)}
      <circle cx={(h.cx * ruta.bredd) / RUTA.bredd} cy={(h.cy * ruta.höjd) / RUTA.höjd} r={h.r} opacity={h.o} fill="var(--star)" />
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
  {/if}
  <path d={orbit} fill="none" stroke="var(--orbit)" stroke-width={kompakt ? 1.3 : 1.4} />
  <!-- The hill's halves (Q14 a): figuring out uphill, making it happen downhill. -->
  {#if !kompakt}
    <text class="gt" x={X0} y={BASE + 50}>← Utforskar</text>
    <text class="gt" x={X0 + W} y={BASE + 50} text-anchor="end">Genomför →</text>
  {:else if ruta.höjd > 150}
    <text class="halva" x={ruta.x0} y={ruta.bas + 15}>← Utforskar</text>
    <text class="halva" x={ruta.x0 + ruta.w} y={ruta.bas + 15} text-anchor="end">Genomför →</text>
  {/if}

  {#each stjärnor as { s, läge, x, y, r, färg } (s.id)}
    {@const e = placerade.get(s.id)}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g
      class="scope"
      class:dras={pågående[s.id] !== undefined}
      class:dimmad={dimmade.includes(s.id)}
      class:glider={glider[s.id]}
      role={onflytta ? "slider" : "img"}
      tabindex={onflytta || onvälj ? 0 : undefined}
      aria-label="{s.namn}, Läge {läge}, Ägare {s.ägare.namn}{s.stilla ? `, ingen rörelse på ${s.stillaDagar} dagar` : ""}"
      aria-valuemin={onflytta ? 0 : undefined}
      aria-valuemax={onflytta ? 100 : undefined}
      aria-valuenow={onflytta ? läge : undefined}
      onpointerdown={(ev) => pointerdown(ev, s)}
      onpointermove={(ev) => pointermove(ev, s)}
      onpointerup={(ev) => pointerup(ev, s)}
      onpointercancel={() => pointercancel(s)}
      onpointerenter={() => onpeka?.(s.id)}
      onpointerleave={() => onpeka?.(null)}
      onkeydown={(ev) => keydown(ev, s)}
      onfocus={() => onvälj?.(s.id)}
      onblur={() => blur(s)}
    >
      {#if kompakt}
        <title>{s.namn} · {s.ägare.namn} · Läge {läge}{s.stilla ? ` · stilla i ${s.stillaDagar} dagar` : ""}</title>
      {/if}
      <circle class="glöd" cx={x} cy={y} r={r * (kompakt ? 2.4 : 2.6)} fill={färg} opacity=".13" />
      <circle cx={x} cy={y} r={Math.max(r, telefon ? TELEFON_TRÄFF : 16)} fill="transparent" />
      <circle cx={x} cy={y} {r} fill={färg} />
      {#if s.id === väntar}
        <circle class="väntar" cx={x} cy={y} r={kompakt ? (s.stilla ? 18 : 13) : telefon ? 15 : 20} />
      {:else if s.id === valt}
        <!-- Around a Stilla star's dashed ring it stands well outside, so the two read as two. -->
        <circle class="ring" cx={x} cy={y} r={kompakt ? (s.stilla ? 18 : 13) : telefon ? (s.stilla ? 18 : 15) : 20} />
      {:else if s.id === pekad}
        <circle class="pekring" cx={x} cy={y} r={(kompakt || telefon) && s.stilla ? 18 : 13} />
      {/if}
      {#if markerade.includes(s.id)}
        <circle class="markerad" cx={x} cy={y} r={telefon ? 19 : 25} />
      {/if}
      {#if (kompakt || telefon) && s.stilla && pågående[s.id] === undefined}
        <circle class="stillahalo" cx={x} cy={y} r="12.5" />
        <circle class="stilla" cx={x} cy={y} r="12.5" />
      {:else if noter.get(s.id)}
        <!-- Stilla: dashed red ring and a leader to the note, turned away from the frame's edges. -->
        {@const not = noter.get(s.id)!}
        <circle class="stillahalo" cx={x} cy={y} r="14" />
        <circle class="stilla" cx={x} cy={y} r="14" />
        <polyline class="stilla" points={not.punkter.map((p) => p.join(",")).join(" ")} />
        <text class="stillatext" x={not.text.x} y={not.text.y} text-anchor={not.text.anchor}>{not.text.innehåll}</text>
      {/if}
      {#if glimt?.id === s.id}
        {#key glimt.n}
          <circle class="glimt" cx={x} cy={y} r={r * (kompakt ? 2.4 : 2.6)} fill={färg} />
          {#if glimt.sort === "mål"}
            <circle class="målring" cx={x} cy={y} r={kompakt ? 13 : telefon ? 15 : 20} stroke={färg} />
          {/if}
        {/key}
      {/if}
      {#if e}
        {#if e.ledare}
          <line class="ledare" x1={e.ledare.x1} y1={e.ledare.y1} x2={e.ledare.x2} y2={e.ledare.y2} />
        {/if}
        <text class="sn" x={e.x} y={e.y} text-anchor={e.anchor}
          >{#if märken[s.id]}<tspan class="sm">{märken[s.id] + " "}</tspan>{/if}{#if s.id === valt}<tspan class="vm"
              >✦&nbsp;</tspan
            >{/if}{s.namn} <tspan class="sm">{läge}</tspan>{#if stillaTillägg(s)}<tspan class="stillad"
              >{stillaTillägg(s)}</tspan
            >{/if}</text>
      {/if}
    </g>
  {/each}
</svg>
</div>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-select: none;
  }
  .kompakt {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 80px;
  }
  .kompakt svg {
    position: absolute;
    inset: 0;
    height: 100%;
  }
  .kompakt .sn,
  .telefon .sn {
    font-size: 13px;
    stroke-width: 4px;
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
  .scope.dimmad {
    opacity: 0.45;
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
    stroke-width: 2;
  }
  .scope:focus-visible circle:nth-child(3) {
    stroke: var(--red);
    stroke-width: 2;
  }
  /* Pointed at from the list: ink, not the accent, which means selected and Stilla. */
  .pekring {
    fill: none;
    stroke: var(--tx);
    stroke-width: 1.5;
  }
  .halva {
    font: 500 13px Barlow, system-ui, sans-serif;
    fill: var(--dim);
  }
  /* Held for a Signatur: the accent ring, dashed until the move is saved. */
  .väntar {
    fill: none;
    stroke: var(--red);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }
  .glider circle {
    transition:
      cx 0.35s ease-out,
      cy 0.35s ease-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .glider circle {
      transition: none;
    }
  }
  .markerad {
    fill: none;
    stroke: var(--tx);
    stroke-width: 1.2;
    stroke-dasharray: 3 4;
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
  .vm {
    font-weight: 600;
    fill: var(--redtx);
  }
  /* Stilla: a dashed accent ring on a dark halo, so it reads apart from the
     orange uphill stars by form, not only hue. */
  .stillahalo {
    fill: none;
    stroke: var(--halo);
    stroke-width: 5;
  }
  .stilla {
    fill: none;
    stroke: var(--red);
    stroke-width: 1.6;
    stroke-dasharray: 3 3;
  }
  .stillad {
    font-weight: 500;
    fill: var(--redtx);
  }
  polyline.stilla {
    stroke-dasharray: none;
    stroke-width: 0.8;
    opacity: 0.8;
  }
  .stillatext {
    font: 500 14px Barlow, system-ui, sans-serif;
    fill: var(--redtx);
    paint-order: stroke;
    stroke: var(--halo);
    stroke-width: 5px;
    stroke-linejoin: round;
    pointer-events: none;
  }
  /* A drop over the crest or onto 100: the star's glow flares once, and at
     100 a thin ring widens and fades. No sound, no confetti. */
  .glimt {
    opacity: 0;
    pointer-events: none;
    animation: glimt 350ms ease-out;
  }
  @keyframes glimt {
    30% {
      opacity: 0.5;
    }
    to {
      opacity: 0;
    }
  }
  .målring {
    fill: none;
    stroke-width: 1.2;
    opacity: 0;
    pointer-events: none;
    transform-box: fill-box;
    transform-origin: center;
    animation: målring 800ms ease-out;
  }
  @keyframes målring {
    from {
      opacity: 0.9;
      transform: scale(0.6);
    }
    to {
      opacity: 0;
      transform: scale(1.8);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .glimt,
    .målring {
      animation: none;
    }
  }
  .ledare {
    stroke: var(--dim);
    stroke-width: 0.8;
    opacity: 0.7;
  }
</style>
