// The Projekt page's status line (#62, Q8 b): Avslutat is said once, with a
// quiet ending taken from the Historik ("Avslutat 12 nov. av Bo Ek").
import type { DiagramVy } from "../../core/index.js";

const dagFormat = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });

export function avslutatText({ avslutat, avslutadAv }: Pick<DiagramVy, "avslutat" | "avslutadAv">): string {
  if (!avslutat) return "Pågående";
  if (!avslutadAv) return "Avslutat · alla Scopes på Läge 100";
  const när = `Avslutat ${dagFormat.format(new Date(avslutadAv.tid))}`;
  const { vem } = avslutadAv;
  if (!vem) return när;
  return `${när} av ${vem.namn}${vem.aktiv ? "" : " (inaktiv)"}`;
}
