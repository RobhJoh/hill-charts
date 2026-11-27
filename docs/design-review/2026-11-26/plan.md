# Plan: Apogee v1, granskad (2026-11-26)

Rapport: https://claude.ai/artifact/3dCJGLvKpdbPAjT9GAmZPh · Beslut: `findings.md` · Förälder: [#45](https://github.com/RobhJoh/hill-charts/issues/45) · 77 fynd, alla **Åtgärda**, 20 frågor besvarade.

Faserna bygger på varandra: fas 1 lägger de gemensamma byggstenarna (tokens, accent, sidhuvud, responsiv grund, ordval) som vyerna i fas 2 använder. Inom fas 2 följer ordningen huvudflödet: Översikt → Funktionsområde → Projekt → Embed → Stjärnkarta → Personer.

## Fas 0: Designmanual

### 0. DESIGN.md med Impeccable ([#46](https://github.com/RobhJoh/hill-charts/issues/46))

Ägaren vill att Impeccable skriver en designmanual när besluten är fattade. Den ska fånga besluten i den här rundan (accentens kulör och användning enligt Q1 c och Q13 a, Avslutat-markeringen med ljusblå ✦ enligt Q11–Q12, ✦ för vald enligt Q15, fasnamnen Utforskar · Genomför enligt Q14, telefonregler enligt Q9 a, Q16 a, Q17 b) så att fas 1 och 2 bygger mot den.

- [ ] `DESIGN.md` finns i repots rot, skriven med Impeccable (`impeccable document`), och beskriver färger, typografi, komponenter och telefonregler enligt besluten ovan.

## Fas 1: Gemensamma byggstenar

### 1. Tokens och tema ([#47](https://github.com/RobhJoh/hill-charts/issues/47))

**Fynd:** `embed-tokens-duplicated`, `placeholder-untokenized`  
**Vyer:** /installningar/personer (Visa inaktiva på), /p/<id>/embed  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `embed-tokens-duplicated` (P2) Ta bort blocket i .ap och låt inbäddningen ärva dag-tokens; behåll bara --bg: #ffffff som en avsiktlig avvikelse (Notions vita sida).
- [ ] `placeholder-untokenized` (P3) Lägg till input::placeholder { color: var(--dim); } i app.css (6,6:1 i natt, 5,1:1 i dag).

### 2. Accentfärg och kontrast ([#48](https://github.com/RobhJoh/hill-charts/issues/48))

**Fynd:** `dag-borders-orbit-weak`, `primarknapp-kontrast`, `projekt-accent-krockar-med-uppfor`, `personer-visa-inaktiva-lage`, `start-nytt-fo-dominerar`, `stjarnkarta-vald-rad-svag`  
**Vyer:** /, /installningar/personer (Visa inaktiva på), /p/0qtx4cq2ev (Ny inloggning), /p/0qtx4cq2ev · dag, /person/9p2wfr02el (Stjärnkarta)  
**Besvarade frågor:**
- Q1 · Hur ska den orangeröda accenten användas? → **c) Bara ny kulör och kontrastfix**: Samma tre användningar som i dag: val, stilla och primärknapp. Minst risk, men accenten blir inte vanligare och krocken med uppförsfärgen löses bara med form.
- Q13 · Hur ska primärknappen se ut med den orangeröda accenten? → **a) Ljus orangeröd, mörk text**: Natt: #f0602e med text #081026, 5,8:1. Dag: #c44a1c med vit text, 4,8:1. Starkast lyster, samma kulör som stilla-ringen.
- Q15 · Ska vald stjärna märkas med Apogees ✦? → **a) ✦ före namnet i etiketten, heldragen ring**: Vald: heldragen 2 px ring i accent och "✦ Sessionshantering" i etiketten och listan. Stilla behåller sin streckade ring med mörk halo.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `dag-borders-orbit-weak` (P2) Mörka dag-tokens: --btn till ca #8d9ab8 (≥3:1) och --orbit till ca #6f80aa (≥3:1 mot #fff). Höj natt --btn något (≥3:1 mot --bg).
- [ ] `primarknapp-kontrast` (P2) Enligt Q13 (Ljus orangeröd, mörk text): Vit text på den röda primärknappen når inte 4,5:1 är löst. Ursprungligt förslag, där det inte strider mot valet: Byt accenten mot en orangeröd och låt texten på den vara mörk i natt: t.ex. --red #f0602e med text #081026 (ca 5,5:1), --redtx #ff8a5c för text på mörk bakgrund. I dag: --red #c44a1c med vit text (ca 4,8:1), --redtx #b0401a. Kontrollera Läge-rampens orange i hill.ts så att accenten och Läge 0–20 inte flyter ihop. **Ägarens notering:** Visa förslag på hur detta kan se ut.
- [ ] `projekt-accent-krockar-med-uppfor` (P2) Enligt Q15 (✦ före namnet i etiketten, heldragen ring): Stilla-ringen och vald-ringen är nästan samma färg som stjärnorna uppför är löst. Ursprungligt förslag, där det inte strider mot valet: Separera på mer än färgton: ge stilla-ringen en mörk halo (stroke i --halo bakom den röda) och 1,6 i strecktjocklek, och vald-ringen heldragen i 2 px. Välj den nya accenten så att den håller tydligt avstånd i ton till rampens 0–25 (t.ex. dra rampens Läge 0 mot bärnsten #ff9550 om accenten går mot #ff5a36). **Ägarens notering:** Kan vald få Apogee stjärn ikonen ✦ vid sig?
- [ ] `personer-visa-inaktiva-lage` (P3) Enligt Q1 (Bara ny kulör och kontrastfix): Påslagna växlar syns knappt är löst. Ursprungligt förslag, där det inte strider mot valet: Markera valt läge med accentfärgen, t.ex. samma understrykning som det aktiva "Mina Scopes" i sidhuvudet, och låt växeln säga "Dölj inaktiva" när den är på.
- [ ] `start-nytt-fo-dominerar` (P3) Enligt Q1 (Bara ny kulör och kontrastfix): Den ovanligaste handlingen får sidans starkaste färg är löst. Ursprungligt förslag, där det inte strider mot valet: Gör "Nytt Funktionsområde" till en vanlig (konturerad) knapp på startsidan och låt accentfärgen här bara bära status. Behåll "Nytt Projekt" som primär på Funktionsområdessidan, där det är den vanliga handlingen.
- [ ] `stjarnkarta-vald-rad-svag` (P3) Enligt Q1 (Bara ny kulör och kontrastfix): Vald Scope i nyckeln markeras bara med understrykning är löst. Ursprungligt förslag, där det inte strider mot valet: Ge vald rad bakgrund (--sel) och en röd kantlinje till vänster, samma röda som ringen i kartan.

### 3. Läge-färgskalan ([#49](https://github.com/RobhJoh/hill-charts/issues/49))

**Fynd:** `projekt-dag-mittfarger-grumliga`, `projekt-natt-mitten-nastan-vit`  
**Vyer:** /p/0qtx4cq2ev (Ny inloggning), /p/0qtx4cq2ev · dag  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-dag-mittfarger-grumliga` (P1) Interpolera i OKLCH i stället för RGB, mörka krönet till en renare bärnsten (ca #b8860b) och lägg till ett stopp vid ca 62 i en kall, ren ton (t.ex. #6f86c8) så att övergången går via skiffer i stället för grå. Kontrollera 3:1 mot #ffffff för varje heltal 0–100.
- [ ] `projekt-natt-mitten-nastan-vit` (P3) Mätta nedför mer: 75 ≈ #a9c8ff och 100 ≈ #6f9fff, och behåll krönet varmt guld (#ffe7a8) så att vitt bara finns precis vid toppen.

### 4. Sidhuvud ([#50](https://github.com/RobhJoh/hill-charts/issues/50))

**Fynd:** `header-telefon-for-brett`, `header-kugghjul-ser-ut-som-sol`  
**Vyer:** /, /f/4djnni9x4g (Plattform)  
**Besvarade frågor:**
- Q16 · Hur ska sidhuvudet se ut på telefon när en Signatur är satt? → **a) Initialer som meny**: Märke, knapp "AL" och kugghjul. "AL" öppnar en meny med Mina Scopes, Byt Signatur och tema. Sidan blir exakt 390 px.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `header-telefon-for-brett` (P1) Enligt Q16 (Initialer som meny): Sidhuvudet med Signatur är för brett på telefon och hela sidan skrollar i sidled är löst. Ursprungligt förslag, där det inte strider mot valet: Under ca 600 px: låt sidhuvudet bara visa märket, Signaturen som en kompakt knapp med initialer (t.ex. "AL") och kugghjulet; flytta "Mina Scopes" och temaväxlaren in i en meny bakom Signaturknappen, eller visa "Mina Scopes" som en ikon. Sätt white-space: nowrap på länkarna och min-width: 0 på .right så att inget kan tvinga fram sidledsskroll.
- [ ] `header-kugghjul-ser-ut-som-sol` (P2) Rita en riktig kugge (tänder, inte strålar) för Inställningar, eller skriv "Inställningar" i text på dator. Gör temaväxlaren till en ikonknapp med måne/sol som visar nuvarande tema, med aria-label som i dag. Låt kugghjulet stå sist och temaväxlaren före, med lite mer avstånd.

### 5. Responsiv layout ([#51](https://github.com/RobhJoh/hill-charts/issues/51))

**Fynd:** `personer-knappar-for-sma-telefon`, `projekt-chart-squeezed-midwidth`  
**Vyer:** /installningar/personer (Visa inaktiva på), Hela appen  
**Besvarade frågor:**
- Q17 · Hur mycket ska Hill chart och Stjärnkarta visa på telefon? → **b) Alltid alla etiketter**: Etiketterna i 13 px staplas med ledarlinjer. Allt syns utan tryck, men rutan blir ca 1,5 gånger högre med 6 Scopes.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `personer-knappar-for-sma-telefon` (P2) Enligt Q17 (Alltid alla etiketter): Knappar och rader är för små att träffa på telefon är löst. Ursprungligt förslag, där det inte strider mot valet: Ge knappar och nyckelns rader minst 44 px träffyta på smala skärmar (padding, inte större text), och mer avstånd mellan "Byt namn" och "Ta bort".
- [ ] `projekt-chart-squeezed-midwidth` (P2) Flytta brytpunkten för tre kolumner till ca 1200 px, och visa Funktionsområdets andra Projekt under charten (som på telefon) mellan 900 och 1200 px.

### 6. Status och stilla ([#52](https://github.com/RobhJoh/hill-charts/issues/52))

**Fynd:** `embed-stilla-forklaras-inte`, `start-ordning-doljer-problem`, `start-saknar-samlad-status`, `stilla-forklaras-inte`, `stilla-ord-varierar`  
**Vyer:** /, /p/<id>/embed, Personer: över vyerna, Översikt: över vyerna  
**Besvarade frågor:**
- Q4 · I vilken ordning ska Projekt stå i översikten? → **c) Avslutade ihopfällda**: Pågående i bokstavsordning; Avslutade i en kompakt rad under rutnätet.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `embed-stilla-forklaras-inte` (P1) Visa stillheten i text där folk tittar: i bred läge en röd "26 d" (eller "stilla 26 d") i listraden, samma mönster som Projekt-sidans lista, och sortera inte bort den. I smal läge lägg "· 26 d" efter stjärnans etikett i --redtx. Gör ringen tydligare (r 12–13, stroke 1.4) så den syns även på avstånd.
- [ ] `start-ordning-doljer-problem` (P2) Enligt Q4 (Avslutade ihopfällda): Ordningen hjälper inte en ledare att hitta det som står still är löst. Ursprungligt förslag, där det inte strider mot valet: Antingen sortera Projekt inom varje område efter behov av uppmärksamhet (Över tid, sedan flest stilla, sedan övriga, Avslutade sist) och behåll områdena i bokstavsordning, eller behåll bokstavsordningen och låt den samlade statusraden högst upp länka till de Projekt det gäller.
- [ ] `start-saknar-samlad-status` (P2) Byt raden mot en samlad status med data som redan finns: "5 pågående · 3 stilla · 1 över tid", där "stilla" och "över tid" är i accentfärgen och bara visas när de är fler än noll. När allt rör sig: "5 pågående · inget står still".
- [ ] `stilla-forklaras-inte` (P2) Ge varje stilla-räkning en title och en skärmläsartext: "Ingen rörelse på över 14 dagar". Lägg till "Stilla" i GLOSSARY.md (en Scope utan ändrat Läge på mer än 14 dagar), så att ordet blir en domänterm och används lika överallt. **Ägarens notering:** En punkt skall räknas som stilla om den inte har ändrats på mer än 6 dagar. Men detta skall vara en inställning att ändra på.
- [ ] `stilla-ord-varierar` (P3) Bestäm en term (t.ex. "stilla") och lägg in den i GLOSSARY.md; skriv "1 stilla" / "stilla i 21 d" konsekvent och behåll klartexten "Ingen rörelse på 21 dagar" bara i kartan. Byt "stilla > 14 d" mot "stilla" med förklaring i title eller i förklaringen.

### 7. Ord och benämningar ([#53](https://github.com/RobhJoh/hill-charts/issues/53))

**Fynd:** `antal-bojning`, `stjarnkarta-hint-grammatik`, `stjarnkarta-ingen-forklaring-storlek`  
**Vyer:** /installningar/personer (Visa inaktiva på), /person/9p2wfr02el (Stjärnkarta)  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `antal-bojning` (P3) Böj efter antal: "1 inaktiv" / "2 inaktiva", och skriv "1 avslutat Projekt" / "2 avslutade Projekt".
- [ ] `stjarnkarta-hint-grammatik` (P3) Skriv t.ex. "Dra en stjärna för att ändra Läge. Ändringen sparas i Scopets Projekt och syns i dess Historik."
- [ ] `stjarnkarta-ingen-forklaring-storlek` (P3) Lägg samma korta förklaring som på Projekt-sidan under kartan eller i nyckelns fot, t.ex. "Större stjärna = flyttad nyligen" med färgrampen.

## Fas 2: Vyer

### 8. Översiktens Projektceller ([#54](https://github.com/RobhJoh/hill-charts/issues/54))

**Fynd:** `avslutade-blandas-med-pagaende`, `avslutat-for-lag-kontrast`, `celler-oppna-upptill`, `fo-rubrik-ser-inte-klickbar-ut`, `minihill-prickar-overlappar`  
**Vyer:** /, /f/4djnni9x4g (Plattform), /f/w4dhss972v (Ekonomi)  
**Besvarade frågor:**
- Q4 · I vilken ordning ska Projekt stå i översikten? → **c) Avslutade ihopfällda**: Pågående i bokstavsordning; Avslutade i en kompakt rad under rutnätet.
- Q11 · Hur ska Avslutade Projekt visas i Funktionsområdets cell och sida? → **a) Lista "Avslutade" med ljusblå ✦**: Avslutade samlas sist i en tät lista: ljusblå ✦, namn och "Avslutat 12 nov.". Full kontrast (namn ca 12:1, datum ca 6:1). Pågående celler först, oförändrade.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `avslutade-blandas-med-pagaende` (P2) Enligt Q4 (Avslutade ihopfällda): Avslutade Projekt står mitt bland Pågående i bokstavsordning är löst. Ursprungligt förslag, där det inte strider mot valet: Sortera Pågående Projekt först och Avslutade sist inom varje Funktionsområde (samma ordning som Stjärnkartan redan använder). Överväg att visa Avslutade som en kompakt rad ("Avslutade: Gammal API-gateway, Onboarding-guide") under rutnätet i stället för fulla celler. **Ägarens notering:** Avslutades stjärnkarta behöver inte synas alls. De kan istället vara en lista med avslutade samt en ljusblå stjärna vid. Ge förslag på detta.
- [ ] `avslutat-for-lag-kontrast` (P2) Enligt Q11 (Lista "Avslutade" med ljusblå ✦): Texten i Avslutade celler har för låg kontrast är löst. Ursprungligt förslag, där det inte strider mot valet: Tona bara miniatyrkartan (opacity 0.45) och färga namnet med --dim och metaraden med --dim i stället för att tona hela cellen; behåll kontrasten över 4,5:1. **Ägarens notering:** Avslutades stjärnkarta behöver inte synas alls. De kan istället vara en lista med avslutade samt en ljusblå stjärna vid. Ge förslag på detta.
- [ ] `celler-oppna-upptill` (P3) Ge .cells en border-top: 1px solid var(--line), eller låt varje cell rita alla fyra kanter med negativ marginal så att linjerna inte dubbleras.
- [ ] `fo-rubrik-ser-inte-klickbar-ut` (P3) Lägg till en diskret pil efter namnet ("Plattform ›") eller "Öppna" i högerkanten intill räkningen, i --dim, som blir --tx vid hover.
- [ ] `minihill-prickar-overlappar` (P3) Förskjut prickar som ligger inom 2 Läge från varandra ett par pixlar i sidled eller lodrätt (en liten stapel), som på den stora Hill charten.

### 9. Tidsplan och nedräkning ([#55](https://github.com/RobhJoh/hill-charts/issues/55))

**Fynd:** `fo-andra-datum-nar-inga-finns`, `nedrakning-blandade-enheter`, `nedrakning-tom-stapel-fore-start`  
**Vyer:** /, /f/w4dhss972v (Ekonomi)  
**Besvarade frågor:**
- Q6 · Hur ska nedräkningen skrivas? → **a) Bara dagar kvar**: "4 dagar kvar"; stapeln visar andelen och Appetiten står på sidan.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `fo-andra-datum-nar-inga-finns` (P3) Visa "Sätt datum" när varken Startdatum eller Slutdatum finns, och "Ändra datum" annars.
- [ ] `nedrakning-blandade-enheter` (P3) Enligt Q6 (Bara dagar kvar): Nedräkningen blandar dagar och veckor i samma rad är löst. Ursprungligt förslag, där det inte strider mot valet: Skriv alltid samma enhet på båda sidor ("4 dagar kvar av 56"), eller låt stapeln bära helheten och skriv bara "4 dagar kvar". Formuleringen står i specen, så ägaren bör bekräfta.
- [ ] `nedrakning-tom-stapel-fore-start` (P3) Dölj stapeln när Projektet inte har börjat, eller rita den streckad som "inte påbörjad".

### 10. Handlingar i sidhuvudet ([#56](https://github.com/RobhJoh/hill-charts/issues/56))

**Fynd:** `fo-ta-bort-erbjuds-trots-sparr`, `fo-sidhuvud-for-manga-handlingar`, `projekt-fjorton-kontroller-fore-diagrammet`  
**Vyer:** /f/4djnni9x4g (Plattform), /p/0qtx4cq2ev (Ny inloggning)  
**Besvarade frågor:**
- Q5 · Var ska sällsynta handlingar som Byt namn, Kopiera länk och Ta bort ligga? → **a) Mer-meny vid rubriken**: En knapp "Mer" öppnar Byt namn, Flytta, Kopiera länk, Bädda in och Ta bort. Samma mönster på båda sidorna.
- Q18 · Vad ska stå framme i Funktionsområdets sidhuvud? → **b) Allt utom Nytt Projekt i Mer-menyn**: Bara "Nytt Projekt" och "Mer" framme. Lugnast, men tidsplanen ändras genom en meny.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `fo-ta-bort-erbjuds-trots-sparr` (P1) Visa "Ta bort" bara när alla Projekt är Avslutade. Annars: en inaktiv knapp med förklaringen bredvid, t.ex. "Kan tas bort när alla Projekt är Avslutade (2 pågår)". Datat för att avgöra det finns redan på sidan.
- [ ] `fo-sidhuvud-for-manga-handlingar` (P2) Enligt Q18 (Allt utom Nytt Projekt i Mer-menyn): Sex handlingar före Projekten, och på telefon bryts de konstigt är löst. Ursprungligt förslag, där det inte strider mot valet: Behåll "Nytt Projekt" och tidsplanens "Ändra datum"/"Ny Milstolpe" synliga. Samla "Byt namn", "Kopiera länk" och "Ta bort" bakom en knapp "Mer" (eller ⋯) bredvid rubriken. På telefon: rubrik, status och nedräkning först, Projekten sedan.
- [ ] `projekt-fjorton-kontroller-fore-diagrammet` (P2) Enligt Q5 (Mer-meny vid rubriken): Fjorton kontroller i samma vikt står före diagrammet är löst. Ursprungligt förslag, där det inte strider mot valet: Samla sällan använda åtgärder (Byt namn, Flytta, Kopiera länk, Bädda in, Markera Avslutat, Ta bort) i en meny "Mer ▾" bredvid Historik och Ny Scope. Slå ihop status och tid till en rad: "Pågående · 4 dagar kvar av 8 veckor · ◆ Acceptanstest om 4 dagar". Låt datum och Milstolpar redigeras från en "Ändra datum och Milstolpar" som fäller ut nuvarande formulär. Målet är att diagrammet börjar under titeln plus en rad.

### 11. Projektsidans layout ([#57](https://github.com/RobhJoh/hill-charts/issues/57))

**Fynd:** `projekt-sidopanel-bredare-an-fonstret`, `projekt-grannar-avslutat-utan-ord`  
**Vyer:** /p/0qtx4cq2ev (Ny inloggning)  
**Besvarade frågor:**
- Q12 · Ska Avslutade Projekt synas på Stjärnkartan och bland grannprojekten? → **a) Aldrig på kartan; sist i sidomenyn med ✦**: Stjärnkartan visar bara pågående, filterraden tas bort. Sidomenyn "Andra Projekt i Kundupplevelse" listar Avslutade sist med ljusblå ✦ och ordet "Avslutat" i full kontrast.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-sidopanel-bredare-an-fonstret` (P1) Låt tabellen få plats i 340 px: sätt table-layout: fixed med kolumnbredder (namn flexibel med radbrytning, Ägare ca 110 px, Läge ca 44 px), lägg ✦ på samma rad som namnet eller flytta den (se projekt-agare-cell-tva-rader), och ge sidopanelens kolumn minmax(320px, 360px) i grid-mallen. Kontrollera med det längsta Scope-namnet i testdatan ("Tillgänglighetsgranskning").
- [ ] `projekt-grannar-avslutat-utan-ord` (P3) Enligt Q12 (Aldrig på kartan; sist i sidomenyn med ✦): Avslutade grannprojekt är bara blekare, utan ord är löst. Ursprungligt förslag, där det inte strider mot valet: Skriv "Avslutat" under namnet i dim text (som "1 stilla" står för pågående), och ge listan rubriken "Andra Projekt i Kundupplevelse" eller låt Funktionsområdets namn vara en länk med samma text. **Ägarens notering:** Avslutade borde ju vara på 100. Behövs de visas på stjärnkartan då?

### 12. Hill chart: etiketter ([#58](https://github.com/RobhJoh/hill-charts/issues/58))

**Fynd:** `projekt-etiketter-trangs`, `stjarnkarta-etikett-klipps`, `projekt-inga-hojdpunkter-vid-kron-och-mal`  
**Vyer:** /p/0qtx4cq2ev (Ny inloggning), /p/0qtx4cq2ev · Historik, Visa, /person/9p2wfr02el (Stjärnkarta)  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-etiketter-trangs` (P2) Lägg stilla-textens ruta och ledarlinje som hinder i placeraEtiketter, och lägg banans linje närmast stjärnan som hinder för etiketter under stjärnan. Vid krönet: föredra att stapla uppåt med ledarlinje framför att lägga etiketten under. Lägg till en trängd testprojekt-fixture (två Scopes på 45/55, två på 95/100, en stilla nära) och titta på den i båda teman.
- [ ] `stjarnkarta-etikett-klipps` (P2) Låt placeraEtiketter hålla etiketten inom viewBox: vid Läge nära 0 förankra texten till höger om stjärnan (text-anchor start) eller stapla den uppåt med ledarlinje, och spegla samma regel vid Läge 100.
- [ ] `projekt-inga-hojdpunkter-vid-kron-och-mal` (P3) När ett släpp korsar 50 eller landar på 100: en kort (300–400 ms) glimt i stjärnans sken och, vid 100, en tunn ring som tonar ut. Respektera prefers-reduced-motion. Ingen ljudeffekt, ingen konfetti.

### 13. Hill chart på telefon ([#59](https://github.com/RobhJoh/hill-charts/issues/59))

**Fynd:** `projekt-telefon-diagram-for-litet`, `stjarnkarta-telefon-for-liten`, `projekt-hjalptext-fel-plats`  
**Vyer:** /p/0qtx4cq2ev (Ny inloggning), /person/9p2wfr02el (Stjärnkarta)  
**Besvarade frågor:**
- Q17 · Hur mycket ska Hill chart och Stjärnkarta visa på telefon? → **b) Alltid alla etiketter**: Etiketterna i 13 px staplas med ledarlinjer. Allt syns utan tryck, men rutan blir ca 1,5 gånger högre med 6 Scopes.
- Q19 · Var ska hjälptexten om att dra stjärnor stå? → **a) Direkt under diagrammet, anpassad**: "Dra en stjärna längs banan för att ändra dess Läge." På dator läggs till "Markera och använd piltangenterna (Shift = 10 steg)."

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-telefon-diagram-for-litet` (P1) Enligt Q17 (Alltid alla etiketter): På telefon blir diagrammets etiketter ca 6 px och stjärnorna för små att träffa med tummen är löst. Ursprungligt förslag, där det inte strider mot valet: Ge diagrammet under 900 px en egen ruta i riktiga pixlar, som kompaktRuta redan gör för embed: mät bredden, behåll gradnät och axel men rita etiketter i 13–14 px och en osynlig träffcirkel på minst 22 px radie i CSS-pixlar. Visa bara vald stjärnas etikett (etiketter="valt", som i embed) när fler än ca 4 Scopes trängs, eftersom listan direkt under redan har namnen.
- [ ] `stjarnkarta-telefon-for-liten` (P1) Enligt Q17 (Alltid alla etiketter): Stjärnkartan krymper till oläslig storlek på telefon är löst. Ursprungligt förslag, där det inte strider mot valet: Under ca 600 px: rita kullen i verkliga pixlar som inbäddningens kompakta läge (kompaktRuta, 13 px text) med högre bild än bredd, visa etikett bara för vald stjärna (etiketter="valt") och låt nyckeln under kartan vara etikettlistan. Gör stjärnornas osynliga träffyta minst 44 px i skärmpixlar.
- [ ] `projekt-hjalptext-fel-plats` (P3) Enligt Q19 (Direkt under diagrammet, anpassad): Hjälptexten om att dra står långt från diagrammet och nämner piltangenter på telefon är löst. Ursprungligt förslag, där det inte strider mot valet: Flytta texten direkt under diagrammet och anpassa: på pekskärm "Dra en stjärna längs banan för att ändra dess Läge.", med tangentbord tillägget "Markera och använd piltangenterna (Shift = 10 steg)."

### 14. Scope-listan ([#60](https://github.com/RobhJoh/hill-charts/issues/60))

**Fynd:** `projekt-agare-cell-tva-rader`, `projekt-ny-scope-utan-fokus`  
**Vyer:** /p/0qtx4cq2ev (Ny inloggning), /p/0qtx4cq2ev · Ny Scope  
**Besvarade frågor:**
- Q10 · Hur byts Ägare och hur når man Stjärnkartan från listan? → **a) Namnet är länk, Byt Ägare i åtgärdsraden**: Namnet leder till Stjärnkartan; byte görs från vald rad bredvid Byt namn och Ta bort.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-agare-cell-tva-rader` (P2) Enligt Q10 (Namnet är länk, Byt Ägare i åtgärdsraden): Ägare-cellen blir två rader med ett oförklarat ✦ är löst. Ursprungligt förslag, där det inte strider mot valet: Gör Ägarens namn till länken till Stjärnkartan och byt Ägare via en liten "Byt" i vald rads åtgärdsrad (bredvid Byt namn och Ta bort), eller behåll selecten och flytta "✦ Stjärnkarta" som text till åtgärdsraden. En rad per Scope.
- [ ] `projekt-ny-scope-utan-fokus` (P2) Flytta fokus till Namn efter att formuläret renderats (tick() och sedan focus()), stäng med Escape, ge formuläret rubriken "Ny Scope", scrolla det i vy på telefon. Visa avstängd primärknapp som kontur i stället för halvgenomskinlig röd, och ge Ny Scope tryckt läge (aria-pressed) medan formuläret är öppet.

### 15. Historik och återställning ([#61](https://github.com/RobhJoh/hill-charts/issues/61))

**Fynd:** `projekt-historik-visa-utom-synhall`, `projekt-historik-knapp-utan-tryckt-lage`, `projekt-historik-knappvagg`, `projekt-visa-blandar-nu-och-da`, `projekt-milstolpe-ta-bort-utan-angra`, `projekt-visa-scopes-grammatik`  
**Vyer:** /p/0qtx4cq2ev (Ny inloggning), /p/0qtx4cq2ev · Historik öppen, /p/0qtx4cq2ev · Historik, Visa  
**Besvarade frågor:**
- Q1 · Hur ska den orangeröda accenten användas? → **c) Bara ny kulör och kontrastfix**: Samma tre användningar som i dag: val, stilla och primärknapp. Minst risk, men accenten blir inte vanligare och krocken med uppförsfärgen löses bara med form.
- Q7 · Var ska "Återställ hit" ligga? → **a) Bara i Visa-bannern**: Raderna får Visa och Ångra bara denna; man ser alltid läget innan man återställer.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-historik-visa-utom-synhall` (P1) På skrivbord: gör sidopanelen sticky under sidhuvudet med egen scroll (max-height: calc(100vh - 56px); overflow: auto), så diagrammet och bannern alltid syns bredvid raden. På telefon: scrolla bannern i vy när Visa trycks, och ha "Tillbaka till nu" i bannern som redan finns.
- [ ] `projekt-historik-knapp-utan-tryckt-lage` (P2) Enligt Q1 (Bara ny kulör och kontrastfix): Historik-knappen ser likadan ut öppen som stängd, och panelen ersätter Scope-listan är löst. Ursprungligt förslag, där det inte strider mot valet: Ge [aria-pressed="true"] ett synligt tryckt läge i accentfärgen (accentram och svag accentbakgrund), ett ställe där ägaren kan använda den orangeröda oftare. Behåll rubriken "Historik" i panelen och lägg "← Scopes" som stänglänk i stället för "Stäng".
- [ ] `projekt-historik-knappvagg` (P2) Enligt Q7 (Bara i Visa-bannern): Historik är en vägg av ca 70 likadana knappar, och Återställ hit sker med ett klick är löst. Ursprungligt förslag, där det inte strider mot valet: Visa radens åtgärder bara på hover, fokus eller vald rad (på telefon: tryck på raden). Låt "Återställ hit" ligga i Visa-bannern, så att man alltid ser innan man återställer, och visa efteråt en toast "Diagrammet återställt · Ångra" som för borttagen Scope.
- [ ] `projekt-visa-blandar-nu-och-da` (P2) Under Visa: dämpa (opacity 0,4) eller dölj nuvarande nedräkning, datumrad och Milstolpar och stäng av Ny Scope, så att bannern är enda tidsangivelsen. Markera det som skiljer med en liten prick eller fet stil i stället för streckad ram.
- [ ] `projekt-milstolpe-ta-bort-utan-angra` (P3) Ge Milstolpe samma mönster som Scope: ta bort direkt och visa "Milstolpe borttagen · Ångra" i toasten.
- [ ] `projekt-visa-scopes-grammatik` (P3) "1 Scope skiljer sig från nu (streckad ring)." och "N Scopes skiljer sig …", samma mönster som för Milstolpar.

### 16. Avslutat och borttaget ([#62](https://github.com/RobhJoh/hill-charts/issues/62))

**Fynd:** `projekt-avslutat-ser-pagaende-ut`, `embed-borttagen-aterstallbar`, `projekt-borttagen-atervandsgrand`, `projekt-saknas-sager-langre`  
**Vyer:** /p/<id>/embed, /p/aekstro366 (Borttagen), /p/finnsinte00-x (404), /p/yrexpob6yl (Gammal API-gateway)  
**Besvarade frågor:**
- Q8 · Hur stängt ska ett Avslutat Projekt kännas? → **b) Skrivskyddat tills Öppna igen**: Tydligast avslut; ett klick extra för att justera i efterhand. *Ägarens notering: Men det skall synas tydligare att projektet är stängt.*

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-avslutat-ser-pagaende-ut` (P2) Enligt Q8 (Skrivskyddat tills Öppna igen): Ett Avslutat Projekt ser ut och beter sig som ett pågående är löst. Ursprungligt förslag, där det inte strider mot valet: Visa Avslutat en gång, i statusraden. Dämpa stjärnorna som Stjärnkartan redan gör med dimmade Avslutade Projekt (opacity 0,45) och gör "Öppna igen" till sidans primära knapp i stället för "Ny Scope". Lägg ett lugnt avslut i statusraden, t.ex. "Avslutat 12 nov. av Bo Ek" hämtat från Historik.
- [ ] `embed-borttagen-aterstallbar` (P3) Ändra länken till "Återställ i Apogee ↗" eller lägg till "Det kan återställas i Apogee." som metarad, och visa Apogee-märket (✦) ovanför texten så att det syns varifrån meddelandet kommer.
- [ ] `projekt-borttagen-atervandsgrand` (P3) Lägg "Återställ" som primär knapp direkt på sidan (samma kommando som i Borttagna-listan, med Signatur), och behåll länken till listan som sekundär. Visa ett tomt, dämpat gradnät med banan bakom texten som igenkänning.
- [ ] `projekt-saknas-sager-langre` (P3) Skriv en text som stämmer i båda fallen: rubrik "Hittar inte Projektet", text "Länken kan vara felskriven, eller så har Projektet raderats." och kvar länken "Till alla Funktionsområden".

### 17. Bädda in ([#63](https://github.com/RobhJoh/hill-charts/issues/63))

**Fynd:** `badda-in-panel-overflow-phone`, `projekt-badda-in-stangs-inte`  
**Vyer:** /p/0qtx4cq2ev · Bädda in  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `badda-in-panel-overflow-phone` (P2) Placera panelen mot sidans kant på smala skärmar (position: fixed; inset-inline: 16px) eller som ett bottenark, och stäng på Escape och klick utanför med fokus tillbaka till "Bädda in".
- [ ] `projekt-badda-in-stangs-inte` (P3) Stäng med Escape och klick utanför, flytta fokus till inbäddningsfältet när den öppnas och tillbaka till "Bädda in" när den stängs. Samma beteende för andra popovers på sidan. **Ägarens notering:** En modal bör också ge lite suddig overlay bakom sig.

### 18. Signatur-remsan ([#64](https://github.com/RobhJoh/hill-charts/issues/64))

**Fynd:** `projekt-vem-remsan-sager-for-lite`, `embed-signatur-osynlig`, `embed-byt-signatur-fragan`, `embed-remsa-utan-fokus`, `embed-sparat-kvitto`  
**Vyer:** /p/0qtx4cq2ev · Vem?-remsan (telefon), /p/<id>/embed, /p/<id>/embed?tema=dag, Embed: över vyerna  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `projekt-vem-remsan-sager-for-lite` (P1) Skriv vad som väntar och varför: "Vem flyttade Felmeddelanden? Ändringen sparas när du valt namn." (bygg texten från den hållna ändringen). Visa "Kommer ihåg valet på den här enheten." även på telefon, på egen rad. Lägg till "Avbryt" som kastar draget och låter stjärnan glida tillbaka. Markera den hållna stjärnan, t.ex. med streckad ring, tills den är sparad.
- [ ] `embed-signatur-osynlig` (P2) Visa namnet bredvid ikonen i bred läge ("Anna Lind" i --dim 13 px, klickbart för att byta), bara ikonen i smal läge. Lägg till "Kommer ihåg valet i den här inbäddningen." i remsan efter Spara-knappen i bred läge.
- [ ] `embed-byt-signatur-fragan` (P3) När remsan öppnas från ikonen: "Vem är du?" eller "Signatur" som etikett, med samma Person-lista och Spara.
- [ ] `embed-remsa-utan-fokus` (P3) Flytta fokus till Person-listan när remsan öppnas av ett hållet drag och ge formuläret role="status"/aria-live="polite" med frågan; återlämna fokus till stjärnan efter Spara eller Avbryt.
- [ ] `embed-sparat-kvitto` (P3) Visa en kort rad i huvudet eller där remsan satt i ca 2 s: "Sparat · BankID-flöde 94 · Anna Lind", och låt stjärnans glöd pulsera en gång (avstängt under prefers-reduced-motion).

### 19. Embed: läsa kullen ([#65](https://github.com/RobhJoh/hill-charts/issues/65))

**Fynd:** `embed-stjarna-lista-koppling`, `embed-lista-namn-kapas`, `embed-uppfor-nedfor-saknas`, `embed-vald-och-stilla-ringar`  
**Vyer:** /p/<id>/embed, Embed: över vyerna  
**Besvarade frågor:**
- Q1 · Hur ska den orangeröda accenten användas? → **c) Bara ny kulör och kontrastfix**: Samma tre användningar som i dag: val, stilla och primärknapp. Minst risk, men accenten blir inte vanligare och krocken med uppförsfärgen löses bara med form.
- Q3 · Hur ska man se vilken stjärna som är vilken Scope i bred embed? → **b) Alla etiketter som får plats**: Mest läsbart i mötet; med dagens fem Scopes får alla etiketter plats även i 220 px höjd, fler Scopes visas vid val.
- Q14 · Vad ska kullens två halvor heta? → **a) Utforskar · Genomför**: Korta verb som säger vad teamet gör. Nära Shape Ups mening och ryms även i smal embed.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `embed-stjarna-lista-koppling` (P1) Enligt Q3 (Alla etiketter som får plats): I bred läge går det inte att se vilken stjärna som är vilken Scope är löst. Ursprungligt förslag, där det inte strider mot valet: Länka listan och kullen åt båda håll vid hover och fokus (rad → ring och etikett på stjärnan, stjärna → markerad rad). Visa dessutom alla etiketter som får plats utan krock när höjden räcker (se frågan om etiketter), och sortera listan 0→100 så den läses i samma riktning som kullen, eller vänd kullen-ordningen tydligt.
- [ ] `embed-lista-namn-kapas` (P2) Ge namnet företräde: Ägare på en andra rad i --dim 12 px (raden blir ca 34 px, fem rader ryms fortfarande i 265 px), eller visa bara förnamn. Låt listan växa till ca 260 px när rutan är bredare än 640 px.
- [ ] `embed-uppfor-nedfor-saknas` (P2) Enligt Q14 (Utforskar · Genomför): Kullen säger inte vad uppför och nedför betyder är löst. Ursprungligt förslag, där det inte strider mot valet: Lägg tillbaka prototypens två axeltexter i 11–12 px --dim under baslinjen ("Uppför · lista ut" vänster, "Nedför · genomföra" höger) när rutans höjd tillåter, som i prototypen (h > 150). **Ägarens notering:** Ja, bra att göra. Men inte uppför och nedför som texter. Hur benämner Shape Up dem? Bör ha mera förklarande namn, som t.ex. utforskande och implementering eller liknande.
- [ ] `embed-vald-och-stilla-ringar` (P3) Enligt Q1 (Bara ny kulör och kontrastfix): Vald och stilla ger två röda ringar på samma stjärna är löst. Ursprungligt förslag, där det inte strider mot valet: Låt rött (det nya orangeröda) betyda stilla och primär handling, och rita markeringen i --tx (bläck) med 1,5 px, eller öka avståndet så ringarna läses som två (stilla r 10, vald r 15). Se frågan om accentfärgen.

### 20. Embed: tema och storlek ([#66](https://github.com/RobhJoh/hill-charts/issues/66))

**Fynd:** `embed-alltid-dag`, `embed-hog-ruta-stracks`, `embed-appetit-slut-syns-inte`, `embed-smal-huvud-tar-plats`  
**Vyer:** /p/<id>/embed, Embed: över vyerna  
**Besvarade frågor:**
- Q1 · Hur ska den orangeröda accenten användas? → **c) Bara ny kulör och kontrastfix**: Samma tre användningar som i dag: val, stilla och primärknapp. Minst risk, men accenten blir inte vanligare och krocken med uppförsfärgen löses bara med form.
- Q2 · Vilket tema ska Notion-embedden ha? → **b) Följ datorns tema**: Mörk när datorn är mörk, vilket ofta följer Notions tema; kan krocka när Notion och datorn har olika tema.
- Q3 · Hur ska man se vilken stjärna som är vilken Scope i bred embed? → **b) Alla etiketter som får plats**: Mest läsbart i mötet; med dagens fem Scopes får alla etiketter plats även i 220 px höjd, fler Scopes visas vid val.
- Q20 · Vad ska den smala embedden visa i huvudet? → **a) Namn och nedräkning på en rad, hårlinje**: "Ny inloggning · 4 dagar kvar" och en 2 px stapel under. Huvudet ca 32 px, kullen ca 288 px.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `embed-alltid-dag` (P2) Enligt Q2 (Följ datorns tema): Embedden är alltid ljus och ignorerar både ?tema och sparat tema är löst. Ursprungligt förslag, där det inte strider mot valet: Välj beteende i frågan om embed-tema. Oavsett val: läs tokens från app.css [data-theme="dag"] och låt .ap bara åsidosätta --bg (#fff), i stället för en egen kopia.
- [ ] `embed-hog-ruta-stracks` (P2) Enligt Q3 (Alla etiketter som får plats): Högre embed sträcker bara kullen till en spira är löst. Ursprungligt förslag, där det inte strider mot valet: Begränsa kullens höjd till ungefär 0,45 × bredden och centrera den vertikalt; använd överskottet till axeltexterna och till att visa alla etiketter som får plats (t.ex. från ca 420 px höjd även i bred läge).
- [ ] `embed-appetit-slut-syns-inte` (P3) Enligt Q1 (Bara ny kulör och kontrastfix): Att Appetiten nästan är slut syns inte är löst. Ursprungligt förslag, där det inte strider mot valet: Låt stapelns fyllnad gå över i den nya orangeröda accenten under sista ca 15 % av Appetiten (texten förblir --mid), och behåll full röd text för Över tid.
- [ ] `embed-smal-huvud-tar-plats` (P3) Enligt Q20 (Namn och nedräkning på en rad, hårlinje): Smalt huvud tar en fjärdedel av höjden är löst. Ursprungligt förslag, där det inte strider mot valet: I smal läge: namn och nedräkning på en rad, Milstolpen bara om nedräkningen saknas, ingen stapel (eller en 2 px hårlinje under huvudet som i variant A).

### 21. Stjärnkarta ([#67](https://github.com/RobhJoh/hill-charts/issues/67))

**Fynd:** `stjarnkarta-bokstaver-svaga`, `stjarnkarta-drag-avslut`, `stjarnkarta-filter-ett-val`, `stjarnkarta-nyckel-namn-bryts`  
**Vyer:** /person/9p2wfr02el (Stjärnkarta)  
**Besvarade frågor:**
- Q12 · Ska Avslutade Projekt synas på Stjärnkartan och bland grannprojekten? → **a) Aldrig på kartan; sist i sidomenyn med ✦**: Stjärnkartan visar bara pågående, filterraden tas bort. Sidomenyn "Andra Projekt i Kundupplevelse" listar Avslutade sist med ljusblå ✦ och ordet "Avslutat" i full kontrast.

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `stjarnkarta-bokstaver-svaga` (P3) Visa bokstäver först när fler än ett Projekt syns. I nyckeln: ge bokstaven samma storlek som Projektnamnet, gärna som en liten markering (ruta eller ring) så att den läses som en etikett.
- [ ] `stjarnkarta-drag-avslut` (P3) Låt stjärnan få en kort ljuspuls när Uppdateringen är sparad (respektera prefers-reduced-motion), och låt toasten säga "Ångrat" en sekund efter Ångra.
- [ ] `stjarnkarta-filter-ett-val` (P3) Enligt Q12 (Aldrig på kartan; sist i sidomenyn med ✦): Filtret visar en ensam knapp när inga Projekt är avslutade är löst. Ursprungligt förslag, där det inte strider mot valet: Dölj hela filterraden när det inte finns några avslutade Projekt. **Ägarens notering:** Avslutade projekt behöver aldrig visas här.
- [ ] `stjarnkarta-nyckel-namn-bryts` (P3) Lägg nedräkningen på egen rad under Projektnamnet (som en meta-rad) i stället för bredvid, så att namnet alltid får hela bredden.

### 22. Personer-sidan ([#68](https://github.com/RobhJoh/hill-charts/issues/68))

**Fynd:** `personer-lastrad-som-forlopp`, `personer-namn-syns-inte-som-lank`, `personer-historik-allt-fetstilt`  
**Vyer:** /installningar/personer (Visa inaktiva på)  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `personer-lastrad-som-forlopp` (P2) Rita en liten kulle (samma form som startsidans mini-himlar) och lägg prickarna på kurvan, med en tunn markering vid toppen. Gör hela raden till länk till Stjärnkartan.
- [ ] `personer-namn-syns-inte-som-lank` (P2) Visa länken som länk (understrykning eller pil "Stjärnkarta →"), och låt lastraden vara en del av samma klickyta.
- [ ] `personer-historik-allt-fetstilt` (P3) Gör den som utförde ändringen vanlig vikt och bara den berörda Personen fetstil; ge "tog bort" och "bytte namn på" en diskret markering så att de syns bland "lade till".

### 23. Felsidor och tillstånd ([#69](https://github.com/RobhJoh/hill-charts/issues/69))

**Fynd:** `live-socket-errors`, `saknas-ingen-karaktar`  
**Vyer:** /finns-inte, /p/finnsinte00-x (404)  

**Acceptanskriterier** (kontrolleras i webbläsaren):
- [ ] `live-socket-errors` (P3) Starta live-följningen först när första hämtningen lyckats och Projektet är pågående, och stäng den utan att öppna om sidan byter tillstånd.
- [ ] `saknas-ingen-karaktar` (P3) Lägg en tom miniatyrkarta (kullen utan stjärnor) ovanför rubriken och en rad i samma ton som appen, t.ex. "Här finns inga stjärnor.", följt av länken "Till alla Funktionsområden". Visa länken som knapp så att den är lätt att träffa på telefon.

## Senare

Inget: alla fynd beslutades Åtgärda.

## Utanför omfånget: nya funktioner

- **Inställning för stilla-gräns** (`stilla-forklaras-inte`): ägaren vill att en punkt räknas som stilla efter 6 dagar utan ändring, och att gränsen går att ändra. Det kräver en ny inställning (lagras i kärnan, visas under Inställningar). Ligger med i uppgift 6 men är en ny funktion, inte bara en designändring.

## Öppna frågor

Inga.
