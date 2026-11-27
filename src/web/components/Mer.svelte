<script lang="ts" module>
  /** One action in the Mer menu. */
  export type MerPost = {
    text: string;
    gör: () => void;
    /** Shown in the accent text colour: Ta bort. */
    farlig?: boolean;
    /** Why the action isn't possible now: the item is inactive with this beside it. */
    spärr?: string | null;
    /** A small heading above this item, e.g. "Tidsplan". */
    grupp?: string;
    /** A line above this item. */
    avdelare?: boolean;
  };
</script>

<script lang="ts">
  // "Mer" by the page heading (Q5 a, Q18 b): the rare actions behind one
  // button. Opens a menu; arrow keys move, Esc and a click outside close it.
  import { menyFokus } from "../lib/mer.js";
  import { stängVidKlickUtanför } from "../lib/popover.js";

  let { poster, höger = false }: { poster: MerPost[]; /** Open towards the left (button at the right). */ höger?: boolean } =
    $props();

  let öppen = $state(false);
  let knapp = $state<HTMLButtonElement>();
  let meny = $state<HTMLDivElement>();
  const uid = $props.id();

  const objekt = () => [...(meny?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];

  /** Horizontal shift that keeps the menu 16 px inside the screen edges (phone). */
  let skjut = $state(0);

  function öppna() {
    skjut = 0;
    öppen = true;
    // Once the menu is drawn: keep it on screen, then focus the first item.
    queueMicrotask(() => {
      const r = meny?.getBoundingClientRect();
      if (r) skjut = r.left < 16 ? 16 - r.left : r.right > innerWidth - 16 ? innerWidth - 16 - r.right : 0;
      objekt()[0]?.focus();
    });
  }

  function stäng(fokusTillbaka = true) {
    öppen = false;
    if (fokusTillbaka) knapp?.focus();
  }

  function välj(post: MerPost) {
    if (post.spärr) return;
    stäng();
    post.gör();
  }

  function tangent(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      stäng();
      return;
    }
    if (event.key === "Tab") {
      stäng(false);
      return;
    }
    const alla = objekt();
    const nästa = menyFokus(alla.indexOf(document.activeElement as HTMLButtonElement), alla.length, event.key);
    if (nästa !== null) {
      event.preventDefault();
      alla[nästa]?.focus();
    }
  }

  function knappTangent(event: KeyboardEvent) {
    if (event.key === "ArrowDown" && !öppen) {
      event.preventDefault();
      öppna();
    }
  }

  // A click anywhere outside closes the menu.
  $effect(() => {
    if (!öppen) return;
    return stängVidKlickUtanför(() => [meny, knapp], () => stäng(false));
  });
</script>

<span class="mer">
  <button
    bind:this={knapp}
    class="quiet"
    class:öppen
    aria-haspopup="menu"
    aria-expanded={öppen}
    aria-controls="{uid}-meny"
    onclick={() => (öppen ? stäng() : öppna())}
    onkeydown={knappTangent}
  >
    Mer <span class="pil" aria-hidden="true">▾</span>
  </button>
  {#if öppen}
    <div bind:this={meny} id="{uid}-meny" class="meny" class:höger style:translate={skjut ? `${skjut}px 0` : undefined} role="menu" aria-label="Fler handlingar" tabindex="-1" onkeydown={tangent}>
      {#each poster as post, i (post.text)}
        {#if post.avdelare}<hr />{/if}
        {#if post.grupp}<div class="grupp" aria-hidden="true">{post.grupp}</div>{/if}
        <button
          role="menuitem"
          class:farlig={post.farlig}
          aria-disabled={post.spärr ? "true" : undefined}
          aria-describedby={post.spärr ? `${uid}-spärr-${i}` : undefined}
          onclick={() => välj(post)}
        >
          {post.text}
        </button>
        {#if post.spärr}<p class="spärr" id="{uid}-spärr-{i}">{post.spärr}</p>{/if}
      {/each}
    </div>
  {/if}
</span>

<style>
  .mer {
    position: relative;
    display: inline-block;
  }
  button.öppen {
    color: var(--tx);
    border-color: var(--line);
  }
  .pil {
    display: inline-block;
    font-size: 11px;
    transition: transform 0.15s;
  }
  .öppen .pil {
    transform: rotate(180deg);
  }
  .meny {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 5;
    min-width: 210px;
    max-width: calc(100vw - 32px);
    padding: 6px 0;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 2px;
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
  }
  .meny.höger {
    left: auto;
    right: 0;
  }
  .meny:focus {
    outline: none;
  }
  .grupp {
    padding: 6px 16px 2px;
    font-size: 12px;
    font-weight: 600;
    color: var(--dim);
  }
  .meny button {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    border-radius: 0;
    padding: 8px 16px;
    min-height: 40px;
    color: var(--mid);
    font-weight: 500;
  }
  .meny button:hover:not([aria-disabled]),
  .meny button:focus-visible {
    background: var(--sel);
    color: var(--tx);
  }
  .meny button:focus-visible {
    outline-offset: -2px;
  }
  .meny button.farlig {
    color: var(--redtx);
  }
  .meny button[aria-disabled] {
    color: var(--dim);
    cursor: not-allowed;
  }
  .spärr {
    margin: -4px 0 4px;
    padding: 0 16px 6px;
    max-width: 280px;
    font-size: 13px;
    color: var(--dim);
  }
  hr {
    border: none;
    border-top: 1px solid var(--line);
    margin: 6px 0;
  }
</style>
