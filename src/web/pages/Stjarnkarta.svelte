<script lang="ts">
  import { felText } from "../lib/fel.js";
  // A Person's Stjärnkarta: every Scope they own, as stars on one sky. Each
  // star carries its Projekt's letter from the key beside the chart. Dragging
  // a star is an Uppdatering in that Scope's own Projekt, with a toast
  // offering Ångra. Avslutade Projekt sit behind a toggle, dimmed; Borttagna
  // are never shown (the core leaves them out).
  import type { ScopeVy, StjärnkartaProjekt, StjärnkartaVy } from "../../core/index.js";
  import HillChart from "../components/HillChart.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import Toast from "../components/Toast.svelte";
  import { api, ApiError } from "../lib/api.js";
  import { dagarSedan, lägeFärg, radie, rampGradient } from "../lib/hill.js";
  import { personHref, projektHref } from "../lib/links.js";
  import { böj } from "../lib/ord.js";
  import { router } from "../lib/router.svelte.js";
  import { följLive, senasteLaddning } from "../lib/live.js";
  import { Avbruten, laddaPersoner, signatur } from "../lib/signatur.svelte.js";
  import { tema } from "../lib/tema.svelte.js";
  import Saknas from "./Saknas.svelte";

  let { id }: { id: string } = $props();

  let karta = $state<StjärnkartaVy | undefined>();
  let saknas = $state(false);
  /** Set when the Person exists but is inaktiv: they have no Stjärnkarta. */
  let inaktiv = $state<string | null>(null);
  let loadError = $state("");
  let skrivFel = $state("");
  let medAvslutade = $state(false);
  let valt = $state<string | null>(null);
  /** The last drag, which the toast's Ångra undoes. */
  let flytt = $state<{ text: string; projektId: string; uppdateringId: string } | null>(null);

  const load = senasteLaddning(() => api.stjärnkarta(id), {
    svar(svar) {
      karta = svar;
      // Canonical URL in the address bar (the server redirects; client-side links may be stale).
      const href = personHref(svar.person);
      if (router.route.sida === "person" && location.pathname !== href) {
        router.navigate(href + location.search + location.hash, { replace: true });
      }
    },
    async fel(e) {
      if (e instanceof ApiError && e.status === 404) {
        const person = (await laddaPersoner().catch(() => [])).find((p) => p.id === id);
        if (person && !person.aktiv) inaktiv = person.namn;
        else saknas = true;
      } else loadError = felText(e, "Kunde inte läsa in");
    },
  });
  load();

  /** Letters follow the key's order over all Projekt, so toggling Avslutade never reletters. */
  const bokstav = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");
  const nycklar = $derived((karta?.projekt ?? []).map((p, i) => ({ p, glyf: bokstav(i) })));
  const visade = $derived(nycklar.filter(({ p }) => medAvslutade || !p.avslutat));
  const scopes = $derived(visade.flatMap(({ p }) => p.scopes));
  const märken = $derived(Object.fromEntries(visade.flatMap(({ p, glyf }) => p.scopes.map((s) => [s.id, glyf]))));
  const dimmade = $derived(visade.filter(({ p }) => p.avslutat).flatMap(({ p }) => p.scopes.map((s) => s.id)));
  const projektFör = (scopeId: string): StjärnkartaProjekt | undefined =>
    karta?.projekt.find((p) => p.scopes.some((s) => s.id === scopeId));

  // Live sync: follow every Projekt on the sky; any write there reloads the map.
  const följda = $derived((karta?.projekt ?? []).map((p) => p.id).join(","));
  $effect(() => följLive(följda ? följda.split(",") : [], () => void load()));

  async function flytta(scopeId: string, läge: number) {
    const p = projektFör(scopeId);
    const s = p?.scopes.find((x) => x.id === scopeId);
    if (!p || !s) return;
    skrivFel = "";
    try {
      const { uppdatering } = await signatur.signera((vem) => api.changeScope(p.id, scopeId, { läge }, vem));
      if (uppdatering) {
        flytt = {
          text: `${s.namn} flyttad ${s.läge} → ${läge} · Uppdatering i ${p.namn}`,
          projektId: p.id,
          uppdateringId: uppdatering.id,
        };
      }
    } catch (e) {
      if (!(e instanceof Avbruten)) skrivFel = felText(e, "Kunde inte spara");
      throw e;
    } finally {
      await load();
    }
  }

  async function ångra() {
    const f = flytt!;
    try {
      await signatur.signera((vem) => api.ångra(f.projektId, f.uppdateringId, vem));
    } finally {
      await load();
    }
  }

  const stjärnRadie = (s: ScopeVy) => radie(dagarSedan(s.flyttad, new Date()));
</script>

<svelte:head><title>{karta ? `${karta.person.namn} · Apogee` : "Stjärnkarta · Apogee"}</title></svelte:head>

{#if saknas}
  <Saknas längre />
{:else if inaktiv}
  <div class="page">
    <div class="crumbs"><a href="/installningar/personer">Personer</a></div>
    <h1>{inaktiv}</h1>
    <p class="meta">
      {inaktiv} är inaktiv och har ingen Stjärnkarta. Återaktivera under
      <a href="/installningar/personer">Personer</a>.
    </p>
  </div>
{:else if loadError}
  <div class="page"><p class="error">{loadError}</p></div>
{:else if karta}
  {@const r = karta.räkning}
  <div class="page">
    <div class="crumbs"><a href="/installningar/personer">Personer</a></div>
    <h1>{karta.person.namn}</h1>
    <div class="summa">
      <div><b>{r.scopes}</b><span>Scopes</span></div>
      <div><b>{r.projekt}</b><span>Projekt</span></div>
      <div class:röd={r.stilla > 0}><b>{r.stilla}</b><span>stilla &gt; 14 d</span></div>
      {#if r.avslutade}<div><b>{r.avslutade}</b><span>{böj(r.avslutade, "avslutat Projekt", "avslutade Projekt")}</span></div>{/if}
    </div>

    <div class="filt">
      <span class="cap">Visar</span>
      <button class="quiet" class:on={!medAvslutade} aria-pressed={!medAvslutade} onclick={() => (medAvslutade = false)}
        >Pågående Projekt</button
      >
      {#if r.avslutade}
        <button class="quiet" class:on={medAvslutade} aria-pressed={medAvslutade} onclick={() => (medAvslutade = true)}
          >Med avslutade ({r.avslutade})</button
        >
      {/if}
    </div>

    {#if karta.projekt.length === 0}
      <p class="empty">{karta.person.namn} äger inga Scopes ännu.</p>
    {:else}
      <div class="skywrap">
        <div class="sky">
          <HillChart
            namn="{karta.person.namn}s Scopes"
            {scopes}
            tema={tema.nu}
            {valt}
            {märken}
            {dimmade}
            onvälj={(s) => (valt = s)}
            onflytta={flytta}
          />
          <p class="hint">Dra en stjärna för att ändra Läge. Ändringen sparas i Scopets Projekt och syns i dess Historik.</p>
          {#if skrivFel}<p class="error" role="alert">{skrivFel}</p>{/if}
        </div>
        <aside class="key" aria-label="Projekt">
          {#each visade as { p, glyf } (p.id)}
            <section class:avslutat={p.avslutat}>
              <div class="pk">
                <span class="glyph">{glyf}</span>
                <a href={projektHref(p)}>{p.namn}</a>
                <span class="cd"><Nedrakning nedräkning={p.nedräkning} nästaMilstolpe={p.nästaMilstolpe} liten /></span>
              </div>
              <ul>
                {#each p.scopes as s (s.id)}
                  <li class:valt={s.id === valt}>
                    <span class="dot" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16"
                        ><circle cx="8" cy="8" r={stjärnRadie(s) * 0.8} fill={lägeFärg(s.läge, tema.nu)} /></svg
                      >
                    </span>
                    <button class="länk" aria-pressed={s.id === valt} onclick={() => (valt = s.id === valt ? null : s.id)}
                      >{#if s.id === valt}<span class="vm" aria-hidden="true">✦</span>{/if}{s.namn}</button
                    >
                    <b>{s.läge}</b>
                    {#if s.stilla}<span class="stilla" title="Ingen rörelse på {s.stillaDagar} dagar">{s.stillaDagar} d</span>{/if}
                  </li>
                {/each}
              </ul>
            </section>
          {/each}
          <footer class="förklaring">
            <span class="cap">Läge</span>
            <div class="bar" style:background={rampGradient(tema.nu)}></div>
            <div class="ticks"><span>0 uppför</span><span>50 krön</span><span>100 klar</span></div>
            <p class="storlek">
              <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true"
                ><circle cx="9" cy="10" r={radie(0)} fill="var(--dim)" /><circle cx="25" cy="10" r={radie(30)} fill="var(--dim)" /></svg
              >
              Större stjärna = flyttad nyligen
            </p>
          </footer>
        </aside>
      </div>
    {/if}
  </div>
  {#if flytt}
    {#key flytt.uppdateringId}
      <Toast text={flytt.text} åtgärd="Ångra" ms={7000} onåtgärd={ångra} onstäng={() => (flytt = null)} />
    {/key}
  {/if}
{/if}

<style>
  h1 {
    margin-bottom: 14px;
  }
  .summa {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 28px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--line);
  }
  .summa div {
    display: flex;
    flex-direction: column;
  }
  .summa b {
    font: 600 22px Barlow, system-ui, sans-serif;
  }
  .summa span {
    font-size: 14px;
    color: var(--dim);
  }
  .summa .röd b {
    color: var(--redtx);
  }
  .filt {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 16px 0;
  }
  .filt .on {
    border-color: var(--btn);
    background: var(--sel);
    color: var(--tx);
  }
  .skywrap {
    display: grid;
    grid-template-columns: 1fr 330px;
    border: 1px solid var(--line);
  }
  .sky {
    min-width: 0;
    padding: 8px;
  }
  .hint {
    font-size: 14px;
    color: var(--dim);
    margin: 4px 12px 8px;
  }
  .key {
    background: var(--panel);
    padding: 16px;
    border-left: 1px solid var(--line);
  }
  section + section {
    margin-top: 18px;
  }
  section.avslutat {
    opacity: 0.6;
  }
  .pk {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .pk a {
    font-weight: 600;
  }
  .pk .cd {
    margin-left: auto;
  }
  .glyph {
    font: 700 11px Barlow, system-ui, sans-serif;
    color: var(--dim);
    width: 16px;
    flex: none;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 6px 0 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0 3px 22px;
    font-size: 15px;
  }
  /* Selected row: --sel ground and an accent edge, the same accent as its ring on the map. */
  li.valt {
    background: var(--sel);
    box-shadow: inset 2px 0 0 var(--red);
  }
  li.valt .länk {
    color: var(--tx);
  }
  .vm {
    color: var(--redtx);
    font-weight: 600;
    margin-right: 0.3em;
  }
  li b {
    margin-left: auto;
    font-weight: 600;
  }
  .dot {
    display: flex;
  }
  .stilla {
    color: var(--redtx);
    font-size: 13px;
  }
  .länk {
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .förklaring {
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
  .förklaring .bar {
    height: 8px;
    margin: 6px 0 4px;
  }
  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--dim);
  }
  .storlek {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--dim);
  }
  @media (max-width: 900px) {
    .skywrap {
      grid-template-columns: 1fr;
    }
    .key {
      border-left: 0;
      border-top: 1px solid var(--line);
    }
  }
  /* Phone (Q17 b): the key is where the thumb picks a Scope, so each row's
     button and the filter buttons get a 44 px tap target through padding. */
  @media (max-width: 600px) {
    li {
      padding-block: 0;
    }
    .länk {
      flex: 1 1 auto;
      min-height: 44px;
    }
    .filt button {
      min-height: 44px;
    }
  }
</style>
