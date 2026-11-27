---
name: Apogee
description: Hill charts som en stjärnhimmel. Läge visar osäkerhet, inte procent.
colors:
  # Natt (standardtema). Målvärden efter designrundan 2026-11-26.
  natt-bg: "#081026"
  natt-panel: "#0a1430"
  natt-chart: "#0b1530"
  natt-line: "#1f3160"
  natt-grid: "#18284f"
  natt-tx: "#eef0f5"
  natt-mid: "#aab6d4"
  natt-dim: "#8f9cbd"
  natt-orbit: "#7f92c2"
  natt-accent: "#f0602e"
  natt-accent-on: "#081026"
  natt-accent-tx: "#ff8a5c"
  natt-klar: "#8fc7ff"
  natt-sel: "#13224a"
  natt-star: "#dfe6f5"
  natt-btn: "#4f63a0"
  natt-halo: "#0d1836"
  # Dag ([data-theme="dag"]).
  dag-bg: "#eef2f9"
  dag-panel: "#f6f8fc"
  dag-chart: "#ffffff"
  dag-line: "#d3dbea"
  dag-grid: "#e6ebf4"
  dag-tx: "#0f1a3a"
  dag-mid: "#4a5878"
  dag-dim: "#5d6a88"
  dag-orbit: "#6f80aa"
  dag-accent: "#c44a1c"
  dag-accent-on: "#ffffff"
  dag-accent-tx: "#b0401a"
  dag-klar: "#2f6fb8"
  dag-sel: "#e6ecf8"
  dag-star: "#9aa8c7"
  dag-btn: "#7d8cab"
  dag-halo: "#ffffff"
typography:
  display:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  display-telefon:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
  brand:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
  title:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
  control:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  meta:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  scope-etikett:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  scope-etikett-kompakt:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  axel:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  none: "0px"
  sm: "2px"
  pill: "17px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "28px"
  xl: "36px"
  tap: "44px"
  header: "56px"
  page-max: "1240px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.natt-tx}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-primary:
    backgroundColor: "{colors.natt-accent}"
    textColor: "{colors.natt-accent-on}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-primary-dag:
    backgroundColor: "{colors.dag-accent}"
    textColor: "{colors.dag-accent-on}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.natt-dim}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  input:
    backgroundColor: "{colors.natt-panel}"
    textColor: "{colors.natt-tx}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  header:
    backgroundColor: "{colors.natt-bg}"
    height: "{spacing.header}"
    padding: "0 28px"
  signatur-initialer:
    backgroundColor: "{colors.natt-panel}"
    textColor: "{colors.natt-tx}"
    rounded: "{rounded.pill}"
    height: "34px"
    padding: "0 10px 0 4px"
  embed-lista-rad:
    backgroundColor: "{colors.natt-panel}"
    rounded: "{rounded.none}"
    padding: "5px 12px"
---

# Design System: Apogee

## Overview

**Creative North Star: "Stjärnatlas"**

Apogee ritar varje Projekts Hill chart som en bit natthimmel: banan är kullen, varje Scope är en stjärna som rider på den, och stjärnans färg är dess Läge. Kullen är produkten; allt annat i gränssnittet är navigering fram till den och ska hålla sig stilla och tunt runt den. Gränssnittet är ett verktyg (Operate) som används på delad skärm i möten, i en Notion-embed och på telefon mellan mötena, så precision och läsbarhet på avstånd går före uttryck. Karaktären bor i detaljerna: den mörka himlen, glöden runt stjärnorna, ✦-märket.

Två teman delar samma struktur: **natt** (standard, djupblå himmel) och **dag** (kall, ljus papperston). Notion-embedden följer datorns tema (`prefers-color-scheme`) och byter bara bakgrund till rent vitt i dag-läge, så att den smälter in i Notions sida.

Den här filen beskriver **målbilden** efter designrundan 2026-11-26 (`docs/design-review/2026-11-26/`). Där målvärdet skiljer sig från koden i dag står nuvarande värde inom parentes. Fas 1 och 2 i planen bygger mot den här filen.

**Key Characteristics:**
- Mörk, tät himmel med hårfina linjer; nästan inga ytor, inga skuggor utom för flytande lager.
- En enda accent, orangeröd, för exakt tre saker: val, stilla och primär handling.
- Läge läses på färgen (Läge-rampen), aldrig som procentstapel.
- Form före färg: ✦, heldragen ring och streckad ring skiljer tillstånd åt, inte bara kulör.
- Barlow i allt, tabellsiffror överallt.
- På telefon ritas diagrammet i riktiga pixlar, med alla etiketter framme och 44 px träffytor.

## Colors

Kall blå neutralskala med en enda varm accent; Läge-rampen står för all annan färg och hämtas från `src/web/lib/hill.ts`, aldrig från tokens.

Tokens bor i `src/web/app.css` som CSS-variabler (`--bg`, `--tx`, `--red` osv.). Frontmatterns nycklar heter `natt-*` och `dag-*`; i CSS är det samma variabelnamn med `[data-theme="dag"]` som överskrivning. `accent` motsvarar `--red`, `accent-tx` motsvarar `--redtx`. `accent-on` och `klar` är nya variabler.

### Primary
- **Orangeröd accent** (natt `#f0602e`, dag `#c44a1c`; i dag `#e0503a` / `#c8402b`): Vald stjärnas ring, stilla-ringen, primärknappen, fokusring, aktiv flik i sidhuvudet, på-läget för "Visa inaktiva", Över tid-stapeln och inbäddningens nästan-slut-på-Appetit-stapel. Beslut Q1 c och Q13 a.
- **Text på accent** (natt `#081026`, dag `#ffffff`; i dag alltid `#fff`): Primärknappens text. Natt ger 5,8:1, dag 4,8:1. Vit text på natt-accenten är förbjuden (under 4,5:1).
- **Accenttext** (natt `#ff8a5c`, dag `#b0401a`; i dag `#ff7a66` / `#b8381f`): Accent som text mot bakgrund: "Ingen rörelse på 26 dagar", "26 d", Över tid, felmeddelanden, ✦ före vald Scopes namn.

### Secondary
- **Klar, ljusblå** (natt `#8fc7ff`, dag `#2f6fb8`; ny): Bara ✦ framför ett **Avslutat Projekt** i listor (Funktionsområdets "Avslutade", Projektsidans sidomeny). Kontrast natt 10,6:1, dag 4,6:1 mot `--bg`. Används aldrig för text, knappar eller stjärnor på kullen.

### Neutral
- **Natthimmel** (`--bg` natt `#081026`, dag `#eef2f9`): Sidans bakgrund och sidhuvudet.
- **Panel** (`--panel` natt `#0a1430`, dag `#f6f8fc`): Inmatningsfält, embedlistan, menyer.
- **Diagramgrund** (`--chart` natt `#0b1530`, dag `#ffffff`): Diagrammets yta. I natt bakom en radiell glöd (`--chart-ground`).
- **Linje** (`--line`) och **gradnät** (`--grid`): Avdelare, cellkanter, diagramram och gradnät.
- **Bläck** (`--tx` natt `#eef0f5`, dag `#0f1a3a`): Brödtext, namn, rubriker.
- **Mellan** (`--mid`) och **dim** (`--dim`): Sekundär text, metarader, axeltexter, platshållare (`input::placeholder` använder `--dim`). `--dim` håller minst 4,5:1 i båda teman.
- **Bana** (`--orbit` natt `#7f92c2`, dag `#6f80aa`; dag i dag `#8a9ac0`): Kullens linje. Minst 3:1 mot diagramgrunden.
- **Kontur** (`--btn` natt `#4f63a0`, dag `#7d8cab`; i dag `#3a4d80` / `#b9c4dc`): Knapp- och fältkanter. Minst 3:1 mot bakgrund och panel.
- **Vald rad** (`--sel`): Bakgrund för vald eller hovrad rad.
- **Bakgrundsstjärnor** (`--star`): Den svaga stjärnhimlen bakom stora diagrammet.
- **Halo** (`--halo`): Kontur runt etiketttext (paint-order stroke) och mörk halo bakom stilla-ringen.

### Läge-rampen
Scopets färg räknas fram ur Läge och lagras aldrig. Varm uppför, guld vid krönet, blå nedför. Interpoleras i **OKLCH** (`lägeFärg` i `hill.ts`, färgmatte i `src/web/lib/farg.ts`). Mellan krönets guld och nedförsblått (nästan motsatta kulörer) tonar kromat ut tidigt och kommer tillbaka i den kalla kulören, så övergången går via skiffer i stället för oliv, grått eller rosa. Läge 0 lutar mot bärnsten så att det hålls isär från den orangeröda accenten. Uppgift #49.
- **Natt:** 0 `#ff9550` → 25 `#ffb86b` → 50 `#ffe7a8` → 62 `#bdd0ff` → 75 `#a9c8ff` → 100 `#6f9fff`. Vitt bara precis efter toppen (ca 52–57).
- **Dag:** 0 `#c4580a` → 25 `#bc7208` → 50 `#b8860b` → 62 `#6f86c8` → 75 `#5a86d6` → 100 `#2f5fc4`. Varje heltal 0–100 minst 3:1 mot `#ffffff` (testat i `hill.test.ts`).
- Förklaringsstapeln (`rampGradient`) samplas ur `lägeFärg` var 5:e Läge, eftersom CSS annars blandar i sRGB.

### Named Rules
**Tre-användningsregeln.** Accenten betyder val, stilla eller primär handling. Inget annat. Fokusring och aktiv sida räknas som val (tryckt läge använder inte accenten, se Buttons), och det gör även på-läget för "Visa inaktiva" på Personer, som får aktiv sidas accentunderstrykning (#48). Över tid räknas som stilla (något kräver uppmärksamhet), och det gör även inbäddningens Appetit-stapel när Appetiten nästan är slut (#66). Båda undantagen är medvetna och beställda i ärendena. Den används inte för dekor, länkar, rubriker eller för att få en sällsynt handling att synas (Nytt Funktionsområde är en vanlig konturknapp). Beslut Q1 c.

**Form-före-färg-regeln.** Accenten och rampens uppförsfärger ligger nära varandra. Vald och stilla skiljs därför från stjärnorna med form: ✦ och heldragen ring för vald, streckad ring med mörk halo för stilla. Lägg aldrig till ett nytt tillstånd som bara skiljer sig i kulör.

**Klar-regeln.** Ljusblå ✦ betyder Avslutat Projekt och bara det. Den står i listor och grannlistor, och medvetet även före rubriken (h1) på ett Avslutat Projekts sida så att statusen syns tydligt (#62, ägarens not till Q8). Avslutade Projekt visas aldrig som stjärnor på Stjärnkartan.

## Typography

**Display Font:** Barlow (med system-ui, sans-serif)
**Body Font:** Barlow (med system-ui, sans-serif)

**Character:** En familj i fyra vikter (400, 500, 600, 700) från Google Fonts. Smal och teknisk utan att vara kall; den bär både rubriker och de små etiketterna i diagrammet. `font-variant-numeric: tabular-nums` på `body` så att Läge, dagar och datum står stilla när de ändras.

### Hierarchy
- **Display** (600, 36px, 1.1, -0.01em; 28px under 900 px): `h1` på varje sida, namnet på Funktionsområdet eller Projektet.
- **Brand** (700, 22px): "Apogee" bredvid ✦ i sidhuvudet.
- **Title** (600, 18px): Funktionsområdets rubrik på startsidan.
- **Body** (400, 15px, 1.4): Brödtext och listor.
- **Control** (500, 14px): Knappar, fält, select.
- **Meta** (400, 14px, `--dim`): Brödsmulor, metarader, nedräkning.
- **Label / cap** (600, 13px, `--dim`): Små rubriker som "Avslutade", "Signatur", "Läge".
- **Scope-etikett** (600, 15px i stora diagrammet, 13px i kompakt ruta och på telefon; Läge-siffran i 500 och `--mid`): Namnet vid stjärnan, med 4–5 px halo-kontur.
- **Axel** (500, 13px, `--dim`): Kullens halvor under baslinjen och Stjärnkartans storleksskala (13-pixelsregeln).

### Named Rules
**13-pixelsregeln.** Ingen text i ett diagram blir mindre än 13 px i skärmpixlar. Ett diagram som skulle skalas ner så att etiketter blir mindre ritas i stället om i riktiga pixlar (se Layout, Telefon).

## Layout

Sidan är en centrerad kolumn, `max-width: 1240px`, padding `36px 28px 80px` (`24px 16px 64px` under 900 px). Sidhuvudet är 56 px högt och sticky. Rytmen är 4/8/16/28/36 px; täta listor använder 4–8 px, sektioner 28–40 px.

**Projektsidan** har tre kolumner: sidomeny (Andra Projekt i Funktionsområdet), diagram, och Scope-lista i en sidopanel på `minmax(320px, 360px)`. Målbild (#51, #57): tre kolumner först från ca **1200 px** (i dag 900 px). Mellan 900 och 1200 px står Funktionsområdets andra Projekt under diagrammet, som på telefon. Diagrammet börjar direkt under titeln plus en statusrad; sällsynta handlingar ligger i en **Mer**-meny vid rubriken (Q5 a, Q18 b).

**Startsidan** listar Funktionsområden med Pågående Projekt som celler i ett rutnät och Avslutade som en kompakt lista under (Q4 c, Q11 a).

**Notion-embedden** är en egen sida utan sidhuvud. Bred: kulle till vänster, lista 230 px (upp till ca 260 px över 640 px bredd) till höger. Smal: huvud på en rad, "Ny inloggning · 4 dagar kvar" med en 2 px stapel under (Q20 a); kullen tar resten. Kullens höjd begränsas till ca 0,45 × bredden. Alla etiketter som får plats visas (Q3 b).

### Telefon
Telefonreglerna gäller under 600 px där inget annat sägs; diagrammens egna rutor gäller under 900 px.

- **Hill chart och Stjärnkarta i riktiga pixlar (Q9 a).** Under 900 px skalas diagrammet inte ner från 900 enheter. Det ritas för den uppmätta bredden, på samma sätt som embeddens kompakta ruta (`kompaktRuta`): 13 px etiketter, gradnät och axel kvar.
- **Alltid alla etiketter (Q17 b).** Varje Scope har sin etikett framme, i 13 px, staplade med ledarlinjer när de trängs. Rutan får bli högre (ca 1,5 × med 6 Scopes) hellre än att etiketter döljs.
- **44 px träffytor (Q9 a, Q17 b).** Stjärnor har en osynlig träffcirkel på minst 22 px radie i skärmpixlar. Knappar och rader i nyckeln och på Personer får minst 44 px höjd genom padding, inte större text.
- **Sidhuvudet på en rad (Q16 a).** Med en Signatur satt visar sidhuvudet bara ✦ Apogee, en initialknapp ("AL") och kugghjulet. Initialknappen öppnar en meny med Mina Scopes, Byt Signatur och tema. Sidan får aldrig bli bredare än skärmen (390 px ska ge exakt 390 px).
- **Hjälptexten under diagrammet (Q19 a).** "Dra en stjärna längs banan för att ändra dess Läge." Tillägget om piltangenter visas bara på dator.
- Popovers som Bädda in placeras mot sidans kanter (`inset-inline: 16px`) eller som bottenark.

## Elevation & Depth

Systemet är platt. Djup kommer från tonlager (bakgrund, panel, diagramgrund) och från ljus: stjärnornas glöd (en cirkel i stjärnans färg, 2,4–2,6 × radien, opacitet 0,13) och den radiella himlen bakom stora diagrammet i natt. Skuggor finns bara på flytande lager som ligger över sidan.

### Shadow Vocabulary
- **Flytande panel** (`box-shadow: 0 6px 24px rgb(0 0 0 / 0.25)`): Bädda in-panelen och andra popovers.
- **Toast** (`box-shadow: 0 6px 24px rgb(0 0 0 / 0.3)`): Ångra-toasten.

### Named Rules
**Ljus-inte-skugga-regeln.** Det som är viktigt lyser, det lyfts inte. En nyss flyttad stjärna är större (radie 9, 7,5 eller 5 efter dagar sedan senaste ändring); en sparad ändring får en kort ljuspuls, inte en skugga eller ett kort.

## Shapes

Kantigt och tunt. Knappar, fält och celler har 2 px hörn eller inga alls; embedlistans rader är helt raka. Runt är förbehållet himlakroppar och personer: stjärnor, prickar, initialbubblor och Signaturknappen på telefon (17 px, pillerform). Linjerna är hårfina, 1 px i gränssnittet och 1,1–2 px i diagrammet.

**✦-märket** är Apogees form: en fyruddig stjärna (`M11 1 L12.6 9.4 L21 11 L12.6 12.6 L11 21 L9.4 12.6 L1 11 L9.4 9.4Z`) i sidhuvudet och i embedden, och tecknet ✦ i text. Det har tre betydelser, alltid skilda åt med färg och plats:
- I accent i sidhuvudet: märket.
- I accenttext före ett Scope-namn: vald Scope.
- I klar ljusblått före ett Projektnamn: Avslutat Projekt.

## Components

Komponenterna är återhållsamma och exakta: tunna konturer, ingen fyllnad utom på den enda primära handlingen.

### Buttons
- **Shape:** Nästan raka hörn (2 px).
- **Standard:** Transparent, 1 px kontur i `--btn`, text i `--tx`, padding 8px 14px. Hover: konturen blir `--mid`.
- **Primär (`.pr`):** Fylld i accent. Natt: `#f0602e` med text `#081026`. Dag: `#c44a1c` med vit text. Högst en per vy. "Nytt Projekt" på Funktionsområdet, "Ny Scope" på Projektet, "Öppna igen" på ett Avslutat Projekt.
- **Tyst (`.quiet`):** Ingen kontur, `--dim`, padding 4px 8px; hover visar `--line`-kontur och `--tx`.
- **Avstängd:** Primär visas som kontur, inte halvgenomskinlig accent.
- **Tryckt (`aria-pressed="true"`):** Neutral `--mid`-kontur på `--sel`-bakgrund, text i `--tx`, ingen accent (Q1 c). Till exempel Historik när panelen är öppen och Ny Scope medan formuläret är öppet (primärknappen tappar då sin fyllning). En regel i `app.css`; menyrader utan kontur (vald Signatur i menyn) visar tryckt med fet `--tx`-text.
- **Mer:** Sällsynta handlingar (Byt namn, Flytta, Kopiera länk, Bädda in, Markera Avslutat, Ta bort) ligger bakom en "Mer"-knapp vid rubriken. På Funktionsområdet står bara "Nytt Projekt" och "Mer" framme (Q18 b).
- **Fokus:** `outline: 2px solid` accent, `outline-offset: 2px`, på knappar, länkar, fält och stjärnor.

### Inputs / Fields
- **Style:** Bakgrund `--panel`, 1 px kontur `--btn`, 2 px hörn, padding 8px 10px. Platshållare i `--dim`.
- **Focus:** Konturen blir `--mid`; tangentbordsfokus får accentringen.
- **Error:** Text i `--redtx`, 14 px, under fältet.

### Navigation (sidhuvud)
- ✦ Apogee till vänster; till höger Mina Scopes (när en Signatur är satt), Signatur, temaväxlare och kugghjul för Inställningar.
- Länkar i `--mid`, hover och aktiv i `--tx`; aktiv sida får en 2 px accentlinje i underkant (`inset 0 -2px 0`).
- Temaväxlaren är en ikonknapp som visar nuvarande tema (måne/sol). Kugghjulet ritas som en kugge med tänder och står sist.
- Telefon: se Layout, Telefon (initialknapp som meny).

### Projektceller och Avslutade-listan
- **Pågående Projekt:** Cell med MiniHill (kullen i miniatyr med stjärnor), namn, nedräkning och stilla-räkning. Cellerna delar 1 px `--line`-kanter, även upptill.
- **Avslutade Projekt (Q11 a):** Ingen minikarta. En tät lista sist under rubriken "Avslutade": ljusblå ✦, namnet i `--tx` (600) och "Avslutat 12 nov." i `--dim` 13 px. Full kontrast, ingen nedtoning av hela raden. Rader 8px 4px med `--line` emellan, hover `--sel`.
- **Sidomenyn på Projektsidan (Q12 a):** "Andra Projekt i …" listar Pågående först och Avslutade sist med ljusblå ✦ och ordet "Avslutat" i full kontrast.

### Nedräkning
- "4 dagar kvar" (Q6 a), alltid i dagar. Under texten en 4 px stapel (3 px i liten variant) i `--grid` med fyllnad i `--mid`. Över tid: fyllnad i accent och text i `--redtx`, 600. Före start: ingen stapel eller en streckad.

### Hill chart (signaturkomponent)
Kullen är en cosinusbana från Läge 0 till 100 med krönet vid 50. Stjärnorna rider på banan; bara x betyder något.
- **Bana:** 1,3–1,4 px i `--orbit`. Stora diagrammet har gradnät (11 linjer i `--grid`), ram i `--line`, skalsteg var 5:e Läge och siffror var 10:e, samt en svag stjärnhimmel.
- **Kullens halvor (Q14 a):** Under baslinjen står **"← Utforskar"** till vänster och **"Genomför →"** till höger, 13 px, 500, `--dim`. I embedden visas de när rutan är högre än 150 px. Ersätter "Uppför · lista ut" och "Nedför · genomföra".
- **Stjärna:** Fylld cirkel i rampfärgen, radie 9/7,5/5 efter hur nyligen den flyttades, med glöd.
- **Vald (Q15 a):** Heldragen 2 px ring i accent (i dag 1,2 px), och **✦ före namnet** i etiketten och i listan, i `--redtx`, 600: "✦ Sessionshantering".
- **Stilla:** Streckad ring i accent (`stroke-dasharray: 3 3`, 1,6 px) ovanpå en mörk halo (5 px `--halo`), plus ledarlinje och texten "Ingen rörelse på 26 dagar" i `--redtx` i stora diagrammet. I listor och embed: "26 d" i `--redtx`.
- **Markerad (Historik, Visa):** Streckad ring i `--tx`, 1,2 px, `3 4`.
- **Dimmad:** Opacitet 0,45; används för stjärnor i ett Avslutat Projekt (skrivskyddat tills Öppna igen, Q8 b).
- **Etiketter:** Placeras utan krock, staplas med ledarlinjer (0,8 px) och hålls inom rutan; vid Läge nära 0 och 100 förankras de inåt.
- **Ögonblick:** Släpp som korsar 50 eller landar på 100 får en kort glimt (300–400 ms). Inget under `prefers-reduced-motion`.

### Embed-listan
Rader 5px 12px, rak kant, prick (7 px) i rampfärg, namn med ellips, Ägare i `--dim`, Läge i 700. Vald och hover: `--sel`. Vald rad får ✦ före namnet.

### Signatur-remsan och toast
Remsan längst ned frågar "Vem flyttade …?" och säger att valet sparas på enheten. Toasten är en flytande panel med skugga och "Ångra".

## Do's and Don'ts

### Do:
- **Do** hämta Scopets färg ur Läge-rampen i `hill.ts`, aldrig ur en token eller ett lagrat värde.
- **Do** hålla accenten till val, stilla och primär handling, med `#081026` som text på natt-accenten.
- **Do** märka vald Scope med ✦ och heldragen 2 px ring, och stilla med streckad ring och mörk halo.
- **Do** märka Avslutade Projekt med ljusblå ✦ (`#8fc7ff` / `#2f6fb8`) och full textkontrast.
- **Do** kalla kullens halvor "Utforskar" och "Genomför".
- **Do** rita diagram på telefon i riktiga pixlar med 13 px etiketter, alla etiketter framme och 44 px träffytor.
- **Do** använda domänorden ur `GLOSSARY.md` med stor bokstav: Funktionsområde, Projekt, Scope, Ägare, Läge, Signatur, Historik, Milstolpe, Appetit, Avslutat Projekt.
- **Do** respektera `prefers-reduced-motion` för glimtar och pulser.

### Don't:
- **Don't** visa Läge som procent eller förloppsstapel.
- **Don't** sätta vit text på natt-accenten, eller annan text under 4,5:1.
- **Don't** skilja två tillstånd enbart med kulör.
- **Don't** visa Avslutade Projekt som stjärnor på Stjärnkartan, eller med minikarta i Funktionsområdets celler.
- **Don't** tona ner hela rader eller celler för att visa Avslutat; tona bara stjärnor.
- **Don't** skala ner det stora diagrammet så att text blir mindre än 13 px.
- **Don't** låta sidhuvudet eller någon panel ge sidledsskroll på telefon.
- **Don't** lägga till skuggor eller kort på vanliga ytor; skuggor bara på flytande lager.
- **Don't** använda konfetti, ljud eller studsande animationer.
