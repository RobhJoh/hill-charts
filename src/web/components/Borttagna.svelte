<script lang="ts">
  import { felText } from "../lib/fel.js";
  // "Borttagna Projekt" / "Borttagna Funktionsområden": when each left Notion,
  // with Radera. They come back by themselves when they return in Notion
  // (#76). Radera is confirmed by typing the name, and lists what goes with it
  // (`följer`).
  import type { BorttagenVy } from "../../core/index.js";
  import { Avbruten } from "../lib/signatur.svelte.js";

  type Rad = { id: string; namn: string; borttagen: BorttagenVy; följer?: string[] };
  type Props = {
    rubrik: string;
    rader: Rad[];
    onradera: (id: string, namn: string) => Promise<void>;
  };
  let { rubrik, rader, onradera }: Props = $props();

  let raderar = $state<string | null>(null);
  let bekräftelse = $state("");
  let fel = $state("");
  let busy = $state(false);

  const datum = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" });

  async function kör(action: () => Promise<void>) {
    busy = true;
    fel = "";
    try {
      await action();
      raderar = null;
    } catch (e) {
      if (!(e instanceof Avbruten)) fel = felText(e);
    } finally {
      busy = false;
    }
  }

  function öppnaRadera(id: string) {
    raderar = id;
    bekräftelse = "";
    fel = "";
  }

  function radera(event: SubmitEvent, rad: Rad) {
    event.preventDefault();
    void kör(() => onradera(rad.id, bekräftelse));
  }
</script>

{#if rader.length > 0}
  <section aria-labelledby="borttagna-rubrik">
    <h2 id="borttagna-rubrik">{rubrik}</h2>
    <ul>
      {#each rader as rad (rad.id)}
        <li>
          <div class="rad">
            <div>
              <span class="namn">{rad.namn}</span>
              <span class="meta"
                >Inte längre i Notion · {datum.format(new Date(rad.borttagen.tid))}</span
              >
            </div>
            <div class="knappar">
              <button class="quiet" disabled={busy} onclick={() => öppnaRadera(rad.id)}>Radera</button>
            </div>
          </div>
          {#if raderar === rad.id}
            <form onsubmit={(e) => radera(e, rad)}>
              <p>
                Radera <strong>{rad.namn}</strong> för gott? Det går inte att ångra.
                {#if rad.följer?.length}
                  Dessa Projekt raderas också:
                {/if}
              </p>
              {#if rad.följer?.length}
                <ul class="följer">
                  {#each rad.följer as namn, i (i)}<li>{namn}</li>{/each}
                </ul>
              {/if}
              <label>
                <span class="cap">Skriv namnet för att radera</span>
                <!-- svelte-ignore a11y_autofocus -->
                <input bind:value={bekräftelse} autocomplete="off" autofocus />
              </label>
              <div class="knappar">
                <button class="pr" disabled={busy || bekräftelse.trim() !== rad.namn}>Radera för gott</button>
                <button type="button" onclick={() => (raderar = null)}>Avbryt</button>
              </div>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
    {#if fel}<p class="error" role="alert">{fel}</p>{/if}
  </section>
{/if}

<style>
  section {
    margin-top: 56px;
  }
  h2 {
    font: 600 15px Barlow, system-ui, sans-serif;
    color: var(--dim);
    border-bottom: 1px solid var(--line);
    padding-bottom: 8px;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    border-bottom: 1px solid var(--line);
    padding: 10px 0;
  }
  .rad {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .namn {
    display: block;
    font-weight: 600;
  }
  .meta {
    color: var(--dim);
    font-size: 13px;
  }
  .knappar {
    display: flex;
    gap: 8px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
    max-width: 420px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  ul.följer {
    list-style: disc;
    padding-left: 20px;
  }
  ul.följer li {
    border: none;
    padding: 0;
  }
</style>
