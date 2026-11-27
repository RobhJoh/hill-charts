<script lang="ts">
  import { tick } from "svelte";
  import { felText } from "../lib/fel.js";
  import type { Förhandsvisning, HistorikRad, Översikt, PersonVy, ProjektRad, ProjektVy } from "../../core/index.js";
  import HillChart from "../components/HillChart.svelte";
  import HistorikPanel from "../components/HistorikPanel.svelte";
  import MiniHill from "../components/MiniHill.svelte";
  import Nedrakning from "../components/Nedrakning.svelte";
  import Tidsplan from "../components/Tidsplan.svelte";
  import Toast from "../components/Toast.svelte";
  import { beskrivRad, skillnaderMotNu, UTAN_NAMN, visaTid } from "../lib/historik.js";
  import { visaDatum } from "../lib/datum.js";
  import NamnForm from "../components/NamnForm.svelte";
  import ScopeIndex from "../components/ScopeIndex.svelte";
  import TaBort from "../components/TaBort.svelte";
  import Borttaget from "../components/Borttaget.svelte";
  import KopieraLank from "../components/KopieraLank.svelte";
  import BaddaIn from "../components/BaddaIn.svelte";
  import Mer, { type MerPost } from "../components/Mer.svelte";
  import { api, ApiError } from "../lib/api.js";
  import { följLive, liveMål, senasteLaddning } from "../lib/live.js";
  import { Avbruten, laddaPersoner, signatur } from "../lib/signatur.svelte.js";
  import { tema } from "../lib/tema.svelte.js";
  import type { Flytt } from "../lib/vemremsa.js";
  import { funktionsområdeHref, projektHref } from "../lib/links.js";
  import { router } from "../lib/router.svelte.js";
  import StillaAntal from "../components/StillaAntal.svelte";
  import { grannar as ordnaGrannar } from "../lib/grannar.js";
  import Saknas from "./Saknas.svelte";
  import { avslutatStatus } from "../lib/avslutat.js";

  let { id }: { id: string } = $props();

  let projekt = $state<ProjektVy | undefined>();
  let saknas = $state(false);
  let loadError = $state("");
  let läge = $state<"visa" | "byt namn" | "flytta">("visa");
  let funktionsområden = $state<Översikt>([]);
  let flyttaTill = $state("");
  let flyttError = $state("");
  let personer = $state<PersonVy[]>([]);
  let valt = $state<string | null>(null);
  let nyScope = $state(false);
  let skrivFel = $state("");
  /** The other Projekt in the same Funktionsområde: pågående as mini charts, Avslutade last (Q12 a). */
  let grannar = $state<ProjektRad[]>([]);
  /** Whether the Funktionsområde is Borttaget too (then its Borttagna list is on the start page). */
  let foBorttaget = $state(false);
  /** Marked Avslutat (Q8 b): read-only, stars dimmed and still, until Öppna igen. */
  const stängt = $derived(projekt?.markeradAvslutat ?? false);

  // --- Page head (Q5 a): the rare actions in Mer; dates and Milstolpar fold out ---
  let länk = $state<ReturnType<typeof KopieraLank>>();
  let bädda = $state<ReturnType<typeof BaddaIn>>();
  let taBortÖppen = $state(false);
  let tidÖppen = $state(false);

  const mer = $derived.by((): MerPost[] => {
    if (!projekt) return [];
    return [
      { text: "Byt namn", gör: () => (läge = "byt namn") },
      { text: "Flytta", gör: () => void öppnaFlytta() },
      { text: "Kopiera länk", gör: () => void länk?.kopiera() },
      { text: "Bädda in", gör: () => bädda?.öppna() },
      ...(projekt.markeradAvslutat
        ? []
        : [{ avdelare: true, text: "Markera Avslutat", gör: () => void växlaAvslutat(true) }]),
      { avdelare: true, text: "Ta bort", farlig: true, gör: () => (taBortÖppen = true) },
    ];
  });

  /** Reloads the Projekt and its Hill chart (after a write, and on live sync). */
  const load = senasteLaddning(() => api.getProjekt(id), {
    async svar(svar, aktuell) {
      projekt = svar;
      // Canonical URL in the address bar (the server redirects; client-side links may be stale).
      const href = projektHref(svar);
      if (router.route.sida === "projekt" && location.pathname !== href) {
        router.navigate(href + location.search + location.hash, { replace: true });
      }
      const fo = await api.getFunktionsområde(svar.funktionsområde.id).catch(() => undefined);
      if (aktuell() && fo) {
        grannar = ordnaGrannar(fo.projekt, id);
        foBorttaget = !!fo.borttagen;
      }
    },
    fel(e) {
      if (e instanceof ApiError && e.status === 404) saknas = true;
      else loadError = felText(e, "Kunde inte läsa in");
    },
  });
  load();
  // Live sync (#36): re-fetch whenever anyone writes to this Projekt's Historik,
  // and on every (re)connect to catch up on what happened while offline.
  // Only once the first fetch succeeded and while the Projekt is Pågående.
  const följId = $derived(liveMål(saknas ? undefined : projekt));
  $effect(() => (följId ? följLive([följId], () => void load()) : undefined));
  laddaPersoner()
    .then((p) => (personer = p))
    .catch(() => {});

  /** Runs a signed chart edit, then reloads. Errors reach the caller (and are shown). */
  async function redigera<T>(edit: (vem: string) => Promise<T>, flytt?: Flytt): Promise<T> {
    try {
      return await signatur.signera(edit, flytt);
    } finally {
      await load();
      personer = await laddaPersoner().catch(() => personer);
    }
  }

  async function flyttaScope(scopeId: string, läge: number) {
    skrivFel = "";
    try {
      const namn = projekt?.scopes.find((s) => s.id === scopeId)?.namn ?? "";
      await redigera((vem) => api.changeScope(id, scopeId, { läge }, vem), { scopeId, namn, läge });
    } catch (e) {
      if (!(e instanceof Avbruten)) skrivFel = felText(e, "Kunde inte spara");
      throw e;
    }
  }

  // --- Historik (#35): panel, Visa preview, Återställ hit, Ångra, Ångra toast ---
  let historikÖppen = $state(false);
  let visning = $state<{ rad: HistorikRad<PersonVy>; vy: Förhandsvisning } | null>(null);
  /** The Uppdatering the toast's Ångra would undo, e.g. "Scope borttagen · Ångra". */
  let ångraToast = $state<{ text: string; mål: string } | null>(null);
  let visningRuta = $state<HTMLElement | undefined>();

  async function visa(rad: HistorikRad<PersonVy> | null) {
    visning = rad ? { rad, vy: await api.förhandsvisa(id, rad.id) } : null;
    // The banner and chart may be off screen (a phone, or a long page): bring them in.
    if (visning) {
      await tick();
      visningRuta?.scrollIntoView({ block: "nearest" });
    }
  }

  /** Återställ hit, only from the Visa banner (Q7 a); then "Diagrammet återställt · Ångra". */
  async function återställ(uppdateringId: string) {
    skrivFel = "";
    try {
      const { uppdatering } = await redigera((vem) => api.återställHit(id, uppdateringId, vem));
      visning = null;
      if (uppdatering) ångraToast = { text: "Diagrammet återställt", mål: uppdatering.id };
    } catch (e) {
      if (!(e instanceof Avbruten)) skrivFel = felText(e, "Kunde inte återställa");
    }
  }

  async function ångra(uppdateringId: string) {
    await redigera((vem) => api.ångra(id, uppdateringId, vem));
    visning = null;
  }

  async function taBort(scopeId: string) {
    const { uppdatering } = await redigera((vem) => api.removeScope(id, scopeId, vem));
    ångraToast = { text: "Scope borttagen", mål: uppdatering.id };
  }

  /** Ta bort a Milstolpe at once, like a Scope, with "Milstolpe borttagen · Ångra". */
  async function taBortMilstolpe(milstolpeId: string) {
    const { uppdatering } = await redigera((vem) => api.removeMilstolpe(tidMål, milstolpeId, vem));
    if (uppdatering) ångraToast = { text: "Milstolpe borttagen", mål: uppdatering.id };
  }

  function stängHistorik() {
    historikÖppen = false;
    visning = null;
  }

  async function läggTill(namn: string, ägare: string) {
    let nytt: string | undefined;
    await redigera(async (vem) => (nytt = (await api.addScope(id, namn, ägare, vem)).id));
    valt = nytt ?? null;
  }

  /** Markera Avslutat / Öppna igen. */
  async function växlaAvslutat(markera: boolean) {
    skrivFel = "";
    try {
      await redigera((vem) => (markera ? api.markAvslutat(id, vem) : api.reopenProjekt(id, vem)));
    } catch (e) {
      if (!(e instanceof Avbruten)) skrivFel = felText(e, "Kunde inte spara");
    }
  }

  /** Återställ a Borttaget Projekt from its own page (same command as in the Borttagna list). */
  async function återställProjekt() {
    await signatur.signera((vem) => api.återställProjekt(id, vem));
    await load();
  }

  /** Ta bort: hides the Projekt; it is listed under Borttagna Projekt on its Funktionsområde page. */
  async function taBortProjekt() {
    const p = projekt;
    if (!p) return;
    await signatur.signera((vem) => api.taBortProjekt(id, vem));
    router.navigate(funktionsområdeHref(p.funktionsområde));
  }

  // --- Dates and Milstolpar (#38): Uppdateringar in the Historik ---
  const tidMål = $derived({ projekt: id });

  async function bytNamn(namn: string) {
    await signatur.signera((vem) => api.renameProjekt(id, namn, vem));
    await load();
    läge = "visa";
    if (projekt) router.navigate(projektHref(projekt), { replace: true });
  }

  async function öppnaFlytta() {
    funktionsområden = await api.overview();
    flyttaTill = "";
    flyttError = "";
    läge = "flytta";
  }

  async function flytta(event: SubmitEvent) {
    event.preventDefault();
    if (!flyttaTill) return;
    try {
      await signatur.signera((vem) => api.moveProjekt(id, flyttaTill, vem));
      await load();
      läge = "visa";
    } catch (e) {
      flyttError = felText(e, "Kunde inte flytta");
    }
  }
</script>

<svelte:head>
  <title>{projekt?.borttagen ? "Projektet är borttaget · Apogee" : projekt ? `${projekt.namn} · Apogee` : "Apogee"}</title>
</svelte:head>

{#if saknas}
  <Saknas vad="Projektet" />
{:else}
  {#if loadError}
    <div class="page"><p class="error">{loadError}</p></div>
  {:else if projekt?.borttagen}
    <Borttaget
      rubrik="Projektet är borttaget"
      namn={projekt.namn}
      borttagen={projekt.borttagen}
      onåterställ={foBorttaget ? undefined : återställProjekt}
      lista={foBorttaget
        ? { href: "/", text: "Till Borttagna Funktionsområden" }
        : { href: funktionsområdeHref(projekt.funktionsområde), text: `Till Borttagna Projekt i ${projekt.funktionsområde.namn}` }}
    />
  {:else if projekt}
    <div class="projekt">
    <nav class="grannar" aria-label="Andra Projekt i {projekt.funktionsområde.namn}">
      <div class="cap">Andra Projekt i {projekt.funktionsområde.namn}</div>
      {#each grannar as g (g.id)}
        {#if g.avslutat}
          <!-- Avslutat (Q12 a): no mini chart, a light-blue ✦ and the word, in full contrast. -->
          <a href={projektHref(g)} class="avslutat">
            <span class="klar" aria-hidden="true">✦</span>
            <span>
              <span class="gnamn">{g.namn}</span>
              <span class="gstatus">Avslutat</span>
            </span>
          </a>
        {:else}
          <a href={projektHref(g)}>
            <MiniHill scopes={g.scopes} tema={tema.nu} width={160} height={46} />
            <span class="gnamn">{g.namn}</span>
            {#if g.stilla > 0}<span class="stilla"><StillaAntal antal={g.stilla} /></span>{/if}
            <Nedrakning nedräkning={g.nedräkning} nästaMilstolpe={g.nästaMilstolpe} liten />
          </a>
        {/if}
      {:else}
        <p class="meta">Inga andra Projekt.</p>
      {/each}
    </nav>
    <div class="huvud">
      <nav class="crumbs" aria-label="Brödsmulor">
        <a href="/">Alla Funktionsområden</a>
        <span aria-hidden="true">/</span>
        <a href={funktionsområdeHref(projekt.funktionsområde)}>{projekt.funktionsområde.namn}</a>
      </nav>

      {#if läge === "byt namn"}
        <NamnForm
          label="Nytt namn på Projektet"
          value={projekt.namn}
          submitLabel="Spara"
          onsubmit={bytNamn}
          oncancel={() => (läge = "visa")}
        />
      {:else}
        <h1>{#if stängt}<span class="klar titelmärke" aria-hidden="true">✦</span>{/if}{projekt.namn}</h1>
        <!-- Title plus one row (Q5 a): status and time on the left, the actions on the right. -->
        <div class="statusrad">
          <div class="status">
            <span class:avslut={stängt}>{avslutatStatus(projekt)}</span>
            {#if stängt}
              <span class="lås">
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.4" />
                </svg>
                Skrivskyddat tills det öppnas igen
              </span>
            {/if}
            <!-- Avslutat is said once, in the status text: no countdown "Avslutat" here.
                 Under Visa, now's time is dimmed (the banner shows the time then). -->
            <span class="nu" class:dämpad={!!visning}>
              <Nedrakning
                nedräkning={projekt.nedräkning?.läge === "avslutat" ? null : projekt.nedräkning}
                nästaMilstolpe={projekt.nästaMilstolpe}
              />
            </span>
            {#if !tidÖppen}
              {#each projekt.datumVarningar as v (v)}<span class="varning">· {v}</span>{/each}
            {/if}
            <button class="quiet" aria-expanded={tidÖppen} onclick={() => (tidÖppen = !tidÖppen)}>
              {stängt
                ? "Datum och Milstolpar"
                : projekt.tidsplan.startdatum || projekt.tidsplan.slutdatum || projekt.tidsplan.milstolpar.length > 0
                  ? "Ändra datum och Milstolpar"
                  : "Sätt datum"}
            </button>
          </div>
          <div class="primära">
            <Mer poster={mer} höger />
            <button aria-pressed={historikÖppen} onclick={() => (historikÖppen ? stängHistorik() : (historikÖppen = true))}>
              Historik
            </button>
            {#if stängt}
              <button class="pr" onclick={() => växlaAvslutat(false)}>Öppna igen</button>
            {:else}
              <button
                class="pr"
                aria-pressed={nyScope}
                aria-controls="ny-scope"
                disabled={!!visning}
                onclick={() => (nyScope = !nyScope)}>Ny Scope</button
              >
            {/if}
          </div>
        </div>
        <div class="utfall">
          <KopieraLank bind:this={länk} knapp={false} href={projektHref(projekt)} />
          <BaddaIn bind:this={bädda} knapp={false} namn={projekt.namn} href={projektHref(projekt)} />
          {#if taBortÖppen}
            <TaBort
              bind:öppen={taBortÖppen}
              knapp={false}
              fråga="Ta bort {projekt.namn} med {projekt.scopes.length} {projekt.scopes.length === 1 ? 'Scope' : 'Scopes'}?"
              ontabort={taBortProjekt}
            />
          {/if}
        </div>
        {#if tidÖppen}
        <!-- Under Visa the banner is the only time shown (now's dates are dimmed and inert). -->
        <div class="tid" class:dämpad={!!visning} inert={!!visning}>
          <Tidsplan
            tidsplan={projekt.tidsplan}
            varningar={projekt.datumVarningar}
            skrivskyddad={stängt}
            onsätt={(input) => redigera((vem) => api.setDatum(tidMål, input, vem))}
            onlägg={(m) => redigera((vem) => api.addMilstolpe(tidMål, m, vem))}
            onändra={(mid, ä) => redigera((vem) => api.changeMilstolpe(tidMål, mid, ä, vem))}
            ontabort={taBortMilstolpe}
          />
        </div>
        {/if}
      {/if}

      {#if läge === "flytta"}
        <form class="flytta" onsubmit={flytta}>
          <label>
            <span class="cap">Flytta till Funktionsområde</span>
            <select bind:value={flyttaTill} required>
              <option value="" disabled>Välj …</option>
              {#each funktionsområden as fo (fo.id)}
                <option value={fo.id} disabled={fo.id === projekt.funktionsområde.id}>{fo.namn}</option>
              {/each}
            </select>
          </label>
          <button class="pr" disabled={!flyttaTill}>Flytta</button>
          <button type="button" onclick={() => (läge = "visa")}>Avbryt</button>
          {#if flyttError}<p class="error" role="alert">{flyttError}</p>{/if}
        </form>
      {/if}

      {#if visning}
        {@const namn = (pid: string) => personer.find((p) => p.id === pid)?.namn ?? "Okänd"}
        {@const vy = visning.vy}
        {@const samma = vy.sammaSomNu}
        <div class="visning" role="status" bind:this={visningRuta}>
          <span>
            Visar läget efter: <strong>{visning.rad.vem?.namn ?? UTAN_NAMN}</strong>
            {beskrivRad(visning.rad, namn)} · {visaTid(visning.rad.tid)}.
            {skillnaderMotNu(vy).join(" ")}
          </span>
          <span class="då">
            <span>
              {#if vy.tidsplan.startdatum || vy.tidsplan.slutdatum}
                {vy.tidsplan.startdatum ? visaDatum(vy.tidsplan.startdatum) : "…"} –
                {vy.tidsplan.slutdatum ? visaDatum(vy.tidsplan.slutdatum) : "…"}
              {:else}
                Inga datum
              {/if}
            </span>
            {#each vy.tidsplan.milstolpar as m (m.id)}
              <span class:skiljer={vy.milstolparSkiljer.includes(m.id)}>◆ {m.namn} {visaDatum(m.datum)}</span>
            {/each}
          </span>
          <button class="pr" disabled={samma} onclick={() => återställ(visning!.rad.id)}>
            Återställ hit
          </button>
          <button class="quiet" onclick={() => (visning = null)}>Tillbaka till nu</button>
        </div>
        <div class="chart">
          <HillChart namn={projekt.namn} scopes={visning.vy.scopes} tema={tema.nu} markerade={visning.vy.skiljer} />
        </div>
      {:else}
        <div class="chart">
          <HillChart
            namn={projekt.namn}
            scopes={projekt.scopes}
            tema={tema.nu}
            {valt}
            onvälj={(s) => (valt = s)}
            onflytta={stängt ? undefined : flyttaScope}
            dimmade={stängt ? projekt.scopes.map((s) => s.id) : []}
            väntar={signatur.hållen?.scopeId}
          />
        </div>
        {#if !stängt}
          <!-- Right under the chart (Q19 a); the arrow keys only where there is a keyboard-like pointer. -->
          <p class="dra">
            Dra en stjärna längs banan för att ändra dess Läge.<span class="tangenter">
              Markera och använd piltangenterna (Shift = 10 steg).</span
            >
          </p>
        {/if}
      {/if}
      {#if skrivFel}<p class="error" role="alert">{skrivFel}</p>{/if}
    </div>

    <aside>
      <div class="sido">
      {#if historikÖppen}
        <HistorikPanel
          projektId={id}
          {personer}
          version={projekt}
          visad={visning?.rad.id ?? null}
          onvisa={visa}
          onångra={ångra}
          onstäng={stängHistorik}
        />
      {:else}
      <ScopeIndex
        scopes={projekt.scopes}
        {personer}
        tema={tema.nu}
        {valt}
        bind:nyScope
        skrivskyddad={stängt}
        onvälj={(s) => (valt = s)}
        onlägg={läggTill}
        onbytnamn={(scopeId, namn) => redigera((vem) => api.changeScope(id, scopeId, { namn }, vem))}
        onbytägare={(scopeId, ägare) => redigera((vem) => api.changeScope(id, scopeId, { ägare }, vem))}
        ontabort={taBort}
      />
      {/if}
      </div>
    </aside>
    </div>
    {#if ångraToast}
      {@const { text, mål } = ångraToast}
      {#key mål}
        <Toast {text} åtgärd="Ångra" onåtgärd={() => ångra(mål)} onstäng={() => (ångraToast = null)} />
      {/key}
    {/if}
  {/if}
{/if}

<style>
  .crumbs {
    display: flex;
    gap: 8px;
  }
  .flytta {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    margin: 16px 0;
  }
  .flytta label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 240px;
  }
  .flytta p {
    flex-basis: 100%;
  }
  .projekt {
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr) minmax(320px, 360px);
    min-height: calc(100vh - 56px);
  }
  .grannar {
    border-right: 1px solid var(--line);
    padding: 28px 18px;
  }
  .grannar .cap {
    margin-bottom: 10px;
  }
  .grannar a {
    display: block;
    padding: 8px 6px;
    text-decoration: none;
    color: var(--tx);
    border-bottom: 1px solid var(--line);
  }
  .grannar a:hover {
    background: var(--sel);
  }
  .grannar a.avslutat {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  .klar {
    color: var(--klar);
  }
  .titelmärke {
    margin-right: 0.25em;
  }
  .gstatus {
    display: block;
    font-size: 13px;
    color: var(--mid);
  }
  .grannar :global(svg) {
    display: block;
  }
  .gnamn {
    display: block;
    font-weight: 600;
    font-size: 14px;
  }
  .stilla {
    font-size: 13px;
    color: var(--redtx);
  }
  h1 {
    overflow-wrap: anywhere;
  }
  .statusrad {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 8px;
  }
  .status {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 18px;
    color: var(--dim);
    font-size: 14px;
    min-width: 0;
  }
  .varning {
    color: var(--mid);
    font-style: italic;
  }
  .utfall {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 14px;
  }
  /* The quiet ending of an Avslutat Projekt: said once, in full contrast. */
  .status .avslut {
    color: var(--tx);
    font-weight: 600;
  }
  .lås {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .tid {
    margin-top: 8px;
  }
  .huvud {
    padding: 28px 28px 48px;
    min-width: 0;
  }
  aside {
    background: var(--panel);
    border-left: 1px solid var(--line);
  }
  /* Sticky under the site header with its own scroll, so the chart and the
     Visa banner stay in view beside a Historik row far down the list. */
  .sido {
    position: sticky;
    top: 56px;
    max-height: calc(100vh - 56px);
    overflow: auto;
    padding: 28px 22px;
  }
  /* Mer, Historik and Ny Scope always stay together, at the right. */
  .primära {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    flex: none;
  }
  .visning {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    padding: 10px 14px;
    border: 1px dashed var(--orbit);
    background: var(--sel);
    /* Scrolled into view on Visa: clear of the sticky site header. */
    scroll-margin-top: 72px;
  }
  .visning > span {
    flex: 1 1 280px;
  }
  .visning .då {
    flex-basis: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: 13px;
    color: var(--dim);
  }
  /* What differs from now: bold with a small dot, not a dashed frame (it read as a button). */
  .visning .skiljer {
    color: var(--tx);
    font-weight: 600;
  }
  .visning .skiljer::before {
    content: "•";
    margin-right: 4px;
  }
  .tid.dämpad,
  .nu.dämpad {
    opacity: 0.4;
  }
  .nu {
    display: inline-flex;
  }
  .chart {
    margin-top: 20px;
    border: 1px solid var(--line);
    background: var(--chart-ground);
  }
  .dra {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--dim);
  }
  /* A touch screen has no arrow keys. */
  @media not (any-pointer: fine) {
    .tangenter {
      display: none;
    }
  }
  /* Three columns only from 1200 px: below that the side column would squeeze
     the Hill chart. Between 900 and 1200 px the other Projekt move under the
     chart (as on the phone) and the Scope index keeps its side column. */
  @media (max-width: 1200px) {
    .projekt {
      grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
      grid-template-rows: auto 1fr;
      grid-template-areas:
        "huvud aside"
        "grannar aside";
    }
    .huvud {
      grid-area: huvud;
    }
    aside {
      grid-area: aside;
    }
    .grannar {
      grid-area: grannar;
      border-right: none;
      border-top: 1px solid var(--line);
      padding: 20px 28px 48px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      column-gap: 14px;
      align-content: start;
    }
    .grannar .cap,
    .grannar .meta {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 900px) {
    .projekt {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: none;
      grid-template-areas: none;
      min-height: 0;
    }
    .huvud,
    aside,
    .grannar {
      grid-area: auto;
    }
    /* The other Projekt stack below the Scope index on the phone. */
    .grannar {
      order: 3;
      padding: 20px 16px 64px;
    }
    .huvud {
      padding: 20px 16px 24px;
    }
    aside {
      border-left: none;
      border-top: 1px solid var(--line);
    }
    .sido {
      position: static;
      max-height: none;
      overflow: visible;
      padding: 20px 16px 32px;
    }
  }
</style>
