// Live sync of the open Hill chart (#36): subscribes to one Projekt over a
// WebSocket. The server sends a message after every Uppdatering written to the
// Projekt's Historik; the page answers by re-fetching. On every (re)connect the
// page re-fetches too, so whatever happened while the socket was down is caught
// up. A dropped socket reconnects with backoff, until `stäng()`.

export type FöljAlternativ = {
  /** Called on every (re)connect and every Uppdatering; the page re-fetches. */
  onÄndring: () => void;
  /** Injected for tests; the browser's WebSocket by default. */
  WebSocket?: typeof WebSocket;
  /** Wait before reconnect attempt `n` (0-based). Default: 0.5s doubling, max 10s. */
  väntaMs?: (n: number) => number;
};

export type Följning = {
  /** Reconnects now if the socket is down (e.g. the page became visible again). */
  återanslut(): void;
  stäng(): void;
};

const standardVänta = (n: number) => Math.min(10_000, 500 * 2 ** n);

/** The live URL for a Projekt, on the page's own host. */
export function liveUrl(projektId: string, plats: Location = location): string {
  const protokoll = plats.protocol === "https:" ? "wss:" : "ws:";
  return `${protokoll}//${plats.host}/api/projekt/${encodeURIComponent(projektId)}/live`;
}

export function följProjekt(url: string, alt: FöljAlternativ): Följning {
  const Ws = alt.WebSocket ?? WebSocket;
  const vänta = alt.väntaMs ?? standardVänta;
  let ws: WebSocket | undefined;
  let försök = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stängd = false;

  function anslut() {
    clearTimeout(timer);
    timer = undefined;
    if (stängd) return;
    const socket = new Ws(url);
    ws = socket;
    socket.onopen = () => {
      försök = 0;
      alt.onÄndring();
    };
    socket.onmessage = () => alt.onÄndring();
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (ws !== socket || stängd) return;
      ws = undefined;
      timer = setTimeout(anslut, vänta(försök++));
    };
  }

  anslut();
  return {
    återanslut() {
      if (!stängd && ws === undefined) anslut();
    },
    stäng() {
      stängd = true;
      clearTimeout(timer);
      const socket = ws;
      ws = undefined;
      if (!socket) return;
      socket.onmessage = null;
      // Closing a socket that is still connecting makes the browser warn; let it
      // open (or fail) first, then close it without telling the page.
      if (socket.readyState === 0) {
        socket.onopen = () => socket.close();
        socket.onerror = null;
      } else socket.close();
    },
  };
}

/**
 * The Projekt a page should follow live: only once its first fetch has
 * succeeded, and only while it is Pågående (an Avslutat Projekt is read-only,
 * a missing one has nothing to follow).
 */
export function liveMål(projekt: { id: string; avslutat: boolean } | undefined): string | undefined {
  return projekt && !projekt.avslutat ? projekt.id : undefined;
}

/**
 * Follows Projekt live for a page: `onÄndring` on every (re)connect and
 * Uppdatering. Mobile browsers and webviews drop sockets in the background,
 * so it reconnects when the page is visible again or the network returns.
 * Returns the stop function (an `$effect` cleanup).
 */
export function följLive(projektIds: readonly string[], onÄndring: () => void): () => void {
  const följ = projektIds.map((id) => följProjekt(liveUrl(id), { onÄndring }));
  const återanslut = () => följ.forEach((f) => f.återanslut());
  const synlig = () => {
    if (document.visibilityState === "visible") återanslut();
  };
  document.addEventListener("visibilitychange", synlig);
  window.addEventListener("online", återanslut);
  return () => {
    document.removeEventListener("visibilitychange", synlig);
    window.removeEventListener("online", återanslut);
    följ.forEach((f) => f.stäng());
  };
}

/**
 * A page's load that live sync may fire in quick succession: only the latest
 * call's answer (or error) is handled; an overtaken one is dropped. `svar`
 * gets `aktuell()` to re-check after awaiting more.
 */
export function senasteLaddning<T>(
  hämta: () => Promise<T>,
  hantera: {
    svar: (värde: T, aktuell: () => boolean) => void | Promise<void>;
    fel: (e: unknown) => void | Promise<void>;
  },
): () => Promise<void> {
  let senaste = 0;
  return async () => {
    const denna = ++senaste;
    const aktuell = () => denna === senaste;
    try {
      const värde = await hämta();
      if (aktuell()) await hantera.svar(värde, aktuell);
    } catch (e) {
      if (aktuell()) await hantera.fel(e);
    }
  };
}
