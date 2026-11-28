<script lang="ts">
  // Pågående Projekt as mini sky charts: name, status beside its Notion-status,
  // Scope count and a red Stilla count. Avslutade Projekt follow in a compact
  // list with a light-blue ✦ and the day they were Avslutade, without a mini
  // chart (Q4 c, Q11 a).
  import type { ProjektRad } from "../../core/index.js";
  import { STATUS_ORD } from "../lib/status.js";
  import NotionStatus from "./NotionStatus.svelte";
  import { tema } from "../lib/tema.svelte.js";
  import { projektHref } from "../lib/links.js";
  import { avslutatRad, delaProjekt } from "../lib/avslutade.js";
  import MiniHill from "./MiniHill.svelte";
  import Nedrakning from "./Nedrakning.svelte";
  import StillaAntal from "./StillaAntal.svelte";
  import { antal } from "../lib/ord.js";

  let {
    projekt,
    stor = false,
  }: {
    projekt: ProjektRad[];
    /** The Funktionsområde page shows the same cells at a larger size. */
    stor?: boolean;
  } = $props();

  const delar = $derived(delaProjekt(projekt));
</script>

{#if delar.pågående.length > 0}
  <div class="cells" class:stor>
    {#each delar.pågående as p (p.id)}
      <a class="cell" href={projektHref(p)}>
        <MiniHill scopes={p.scopes} tema={tema.nu} width={stor ? 270 : 180} height={stor ? 75 : 50} />
        <b>{p.namn}</b>
        <span class="meta">{STATUS_ORD[p.status]}<NotionStatus status={p.notionStatus} före=" · " /></span>
        <span class="meta">
          {antal(p.scopes.length, "Scope", "Scopes")}{#if p.stilla > 0}{" · "}<StillaAntal antal={p.stilla} />{/if}
        </span>
        <Nedrakning nedräkning={p.nedräkning} nästaMilstolpe={p.nästaMilstolpe} liten />
      </a>
    {/each}
  </div>
{/if}
{#if delar.avslutade.length > 0}
  <div class="avslutade">
    <div class="cap">Avslutade</div>
    <ul>
      {#each delar.avslutade as p (p.id)}
        <li>
          <a href={projektHref(p)}>
            <span class="klar" aria-hidden="true">✦</span>
            <b>{p.namn}</b>
            <span class="datum">{avslutatRad(p.avslutad)}<NotionStatus status={p.notionStatus} före=" · " /></span>
          </a>
        </li>
      {/each}
    </ul>
  </div>
{/if}
{#if projekt.length === 0}
  <p class="none">Inga Projekt ännu.</p>
{/if}

<style>
  .cells {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    border-top: 1px solid var(--line);
    border-left: 1px solid var(--line);
  }
  .cells.stor {
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  }
  .cell {
    display: block;
    padding: 14px 16px 12px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    color: var(--tx);
  }
  .cell :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }
  .cell:hover {
    background: var(--sel);
  }
  .cell b {
    display: block;
    font-weight: 600;
  }
  .meta {
    display: block;
    font-size: 13px;
    color: var(--dim);
  }
  .avslutade {
    margin-top: 14px;
  }
  .avslutade .cap {
    padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
  }
  .avslutade ul {
    list-style: none;
    padding: 0;
  }
  .avslutade a {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
    padding: 8px 4px;
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    color: var(--tx);
  }
  .avslutade a:hover {
    background: var(--sel);
  }
  .avslutade b {
    font-weight: 600;
  }
  .klar {
    color: var(--klar);
    font-size: 14px;
    line-height: 1;
    flex: none;
  }
  .datum {
    font-size: 13px;
    color: var(--dim);
  }
  .none {
    color: var(--dim);
    font-size: 14px;
    padding: 10px 0;
  }
</style>
