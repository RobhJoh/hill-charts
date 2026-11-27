import { describe, expect, it } from "vitest";
import { följProjekt, liveMål } from "./live.js";

/** A stand-in for the browser's WebSocket: the test decides when it opens. */
class FalskSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static alla: FalskSocket[] = [];
  readyState = FalskSocket.CONNECTING;
  stängdFöreÖppning = false;
  stängd = false;
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) {
    FalskSocket.alla.push(this);
  }
  close() {
    if (this.readyState === FalskSocket.CONNECTING) this.stängdFöreÖppning = true;
    this.stängd = true;
    this.readyState = 3;
    this.onclose?.();
  }
  öppna() {
    this.readyState = FalskSocket.OPEN;
    this.onopen?.();
  }
}

const följ = (onÄndring = () => {}) => {
  FalskSocket.alla = [];
  return följProjekt("ws://x/api/projekt/a/live", {
    onÄndring,
    WebSocket: FalskSocket as unknown as typeof WebSocket,
    väntaMs: () => 0,
  });
};

describe("Live-följning", () => {
  it("stopped while still connecting: never closes an unopened socket, closes it once it opens, and stays quiet", () => {
    let ändringar = 0;
    const f = följ(() => ändringar++);
    const socket = FalskSocket.alla[0]!;
    f.stäng();
    expect(socket.stängdFöreÖppning).toBe(false);
    socket.öppna();
    expect(socket.stängd).toBe(true);
    expect(socket.stängdFöreÖppning).toBe(false);
    expect(ändringar).toBe(0);
    expect(FalskSocket.alla).toHaveLength(1);
  });

  it("stopped after opening: closes the socket and does not reconnect", () => {
    const f = följ();
    const socket = FalskSocket.alla[0]!;
    socket.öppna();
    f.stäng();
    expect(socket.stängd).toBe(true);
    expect(FalskSocket.alla).toHaveLength(1);
  });
});

describe("Vilket Projekt sidan följer live", () => {
  it("none before the first fetch has succeeded (also when the Projekt is missing)", () => {
    expect(liveMål(undefined)).toBeUndefined();
  });

  it("a Pågående Projekt is followed", () => {
    expect(liveMål({ id: "p1", avslutat: false })).toBe("p1");
  });

  it("an Avslutat Projekt is not followed", () => {
    expect(liveMål({ id: "p1", avslutat: true })).toBeUndefined();
  });
});
