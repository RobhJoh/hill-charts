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
      ws?.close();
      ws = undefined;
    },
  };
}
