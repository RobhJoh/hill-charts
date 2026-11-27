# Apogee v1, granskad

Apogee · 2026-11-26 · #1

21 vyer i fem områden, i desktop, telefon och Notion-embed, granskade med Impeccable. Varje fynd behöver ditt beslut och varje fråga ett val.

Rapport: https://claude.ai/artifact/3dCJGLvKpdbPAjT9GAmZPh

**Fynd:** 77 — Åtgärda 77, Senare 0, Acceptera 0, Diskutera 0

**Audit:** accessibility 2, performance 4, theming 3, responsive 1, integrity 3

## Frågor

### Q1 · Hur ska den orangeröda accenten användas?

Du vill ha en mer orangeröd accent som får synas oftare. Vit text på dagens röda når bara 3,9:1 och blir sämre ju orangeare den blir, och stilla-ringen har redan nästan samma färg som stjärnorna uppför.

**Svar:** c) Bara ny kulör och kontrastfix — Samma tre användningar som i dag: val, stilla och primärknapp. Minst risk, men accenten blir inte vanligare och krocken med uppförsfärgen löses bara med form. (rekommendation: a) En orangeröd för val, aktiva lägen, handling och larm)
Fynd: primarknapp-kontrast, projekt-accent-krockar-med-uppfor, start-nytt-fo-dominerar, personer-visa-inaktiva-lage, stjarnkarta-vald-rad-svag, projekt-historik-knapp-utan-tryckt-lage, embed-vald-och-stilla-ringar, embed-appetit-slut-syns-inte

### Q2 · Vilket tema ska Notion-embedden ha?

Embedden är alltid dag. Det smälter in i ljust Notion men blir en vit ruta i mörkt Notion, och natthimlen syns aldrig. ?tema läses inte i dag.

**Svar:** b) Följ datorns tema — Mörk när datorn är mörk, vilket ofta följer Notions tema; kan krocka när Notion och datorn har olika tema. (rekommendation: c) Välj i Bädda in, ?tema=natt i länken)
Fynd: embed-alltid-dag

### Q3 · Hur ska man se vilken stjärna som är vilken Scope i bred embed?

I dag visas bara den valda stjärnans etikett, så kopplingen mellan stjärna och listrad hänger på färg och klick.

**Svar:** b) Alla etiketter som får plats — Mest läsbart i mötet; med dagens fem Scopes får alla etiketter plats även i 220 px höjd, fler Scopes visas vid val.
Fynd: embed-stjarna-lista-koppling, embed-hog-ruta-stracks

### Q4 · I vilken ordning ska Projekt stå i översikten?

Bokstavsordning är förutsägbar men gömmer det som står still, och Avslutade står mitt bland Pågående.

**Svar:** c) Avslutade ihopfällda — Pågående i bokstavsordning; Avslutade i en kompakt rad under rutnätet. (rekommendation: a) Bokstavsordning, Avslutade sist)
Fynd: start-ordning-doljer-problem, avslutade-blandas-med-pagaende

### Q5 · Var ska sällsynta handlingar som Byt namn, Kopiera länk och Ta bort ligga?

På Funktionsområde och Projekt står de med samma vikt som de vanliga handlingarna; Projektsidan har fjorton kontroller före diagrammet.

**Svar:** a) Mer-meny vid rubriken — En knapp "Mer" öppnar Byt namn, Flytta, Kopiera länk, Bädda in och Ta bort. Samma mönster på båda sidorna.
Fynd: fo-sidhuvud-for-manga-handlingar, projekt-fjorton-kontroller-fore-diagrammet

### Q6 · Hur ska nedräkningen skrivas?

Raden blandar enheter: "4 dagar kvar av 8 veckor" men "22 dagar kvar av 108 dagar".

**Svar:** a) Bara dagar kvar — "4 dagar kvar"; stapeln visar andelen och Appetiten står på sidan. (rekommendation: b) Samma enhet på båda sidor)
Fynd: nedrakning-blandade-enheter

### Q7 · Var ska "Återställ hit" ligga?

Varje Historik-rad har Återställ hit, som skriver om hela diagrammet med ett klick utan Ångra-toast.

**Svar:** a) Bara i Visa-bannern — Raderna får Visa och Ångra bara denna; man ser alltid läget innan man återställer.
Fynd: projekt-historik-knappvagg

### Q8 · Hur stängt ska ett Avslutat Projekt kännas?

Ett Avslutat Projekt ser ut och beter sig som ett pågående: samma diagram, dragbara stjärnor och röd "Ny Scope".

**Svar:** b) Skrivskyddat tills Öppna igen — Tydligast avslut; ett klick extra för att justera i efterhand. (rekommendation: a) Dämpat men redigerbart)
Anteckning: Men det skall synas tydligare att projektet är stängt.
Fynd: projekt-avslutat-ser-pagaende-ut

### Q9 · Hur ska Hill chart och Stjärnkarta se ut på telefon?

Diagrammet skalas ner från 900 enheter: etiketterna blir 6–7 px och stjärnorna 13 px att träffa.

**Svar:** a) Egen telefonruta i riktiga pixlar — Ritas för telefonbredden med 13 px etiketter och 44 px träffytor; nyckel och lista under.
Fynd: projekt-telefon-diagram-for-litet, stjarnkarta-telefon-for-liten

### Q10 · Hur byts Ägare och hur når man Stjärnkartan från listan?

Ägare är en genomskinlig select och Stjärnkartan ett ensamt ✦ på egen rad.

**Svar:** a) Namnet är länk, Byt Ägare i åtgärdsraden — Namnet leder till Stjärnkartan; byte görs från vald rad bredvid Byt namn och Ta bort.
Fynd: projekt-agare-cell-tva-rader

### Q11 · Hur ska Avslutade Projekt visas i Funktionsområdets cell och sida?

Du har rätt: ett Avslutat Projekt står på 100, så dess minikarta säger inget nytt och den tonade cellen blir bara svårläst (ca 2,9:1). Därför försvinner minikartan i alla varianter; frågan är hur listan ser ut.

**Svar:** a) Lista "Avslutade" med ljusblå ✦ — Avslutade samlas sist i en tät lista: ljusblå ✦, namn och "Avslutat 12 nov.". Full kontrast (namn ca 12:1, datum ca 6:1). Pågående celler först, oförändrade.
Fynd: avslutat-for-lag-kontrast

### Q12 · Ska Avslutade Projekt synas på Stjärnkartan och bland grannprojekten?

Nej, inte på Stjärnkartan: en stjärna på 100 kräver inget av Ägaren, och utan Avslutade behövs filterraden inte alls. I Projektets sidomeny kan de däremot vara bra som väg tillbaka.

**Svar:** a) Aldrig på kartan; sist i sidomenyn med ✦ — Stjärnkartan visar bara pågående, filterraden tas bort. Sidomenyn "Andra Projekt i Kundupplevelse" listar Avslutade sist med ljusblå ✦ och ordet "Avslutat" i full kontrast.
Fynd: stjarnkarta-filter-ett-val, projekt-grannar-avslutat-utan-ord

### Q13 · Hur ska primärknappen se ut med den orangeröda accenten?

Q1 blev ny kulör och kontrastfix. I dag ger vit text på #e0503a 3,9:1, under kravet 4,5:1, och en mer orange kulör med vit text sjunker till ca 3,3:1. Så antingen blir texten mörk, kulören mörkare, eller knappen en kontur.

**Svar:** a) Ljus orangeröd, mörk text — Natt: #f0602e med text #081026, 5,8:1. Dag: #c44a1c med vit text, 4,8:1. Starkast lyster, samma kulör som stilla-ringen.
Fynd: primarknapp-kontrast

### Q14 · Vad ska kullens två halvor heta?

Shape Up kallar dem "figuring things out" (uppför: okända delar, man vet inte än hur) och "making it happen" (nedför: allt är känt, det återstår att göra). Texterna står under baslinjen i Hill chart och i embedden när rutan är högre än 150 px.

**Svar:** a) Utforskar · Genomför — Korta verb som säger vad teamet gör. Nära Shape Ups mening och ryms även i smal embed.
Fynd: embed-uppfor-nedfor-saknas

### Q15 · Ska vald stjärna märkas med Apogees ✦?

Ja, det går och löser krocken bättre än färg: ✦ är en form, så den skiljer sig från rampens orange oavsett kulör. Den kan stå i etiketten eller ersätta ringen.

**Svar:** a) ✦ före namnet i etiketten, heldragen ring — Vald: heldragen 2 px ring i accent och "✦ Sessionshantering" i etiketten och listan. Stilla behåller sin streckade ring med mörk halo.
Fynd: projekt-accent-krockar-med-uppfor

### Q16 · Hur ska sidhuvudet se ut på telefon när en Signatur är satt?

Sidhuvudet blir 457 px på en 390 px skärm, så hela sidan glider i sidled. Märket, Signaturen och kugghjulet måste rymmas på en rad.

**Svar:** a) Initialer som meny — Märke, knapp "AL" och kugghjul. "AL" öppnar en meny med Mina Scopes, Byt Signatur och tema. Sidan blir exakt 390 px.
Fynd: header-telefon-for-brett

### Q17 · Hur mycket ska Hill chart och Stjärnkarta visa på telefon?

Q9 a ger en egen telefonruta med 13 px etiketter och 44 px träffytor. Kvar är om alla etiketter ska stå framme, och samma 44 px gäller knappar och nyckelrader på Personer och Stjärnkartan (i dag 18–27 px).

**Svar:** b) Alltid alla etiketter — Etiketterna i 13 px staplas med ledarlinjer. Allt syns utan tryck, men rutan blir ca 1,5 gånger högre med 6 Scopes. (rekommendation: a) Alla etiketter upp till 4, sedan bara vald)
Fynd: projekt-telefon-diagram-for-litet, stjarnkarta-telefon-for-liten, personer-knappar-for-sma-telefon

### Q18 · Vad ska stå framme i Funktionsområdets sidhuvud?

Q5 a lägger Byt namn, Kopiera länk och Ta bort i en Mer-meny. Kvar är om tidsplanens Ändra datum och Ny Milstolpe också ska in där, och vad telefonen visar först.

**Svar:** b) Allt utom Nytt Projekt i Mer-menyn — Bara "Nytt Projekt" och "Mer" framme. Lugnast, men tidsplanen ändras genom en meny. (rekommendation: a) Mer-meny för sällsynta; tidsplan och Nytt Projekt kvar)
Fynd: fo-sidhuvud-for-manga-handlingar

### Q19 · Var ska hjälptexten om att dra stjärnor stå?

I dag står den under färgskalan, på telefon ca 700 px under diagrammet, och nämner piltangenter.

**Svar:** a) Direkt under diagrammet, anpassad — "Dra en stjärna längs banan för att ändra dess Läge." På dator läggs till "Markera och använd piltangenterna (Shift = 10 steg)."
Fynd: projekt-hjalptext-fel-plats

### Q20 · Vad ska den smala embedden visa i huvudet?

I 400×320 tar huvudet ca 80 px, så kullen får knappt 240 px.

**Svar:** a) Namn och nedräkning på en rad, hårlinje — "Ny inloggning · 4 dagar kvar" och en 2 px stapel under. Huvudet ca 32 px, kullen ca 288 px.
Fynd: embed-smal-huvud-tar-plats

## Fynd

### Embed: läsa kullen

- **P1 · I bred läge går det inte att se vilken stjärna som är vilken Scope** (`embed-stjarna-lista-koppling`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320 @ embed-bred, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Utan markering visas inga etiketter, så kopplingen mellan stjärna och listrad går bara via färg. Grannar på kullen har nästan samma färg (Felmeddelanden 10 och Sessionshantering 30 är båda orange, Tillgänglighetsgranskning 71 och BankID-flöde 85 båda blå), och kullen saknar skala, så Läge-siffrorna i listan hjälper inte heller. Listan är dessutom sorterad 85→10, motsatt kullens vänster-till-höger. I mötet frågar någon "vilken är min?" och måste klicka rad för rad. Hover på en rad gör ingenting med stjärnan.
  - Åtgärd: Länka listan och kullen åt båda håll vid hover och fokus (rad → ring och etikett på stjärnan, stjärna → markerad rad). Visa dessutom alla etiketter som får plats utan krock när höjden räcker (se frågan om etiketter), och sortera listan 0→100 så den läses i samma riktning som kullen, eller vänd kullen-ordningen tydligt.
  - Designregel Spec #31 story 18; Product Principle 1: säger "En Scopes färg ska göra läget läsbart utan etiketter; Hill chart är produkten", gör "Färgen visar ungefärligt läge men räcker inte för att skilja Scopes åt; utan etiketter blir kullen ett mönster utan namn"
  - Avgörs av Q3
  - Beslut: **Åtgärda**
- **P2 · Scope-namnen kapas till oläslighet i listan** (`embed-lista-namn-kapas`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320 @ embed-bred, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: I 230 px listan tar Ägare och Läge så mycket plats att namnen blir "Tillgänglighets…", "Lösenordsåterstäl…", "Sessionsha…" och "Felmeddeland…". Listan är embeddens legend; när namnet kapas är den enda vägen till vilken Scope det är en tooltip.
  - Åtgärd: Ge namnet företräde: Ägare på en andra rad i --dim 12 px (raden blir ca 34 px, fem rader ryms fortfarande i 265 px), eller visa bara förnamn. Låt listan växa till ca 260 px när rutan är bredare än 640 px.
  - Beslut: **Åtgärda**
- **P2 · Kullen säger inte vad uppför och nedför betyder** (`embed-uppfor-nedfor-saknas`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320 @ embed-bred, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Embedden når fler än teamet: alla som läser Notion-sidan. Utan "Uppför · lista ut" och "Nedför · genomföra" ser kullen ut som en normalfördelning med prickar, och en läsare tolkar höger som "klart" eller toppen som "bäst". Prototypen visade texterna när rutan var högre än 150 px; implementationen tog bort dem helt för kompakt.
  - Åtgärd: Lägg tillbaka prototypens två axeltexter i 11–12 px --dim under baslinjen ("Uppför · lista ut" vänster, "Nedför · genomföra" höger) när rutans höjd tillåter, som i prototypen (h > 150).
  - Designregel origin/prototype/embed variant B; Product Principle 2: säger "Prototypen ritar "Uppför · lista ut" och "Nedför · genomföra" när kullens ruta är över 150 px; position betyder osäkerhet, inte framsteg", gör "kompakt-läget i HillChart.svelte ritar ingen axeltext alls"
  - Avgörs av Q14
  - Beslut: **Åtgärda** — Ja, bra att göra. Men inte uppför och nedför som texter. Hur benämner Shape Up dem? Bör ha mera förklarande namn, som t.ex. utforskande och implementering eller liknande.
- **P3 · Vald och stilla ger två röda ringar på samma stjärna** (`embed-vald-och-stilla-ringar`, Embed: över vyerna, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: När Sessionshantering markeras ritas den heldragna röda markeringsringen (r 13) utanpå den streckade röda stilla-ringen (r 10). Båda är röda och nästan lika stora, så de flyter ihop till en klump, och det går inte att se att den både är vald och stilla. Samma röda betyder två saker.
  - Åtgärd: Låt rött (det nya orangeröda) betyda stilla och primär handling, och rita markeringen i --tx (bläck) med 1,5 px, eller öka avståndet så ringarna läses som två (stilla r 10, vald r 15). Se frågan om accentfärgen.
  - Avgörs av Q1
  - Beslut: **Åtgärda**

### Handlingar i sidhuvudet

- **P1 · "Ta bort" erbjuds och bekräftas trots att Plattform har Pågående Projekt** (`fo-ta-bort-erbjuds-trots-sparr`, /f/4djnni9x4g (Plattform) · med · populated @ desktop, critique)
  - Varför: Plattform har två Pågående Projekt, så kärnan vägrar Ta bort. Ändå visar knappen en bekräftelse som lovar "Ta bort Plattform med 3 Projekt? Det kan återställas." med en röd "Ta bort"-knapp; först efter klicket kommer felet. Användaren får ett löfte som sedan bryts, i ett ögonblick som redan känns riskabelt.
  - Åtgärd: Visa "Ta bort" bara när alla Projekt är Avslutade. Annars: en inaktiv knapp med förklaringen bredvid, t.ex. "Kan tas bort när alla Projekt är Avslutade (2 pågår)". Datat för att avgöra det finns redan på sidan.
  - Designregel spec #31 berättelse 66: säger "Ta bort på ett Funktionsområde bara när alla dess Projekt är Avslutade", gör "Knappen och bekräftelsen visas alltid; spärren märks först som ett fel efter bekräftelsen"
  - Beslut: **Åtgärda**
- **P2 · Sex handlingar före Projekten, och på telefon bryts de konstigt** (`fo-sidhuvud-for-manga-handlingar`, /f/4djnni9x4g (Plattform) · med · populated @ phone, critique)
  - gäller: /f/4djnni9x4g (Plattform) · med · populated, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden
  - Varför: "Byt namn", "Kopiera länk", "Ta bort", "Ändra datum", "Ny Milstolpe" och "Nytt Projekt" står alla framme, fler än fyra val på samma ställe. De sällsynta handlingarna (byta namn, ta bort) står närmast rubriken och har samma vikt som de vanliga. På telefon hamnar "Ta bort" ensam och indragen på en egen rad under rubriken, och första Projektet börjar först ca 380 px ned.
  - Åtgärd: Behåll "Nytt Projekt" och tidsplanens "Ändra datum"/"Ny Milstolpe" synliga. Samla "Byt namn", "Kopiera länk" och "Ta bort" bakom en knapp "Mer" (eller ⋯) bredvid rubriken. På telefon: rubrik, status och nedräkning först, Projekten sedan.
  - Avgörs av Q18
  - Beslut: **Åtgärda**
- **P2 · Fjorton kontroller i samma vikt står före diagrammet** (`projekt-fjorton-kontroller-fore-diagrammet`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ desktop, critique)
  - gäller: /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/0qtx4cq2ev · dag · dag · populated, ljust tema, /p/59rz6gw74a (Betalningar v2) · med · Över tid, en Scope vars Ägare lämnats över, /p/yrexpob6yl (Gammal API-gateway) · med · markerat Avslutat
  - Varför: Ovanför diagrammet ligger Byt namn, Flytta, Kopiera länk, Bädda in, Ta bort, Historik, Ny Scope, Pågående/Markera Avslutat, nedräkningen, datumraden med Ändra datum och Ny Milstolpe, och Milstolpe-raden med Ändra och Ta bort: fyra rader och fjorton beslutspunkter. Underhållsåtgärder som används en gång per kvartal har samma vikt som nedräkningen. Diagrammet börjar vid 375 px på skrivbord och ca 420 px på telefon. Status ("Pågående") och nedräkningen står på olika rader fast de svarar på samma fråga.
  - Åtgärd: Samla sällan använda åtgärder (Byt namn, Flytta, Kopiera länk, Bädda in, Markera Avslutat, Ta bort) i en meny "Mer ▾" bredvid Historik och Ny Scope. Slå ihop status och tid till en rad: "Pågående · 4 dagar kvar av 8 veckor · ◆ Acceptanstest om 4 dagar". Låt datum och Milstolpar redigeras från en "Ändra datum och Milstolpar" som fäller ut nuvarande formulär. Målet är att diagrammet börjar under titeln plus en rad.
  - Designregel PRODUCT.md, Product Principles 1: säger "The Hill chart is the product; everything else is navigation to it", gör "Fyra rader verktyg och metadata trycker ner diagrammet till mitten av skärmen"
  - Avgörs av Q5
  - Beslut: **Åtgärda**

### Hill chart på telefon

- **P1 · På telefon blir diagrammets etiketter ca 6 px och stjärnorna för små att träffa med tummen** (`projekt-telefon-diagram-for-litet`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ phone, critique)
  - gäller: /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/0qtx4cq2ev · Scope vald · med · en Scope markerad i listan, /p/0qtx4cq2ev · Vem?-remsan (telefon) · utan · Signatur-remsan efter första ändringen, /person/9p2wfr02el (Stjärnkarta) · med · populated
  - Varför: Diagrammet ritas i en fast viewBox på 900 enheter och skalas ner till kolumnbredden. På telefon blir 15-enheters etiketter omkring 6–7 px höga och träffytan (radie 16 enheter) ungefär 13 px i diameter, långt under 44 px. Dessutom renderas sidan 457 px bred på en 390 px-telefon eftersom sidhuvudet sticker ut (sidhuvudet granskas separat), vilket krymper allt ytterligare. En Scopes Ägare som justerar sitt Läge från telefonen mellan möten är en av tre målgrupper, och PRODUCT.md lovar att redigering är lika direkt som att peka.
  - Åtgärd: Ge diagrammet under 900 px en egen ruta i riktiga pixlar, som kompaktRuta redan gör för embed: mät bredden, behåll gradnät och axel men rita etiketter i 13–14 px och en osynlig träffcirkel på minst 22 px radie i CSS-pixlar. Visa bara vald stjärnas etikett (etiketter="valt", som i embed) när fler än ca 4 Scopes trängs, eftersom listan direkt under redan har namnen.
  - Designregel PRODUCT.md, Product Principles 3: säger "Editing is as direct as pointing: drag the dot, on desktop, phone or inside Notion", gör "På telefon är stjärnan ca 13 px att träffa och etiketterna går inte att läsa"
  - flaggat även av: Impeccable audit
  - Avgörs av Q17
  - Beslut: **Åtgärda**
- **P1 · Stjärnkartan krymper till oläslig storlek på telefon** (`stjarnkarta-telefon-for-liten`, /person/9p2wfr02el (Stjärnkarta) · med · populated @ phone, critique)
  - Varför: Kartan ritas i en 900 punkter bred viewBox som skalas ner till ungefär 340 px: etiketterna blir omkring 6 px, "Ingen rörelse på 21 dagar" likaså, och stjärnornas träffyta (radie 16 i viewBox) blir runt 12 px. Mina Scopes är just den sida en Ägare öppnar på telefonen mellan möten (PRODUCT.md), så det viktigaste jobbet – att läsa och dra sin egen stjärna – blir gissning och feltryck.
  - Åtgärd: Under ca 600 px: rita kullen i verkliga pixlar som inbäddningens kompakta läge (kompaktRuta, 13 px text) med högre bild än bredd, visa etikett bara för vald stjärna (etiketter="valt") och låt nyckeln under kartan vara etikettlistan. Gör stjärnornas osynliga träffyta minst 44 px i skärmpixlar.
  - Designregel PRODUCT.md › Product Principles 3: säger "Editing is as direct as pointing: drag the dot, on desktop, phone or inside Notion", gör "På telefon är stjärnan ca 12 px att träffa och etiketterna ca 6 px höga"
  - Avgörs av Q17
  - Beslut: **Åtgärda**
- **P3 · Hjälptexten om att dra står långt från diagrammet och nämner piltangenter på telefon** (`projekt-hjalptext-fel-plats`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ phone, critique)
  - Varför: "Dra en stjärna längs banan för att ändra dess Läge, eller markera den och använd piltangenterna." står under färgskalan, på telefon ca 700 px under diagrammet, och talar om piltangenter som telefonen inte har.
  - Åtgärd: Flytta texten direkt under diagrammet och anpassa: på pekskärm "Dra en stjärna längs banan för att ändra dess Läge.", med tangentbord tillägget "Markera och använd piltangenterna (Shift = 10 steg)."
  - Avgörs av Q19
  - Beslut: **Åtgärda**

### Historik och återställning

- **P1 · Visa längre ner i Historik ändrar ett diagram som ligger utanför skärmen** (`projekt-historik-visa-utom-synhall`, /p/0qtx4cq2ev · Historik, Visa · med · Visa-förhandsvisning av en äldre Uppdatering @ desktop, critique)
  - gäller: /p/0qtx4cq2ev · Historik öppen · med · Historik-panelen öppen, /p/0qtx4cq2ev · Historik, Visa · med · Visa-förhandsvisning av en äldre Uppdatering
  - Varför: Historik-panelen är 24 rader och sidan blir 2750 px hög. Klickar man Visa på en rad längre ner byts diagrammet och bannern dyker upp högst upp, utom synhåll; på telefon hamnar bannern ovanför skärmen (uppmätt: -67 px). Det enda som syns är att raden blir markerad, så man tror inte att något hände eller jämför fel bild innan man trycker Återställ hit.
  - Åtgärd: På skrivbord: gör sidopanelen sticky under sidhuvudet med egen scroll (max-height: calc(100vh - 56px); overflow: auto), så diagrammet och bannern alltid syns bredvid raden. På telefon: scrolla bannern i vy när Visa trycks, och ha "Tillbaka till nu" i bannern som redan finns.
  - Beslut: **Åtgärda**
- **P2 · Historik-knappen ser likadan ut öppen som stängd, och panelen ersätter Scope-listan** (`projekt-historik-knapp-utan-tryckt-lage`, /p/0qtx4cq2ev · Historik öppen · med · Historik-panelen öppen @ desktop, critique)
  - Varför: Knappen har aria-pressed="true" när panelen är öppen men samma ram, bakgrund och text som stängd. Samtidigt försvinner Scope-listan med Ägare och Läge, så man ser inte varför vyn bytt eller hur man kommer tillbaka förutom "Stäng" uppe till höger i panelen.
  - Åtgärd: Ge [aria-pressed="true"] ett synligt tryckt läge i accentfärgen (accentram och svag accentbakgrund), ett ställe där ägaren kan använda den orangeröda oftare. Behåll rubriken "Historik" i panelen och lägg "← Scopes" som stänglänk i stället för "Stäng".
  - Avgörs av Q1
  - Beslut: **Åtgärda**
- **P2 · Historik är en vägg av ca 70 likadana knappar, och Återställ hit sker med ett klick** (`projekt-historik-knappvagg`, /p/0qtx4cq2ev · Historik öppen · med · Historik-panelen öppen @ desktop, critique)
  - Varför: Varje rad har "Visa", "Återställ hit" och "Ångra bara denna" i samma tysta stil; med 24 rader blir det ca 70 knappar som drar blicken från vem, vad och när. "Återställ hit" på en rad skriver om hela diagrammet direkt, utan förhandsvisning, bekräftelse eller Ångra-toast, mitt i ett möte där andra drar stjärnor live. Att ta bort en Scope får "Scope borttagen · Ångra", men att återställa hela diagrammet får inget.
  - Åtgärd: Visa radens åtgärder bara på hover, fokus eller vald rad (på telefon: tryck på raden). Låt "Återställ hit" ligga i Visa-bannern, så att man alltid ser innan man återställer, och visa efteråt en toast "Diagrammet återställt · Ångra" som för borttagen Scope.
  - Avgörs av Q7
  - Beslut: **Åtgärda**
- **P2 · Under Visa står nutidens datum och Milstolpe kvar ovanför det gamla diagrammet** (`projekt-visa-blandar-nu-och-da`, /p/0qtx4cq2ev · Historik, Visa · med · Visa-förhandsvisning av en äldre Uppdatering @ desktop, critique)
  - Varför: Bannern säger "Datumen skiljer sig från nu" och visar "Inga datum", men raden ovanför visar fortfarande "4 dagar kvar av 8 veckor" och "◆ Acceptanstest 30 nov. 2026". Ny Scope, Ändra datum och Ny Milstolpe är också aktiva fast diagrammet är skrivskyddat. Två tidpunkter på samma skärm gör jämförelsen svårare, inte lättare. "Inga datum" har en streckad ram och ser ut som en knapp.
  - Åtgärd: Under Visa: dämpa (opacity 0,4) eller dölj nuvarande nedräkning, datumrad och Milstolpar och stäng av Ny Scope, så att bannern är enda tidsangivelsen. Markera det som skiljer med en liten prick eller fet stil i stället för streckad ram.
  - Beslut: **Åtgärda**
- **P3 · Ta bort Milstolpe sker direkt utan Ångra, till skillnad från Scope** (`projekt-milstolpe-ta-bort-utan-angra`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ desktop, critique)
  - Varför: "Ta bort" på en Milstolpe tar bort den med ett klick, utan bekräftelse och utan toast. Att ta bort en Scope ger "Scope borttagen · Ångra", och Ta bort Projekt kräver bekräftelse. Samma ord gör tre olika saker. Milstolpen går att få tillbaka via Historik, men det vet man inte i stunden.
  - Åtgärd: Ge Milstolpe samma mönster som Scope: ta bort direkt och visa "Milstolpe borttagen · Ångra" i toasten.
  - Beslut: **Åtgärda**
- **P3 · "1 Scopes skiljer sig från nu"** (`projekt-visa-scopes-grammatik`, /p/0qtx4cq2ev · Historik, Visa · med · Visa-förhandsvisning av en äldre Uppdatering @ desktop, critique)
  - Varför: Bannern böjer inte efter antal: "1 Scopes skiljer sig från nu (streckad ring)." Milstolpar böjs redan rätt i samma mening ("1 Milstolpe skiljer sig").
  - Åtgärd: "1 Scope skiljer sig från nu (streckad ring)." och "N Scopes skiljer sig …", samma mönster som för Milstolpar.
  - Beslut: **Åtgärda**

### Läge-färgskalan

- **P1 · I dag blir Läge 50–65 olivgrått och lerigt** (`projekt-dag-mittfarger-grumliga`, /p/0qtx4cq2ev · dag · dag · populated, ljust tema @ desktop, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Dag-rampen interpolerar i RGB från #c9a21a (50) till #5a86d6 (75). Läge 55 blir #b39c40 (oliv) och 65 ungefär #86918b (grå). Lösenordsåterställning 55 ser senapsgrön ut, och mitten av färgskalan i listan är grågrön. Krönet är det intressantaste stället på banan, och där är färgen svagast; #c9a21a mot vitt ligger dessutom under 3:1 för grafik.
  - Åtgärd: Interpolera i OKLCH i stället för RGB, mörka krönet till en renare bärnsten (ca #b8860b) och lägg till ett stopp vid ca 62 i en kall, ren ton (t.ex. #6f86c8) så att övergången går via skiffer i stället för grå. Kontrollera 3:1 mot #ffffff för varje heltal 0–100.
  - Designregel Spec #31, Implementation Decisions (visual): säger "Known open points: label collisions and the murky dag mid colours around Läge 50–65", gör "Fortfarande lerigt: 55 = #b39c40, 65 ≈ #86918b"
  - flaggat även av: Impeccable audit, område: Embed
  - Beslut: **Åtgärda**
- **P3 · I natt är alla stjärnor mellan ca 45 och 85 nästan vita** (`projekt-natt-mitten-nastan-vit`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ desktop, critique)
  - Varför: Natt-rampen går #fff1c9 (50) → #cfe0ff (75) → #8fb8ff (100). Lösenordsåterställning 55, Tillgänglighetsgranskning 71 och BankID-flöde 85 läses alla som vita prickar. Specen vill att Läge ska gå att läsa på färgen utan etiketter, men krön och nedför skiljs inte åt.
  - Åtgärd: Mätta nedför mer: 75 ≈ #a9c8ff och 100 ≈ #6f9fff, och behåll krönet varmt guld (#ffe7a8) så att vitt bara finns precis vid toppen.
  - Designregel Spec #31, user story 18: säger "A Scope's colour comes from its Läge on a spectral ramp (warm uphill, pale gold crest, blue-white downhill), so that state is readable without labels", gör "Krön och nedför ser likadana ut, nästan vita"
  - Beslut: **Åtgärda**

### Projektsidans layout

- **P1 · Scope-listan är bredare än sin kolumn, så sidan scrollar i sidled på 1440 px** (`projekt-sidopanel-bredare-an-fonstret`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ desktop, critique)
  - gäller: /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/0qtx4cq2ev · dag · dag · populated, ljust tema, /p/0qtx4cq2ev · Scope vald · med · en Scope markerad i listan, /p/0qtx4cq2ev · Ny Scope · med · formuläret Ny Scope öppet, /p/0qtx4cq2ev · Bädda in · med · Bädda in-dialogen öppen
  - Varför: Uppmätt på 1440 px: tabellen i sidopanelen är 360 px i en kolumn på 340 px, så dokumentet blir 1483 px brett. Läge-kolumnen och rubriken "Läge" skärs av vid fönsterkanten, och sidhuvudet slutar före sidans högerkant. Läge är just det tal listan finns för, och en vågrät scroll på en vanlig laptop känns trasig på ett delat möte.
  - Åtgärd: Låt tabellen få plats i 340 px: sätt table-layout: fixed med kolumnbredder (namn flexibel med radbrytning, Ägare ca 110 px, Läge ca 44 px), lägg ✦ på samma rad som namnet eller flytta den (se projekt-agare-cell-tva-rader), och ge sidopanelens kolumn minmax(320px, 360px) i grid-mallen. Kontrollera med det längsta Scope-namnet i testdatan ("Tillgänglighetsgranskning").
  - flaggat även av: Impeccable audit
  - Beslut: **Åtgärda**
- **P3 · Avslutade grannprojekt är bara blekare, utan ord** (`projekt-grannar-avslutat-utan-ord`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ desktop, critique)
  - Varför: "Onboarding-guide" i sidomenyn visas med 55 % opacitet, vilket ser ut som avstängt eller laddande. Sidomenyns rubrik är bara Funktionsområdets namn, så det framgår inte heller att listan är "andra Projekt".
  - Åtgärd: Skriv "Avslutat" under namnet i dim text (som "1 stilla" står för pågående), och ge listan rubriken "Andra Projekt i Kundupplevelse" eller låt Funktionsområdets namn vara en länk med samma text.
  - Avgörs av Q12
  - Beslut: **Åtgärda** — Avslutade borde ju vara på 100. Behövs de visas på stjärnkartan då?

### Sidhuvud

- **P1 · Sidhuvudet med Signatur är för brett på telefon och hela sidan skrollar i sidled** (`header-telefon-for-brett`, /f/4djnni9x4g (Plattform) · med · populated @ phone, critique)
  - gäller: / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden, /finns-inte · med · 404, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/0qtx4cq2ev · dag · dag · populated, ljust tema, /p/0qtx4cq2ev · Historik öppen · med · Historik-panelen öppen, /p/0qtx4cq2ev · Scope vald · med · en Scope markerad i listan, /p/0qtx4cq2ev · Bädda in · med · Bädda in-dialogen öppen, /p/59rz6gw74a (Betalningar v2) · med · Över tid, en Scope vars Ägare lämnats över, /p/yrexpob6yl (Gammal API-gateway) · med · markerat Avslutat, /p/aekstro366 (Borttagen) · med · Borttaget Projekt, /p/finnsinte00-x (404) · med · 404, id som aldrig funnits, /person/9p2wfr02el (Stjärnkarta) · med · populated, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik
  - Varför: Med en Signatur ihågkommen blir dokumentet 457 px brett i en 390 px skärm (uppmätt: scrollWidth 457). "Mina Scopes" bryts på två rader, kugghjulet hamnar utanför skärmen och hela sidan glider i sidled när man drar med tummen. Det är just Ägaren som har en Signatur och uppdaterar från telefonen mellan möten, så det drabbar huvudpersonen för mobil användning på varje sida.
  - Åtgärd: Under ca 600 px: låt sidhuvudet bara visa märket, Signaturen som en kompakt knapp med initialer (t.ex. "AL") och kugghjulet; flytta "Mina Scopes" och temaväxlaren in i en meny bakom Signaturknappen, eller visa "Mina Scopes" som en ikon. Sätt white-space: nowrap på länkarna och min-width: 0 på .right så att inget kan tvinga fram sidledsskroll.
  - flaggat även av: Impeccable audit
  - Avgörs av Q16
  - Beslut: **Åtgärda**
- **P2 · Kugghjulet ser ut som en sol och står bredvid temaknappen "Dag"** (`header-kugghjul-ser-ut-som-sol`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden, /finns-inte · med · 404
  - Varför: Ikonen för Inställningar är två ringar med strålar, alltså en sol, och den står direkt efter textknappen "Dag" som byter tema. Den som vill ha ljust tema klickar på solen och hamnar på Personer; den som letar efter Personer letar inte efter en sol. "Dag" visar dessutom läget man byter till, inte det man är i, så knappen läses som en etikett för ikonen bredvid.
  - Åtgärd: Rita en riktig kugge (tänder, inte strålar) för Inställningar, eller skriv "Inställningar" i text på dator. Gör temaväxlaren till en ikonknapp med måne/sol som visar nuvarande tema, med aria-label som i dag. Låt kugghjulet stå sist och temaväxlaren före, med lite mer avstånd.
  - Beslut: **Åtgärda**

### Signatur-remsan

- **P1 · "Vem?"-remsan säger inte att ändringen väntar, och går inte att avbryta** (`projekt-vem-remsan-sager-for-lite`, /p/0qtx4cq2ev · Vem?-remsan (telefon) · utan · Signatur-remsan efter första ändringen @ phone, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320
  - Varför: Efter första draget visar telefonen bara "Vem?", "Välj Person" och en avstängd "Spara". Förklaringen "Kommer ihåg valet på den här enheten." är dold under 900 px. Stjärnan står redan på 11 som om den vore sparad. Det finns inget Avbryt; lämnar man sidan kastas draget utan besked. En förstagångsanvändare vet inte varför hen tillfrågas, att ändringen inte är sparad eller hur man ångrar sig.
  - Åtgärd: Skriv vad som väntar och varför: "Vem flyttade Felmeddelanden? Ändringen sparas när du valt namn." (bygg texten från den hållna ändringen). Visa "Kommer ihåg valet på den här enheten." även på telefon, på egen rad. Lägg till "Avbryt" som kastar draget och låter stjärnan glida tillbaka. Markera den hållna stjärnan, t.ex. med streckad ring, tills den är sparad.
  - flaggat även av: Impeccable audit, område: Embed
  - Beslut: **Åtgärda**
- **P2 · Det syns inte vems Signatur ett drag sparas med** (`embed-signatur-osynlig`, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen @ embed-bred, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Med en ihågkommen Signatur är huvudet identiskt med utan-läget: bara en omärkt personikon. I ett synkmöte där embedden visas från en dators Notion drar ofta flera via samma skärm, och varje drag sparas direkt med den datorns Signatur. Fel namn i Historiken upptäcks först i efterhand. Remsan säger heller inte att valet kommer ihåg, vilket webbplatsens remsa gör ("Kommer ihåg valet på den här enheten.").
  - Åtgärd: Visa namnet bredvid ikonen i bred läge ("Anna Lind" i --dim 13 px, klickbart för att byta), bara ikonen i smal läge. Lägg till "Kommer ihåg valet i den här inbäddningen." i remsan efter Spara-knappen i bred läge.
  - Beslut: **Åtgärda**
- **P3 · Personikonen öppnar "Vem flyttade?" fast inget har flyttats** (`embed-byt-signatur-fragan`, Embed: över vyerna, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Klick på personikonen öppnar samma remsa som efter ett drag, med frågan "Vem flyttade?". Ingen har flyttat något, så frågan låter som att ett drag redan har gjorts.
  - Åtgärd: När remsan öppnas från ikonen: "Vem är du?" eller "Signatur" som etikett, med samma Person-lista och Spara.
  - Beslut: **Åtgärda**
- **P3 · Remsan dyker upp tyst för tangentbord och skärmläsare** (`embed-remsa-utan-fokus`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, critique)
  - Varför: När ett tangentbordsdrag (piltangenter på en stjärna) hålls öppnas remsan längst ner utan att fokus flyttas dit och utan aria-live. En skärmläsaranvändare får ingen signal om att flytten väntar på ett svar.
  - Åtgärd: Flytta fokus till Person-listan när remsan öppnas av ett hållet drag och ge formuläret role="status"/aria-live="polite" med frågan; återlämna fokus till stjärnan efter Spara eller Avbryt.
  - Beslut: **Åtgärda**
- **P3 · Ingen bekräftelse när en flytt har sparats** (`embed-sparat-kvitto`, Embed: över vyerna, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Slutet på embeddens enda uppgift, ett drag, har ingen avslutning: stjärnan ligger kvar och listan ändras tyst. Efter första Spara försvinner remsan utan kvitto. Prototypen visade "Uppdatering sparad: Betalsteg → 82".
  - Åtgärd: Visa en kort rad i huvudet eller där remsan satt i ca 2 s: "Sparat · BankID-flöde 94 · Anna Lind", och låt stjärnans glöd pulsera en gång (avstängt under prefers-reduced-motion).
  - Beslut: **Åtgärda**

### Status och stilla

- **P1 · Stilla Scope syns bara som en liten streckad ring utan förklaring** (`embed-stilla-forklaras-inte`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320 @ embed-bred, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Sessionshantering har stått still i 26 dagar, men i embedden syns det bara som en 10 px streckad ring kring en 4 px prick. Texten "Ingen rörelse på 26 dagar" finns bara i hover-tooltippen (<title>), och listan visar ingenting. På en delad skärm hovrar ingen, så den Scope produkten mest vill få pratad om är den som syns minst. Projekt-sidans lista visar "26 d" i rött under Läget; embedden tappar det.
  - Åtgärd: Visa stillheten i text där folk tittar: i bred läge en röd "26 d" (eller "stilla 26 d") i listraden, samma mönster som Projekt-sidans lista, och sortera inte bort den. I smal läge lägg "· 26 d" efter stjärnans etikett i --redtx. Gör ringen tydligare (r 12–13, stroke 1.4) så den syns även på avstånd.
  - Designregel Spec #31 story 20; PRODUCT.md Product Purpose: säger "En Scope utan rörelse i mer än 14 dagar ska visa streckad röd ring och "Ingen rörelse på N dagar", så att fastnat arbete blir pratat om", gör "Embedden visar ringen men texten bara i en hover-tooltip; listan saknar markering"
  - Beslut: **Åtgärda**
- **P2 · Ordningen hjälper inte en ledare att hitta det som står still** (`start-ordning-doljer-problem`, Översikt: över vyerna, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated
  - Varför: Funktionsområden och Projekt står i bokstavsordning. Med tre områden går det bra, men PRODUCT.md beskriver ledare som skannar "många Projekt"; med femton områden ligger det som är Över tid eller stilla var som helst på en lång sida.
  - Åtgärd: Antingen sortera Projekt inom varje område efter behov av uppmärksamhet (Över tid, sedan flest stilla, sedan övriga, Avslutade sist) och behåll områdena i bokstavsordning, eller behåll bokstavsordningen och låt den samlade statusraden högst upp länka till de Projekt det gäller.
  - Avgörs av Q4
  - Beslut: **Åtgärda**
- **P2 · Sidans sammanfattning säger bara "7 Projekt", inte vad som behöver uppmärksamhet** (`start-saknar-samlad-status`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated
  - Varför: Raden under "Alla Funktionsområden" är det första en ledare läser, men "7 Projekt" räknar även Avslutade och säger inget om läget. För att veta hur många Projekt som är stilla eller Över tid måste man skanna alla sektioner och räkna själv, vilket växer med antalet Funktionsområden.
  - Åtgärd: Byt raden mot en samlad status med data som redan finns: "5 pågående · 3 stilla · 1 över tid", där "stilla" och "över tid" är i accentfärgen och bara visas när de är fler än noll. När allt rör sig: "5 pågående · inget står still".
  - Beslut: **Åtgärda**
- **P2 · "stilla" förklaras ingenstans i översikten** (`stilla-forklaras-inte`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated
  - Varför: Den röda räkningen "2 stilla" är sidans viktigaste signal till en ledare, men ordet står inte i GLOSSARY.md och sidan säger inte att det betyder ingen rörelse på mer än 14 dagar. En nykomling kan läsa "stilla" som "lugnt" eller "pausat", alltså motsatsen till ett varningstecken. Projektsidan har texten "Ingen rörelse på N dagar", men översikten har den inte.
  - Åtgärd: Ge varje stilla-räkning en title och en skärmläsartext: "Ingen rörelse på över 14 dagar". Lägg till "Stilla" i GLOSSARY.md (en Scope utan ändrat Läge på mer än 14 dagar), så att ordet blir en domänterm och används lika överallt.
  - Designregel GLOSSARY.md: säger "Domäntermerna i gränssnittet står i GLOSSARY.md (PRODUCT.md: "Domain terms are in GLOSSARY.md")", gör ""stilla" används som statusord på varje cell och rubrik men finns inte i ordlistan och förklaras inte på sidan"
  - Beslut: **Åtgärda** — En punkt skall räknas som stilla om den inte har ändrats på mer än 6 dagar. Men detta skall vara en inställning att ändra på.
- **P3 · Samma sak heter fyra olika saker** (`stilla-ord-varierar`, Personer: över vyerna, critique)
  - gäller: /person/9p2wfr02el (Stjärnkarta) · med · populated, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik
  - Varför: En Scope utan rörelse heter "stilla > 14 d" i Stjärnkartans siffror, "21 d" i nyckeln, "Ingen rörelse på 21 dagar" i kartan och "1 stilla" på Personer. "stilla" finns inte i GLOSSARY.md. Den som skannar lasten måste översätta mellan formerna.
  - Åtgärd: Bestäm en term (t.ex. "stilla") och lägg in den i GLOSSARY.md; skriv "1 stilla" / "stilla i 21 d" konsekvent och behåll klartexten "Ingen rörelse på 21 dagar" bara i kartan. Byt "stilla > 14 d" mot "stilla" med förklaring i title eller i förklaringen.
  - Beslut: **Åtgärda**

### Accentfärg och kontrast

- **P2 · I dag-temat är fältkanter och själva banan under 3:1** (`dag-borders-orbit-weak`, /p/0qtx4cq2ev · dag · dag · populated, ljust tema @ desktop, audit)
  - gäller: /p/0qtx4cq2ev · dag · dag · populated, ljust tema, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: --btn #b9c4dc, som ritar kanten på "Historik", Signatur-väljaren och alla inmatningsfält, har 1,56:1 mot dag-grunden (natt 2,30:1). --orbit #8a9ac0, banan stjärnorna åker på, har 2,5–2,8:1 mot vitt. Fält syns knappt som fält och kurvan, som är hela produktens grafik, blir blek på en projektor.
  - Åtgärd: Mörka dag-tokens: --btn till ca #8d9ab8 (≥3:1) och --orbit till ca #6f80aa (≥3:1 mot #fff). Höj natt --btn något (≥3:1 mot --bg).
  - Beslut: **Åtgärda**
- **P2 · Vit text på den röda primärknappen når inte 4,5:1** (`primarknapp-kontrast`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/59rz6gw74a (Betalningar v2) · med · Över tid, en Scope vars Ägare lämnats över, /p/yrexpob6yl (Gammal API-gateway) · med · markerat Avslutat, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik, /p/0qtx4cq2ev · Historik, Visa · med · Visa-förhandsvisning av en äldre Uppdatering, /p/0qtx4cq2ev · Ny Scope · med · formuläret Ny Scope öppet, /p/0qtx4cq2ev · Vem?-remsan (telefon) · utan · Signatur-remsan efter första ändringen
  - Varför: Vit 14 px text på --red #e0503a ger cirka 3,9:1 i natt. En orangeare röd, som ägaren vill ha, sänker kontrasten ytterligare om texten förblir vit (t.ex. #f0582a ger ca 3,4:1).
  - Åtgärd: Byt accenten mot en orangeröd och låt texten på den vara mörk i natt: t.ex. --red #f0602e med text #081026 (ca 5,5:1), --redtx #ff8a5c för text på mörk bakgrund. I dag: --red #c44a1c med vit text (ca 4,8:1), --redtx #b0401a. Kontrollera Läge-rampens orange i hill.ts så att accenten och Läge 0–20 inte flyter ihop.
  - Designregel R/src/web/app.css (Stjärnatlas-token): säger "button.pr: background var(--red) #e0503a, color #fff", gör "Kontrasten blir ca 3,9:1, under baslinjen för vanlig text"
  - flaggat även av: Impeccable audit, område: Projekt
  - Avgörs av Q13
  - Beslut: **Åtgärda** — Visa förslag på hur detta kan se ut.
- **P2 · Stilla-ringen och vald-ringen är nästan samma färg som stjärnorna uppför** (`projekt-accent-krockar-med-uppfor`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ desktop, critique)
  - gäller: /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/0qtx4cq2ev · dag · dag · populated, ljust tema, /p/59rz6gw74a (Betalningar v2) · med · Över tid, en Scope vars Ägare lämnats över, /p/0qtx4cq2ev · Scope vald · med · en Scope markerad i listan, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik, / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated
  - Varför: Färgskalan börjar i #ff7a4d vid Läge 0 och går mot #ffb36b vid 25; stilla-ringen och vald-ringen är #e0503a. Runt Sessionshantering 30 och Felmeddelanden 10 läses den streckade röda ringen som en del av stjärnans eget sken. En mer orange accent, som ägaren vill ha, gör krocken större, just där stilla Scopes oftast står (uppför).
  - Åtgärd: Separera på mer än färgton: ge stilla-ringen en mörk halo (stroke i --halo bakom den röda) och 1,6 i strecktjocklek, och vald-ringen heldragen i 2 px. Välj den nya accenten så att den håller tydligt avstånd i ton till rampens 0–25 (t.ex. dra rampens Läge 0 mot bärnsten #ff9550 om accenten går mot #ff5a36).
  - flaggat även av: område: Personer, område: Översikt
  - Avgörs av Q15
  - Beslut: **Åtgärda** — Kan vald få Apogee stjärn ikonen ✦ vid sig?
- **P3 · Påslagna växlar syns knappt** (`personer-visa-inaktiva-lage`, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik @ desktop, critique)
  - gäller: /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik, /person/9p2wfr02el (Stjärnkarta) · med · populated
  - Varför: "Visa inaktiva (1)" byter bara från ingen kant till en grå kant när den slås på, och texten är densamma i båda lägena. Stjärnkartans "Pågående Projekt" / "Med avslutade (1)" markerar valt läge med mörkblå bakgrund (--sel) som nästan är samma som sidans. Man ser inte säkert vad som är valt.
  - Åtgärd: Markera valt läge med accentfärgen, t.ex. samma understrykning som det aktiva "Mina Scopes" i sidhuvudet, och låt växeln säga "Dölj inaktiva" när den är på.
  - Avgörs av Q1
  - Beslut: **Åtgärda**
- **P3 · Den ovanligaste handlingen får sidans starkaste färg** (`start-nytt-fo-dominerar`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated
  - Varför: "Nytt Funktionsområde" är den största röda ytan på startsidan, men man skapar Funktionsområden sällan. Samtidigt betyder rött "stilla" och "Över tid" i resten av sidan, så knappen konkurrerar med varningarna om ögat när en ledare skannar.
  - Åtgärd: Gör "Nytt Funktionsområde" till en vanlig (konturerad) knapp på startsidan och låt accentfärgen här bara bära status. Behåll "Nytt Projekt" som primär på Funktionsområdessidan, där det är den vanliga handlingen.
  - Avgörs av Q1
  - Beslut: **Åtgärda**
- **P3 · Vald Scope i nyckeln markeras bara med understrykning** (`stjarnkarta-vald-rad-svag`, /person/9p2wfr02el (Stjärnkarta) · med · populated @ desktop, critique)
  - Varför: Klick på en Scope i nyckeln ger stjärnan röd ring, men raden i nyckeln får bara understrykning. Med fyra eller fler Scopes är det svårt att se kopplingen. Prototypen (variant B) gav vald rad bakgrund.
  - Åtgärd: Ge vald rad bakgrund (--sel) och en röd kantlinje till vänster, samma röda som ringen i kartan.
  - Designregel prototype/person variant B: säger ".key .sc.sel får bakgrund --sel över hela nyckelns bredd", gör "Vald rad får bara understruken text"
  - Avgörs av Q1
  - Beslut: **Åtgärda**

### Avslutat och borttaget

- **P2 · Ett Avslutat Projekt ser ut och beter sig som ett pågående** (`projekt-avslutat-ser-pagaende-ut`, /p/yrexpob6yl (Gammal API-gateway) · med · markerat Avslutat @ desktop, critique)
  - Varför: "Avslutat" står två gånger ("Avslutat · Öppna igen" och raden under), men diagrammet, de dragbara stjärnorna och den röda "Ny Scope" är oförändrade. En ledare som skannar ser inte på diagrammet att arbetet är stängt, och slutet på ett Projekt, ett av få naturliga höjdpunktsögonblick, passerar utan någon känsla av avslut.
  - Åtgärd: Visa Avslutat en gång, i statusraden. Dämpa stjärnorna som Stjärnkartan redan gör med dimmade Avslutade Projekt (opacity 0,45) och gör "Öppna igen" till sidans primära knapp i stället för "Ny Scope". Lägg ett lugnt avslut i statusraden, t.ex. "Avslutat 12 nov. av Bo Ek" hämtat från Historik.
  - Avgörs av Q8
  - Beslut: **Åtgärda**
- **P3 · Borttagen-läget säger inte att Projektet går att återställa** (`embed-borttagen-aterstallbar`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, critique)
  - Varför: "Det här Projektet är borttaget. Testprojekt togs bort av Bo Ek. Öppna i Apogee ↗" är tydligt, men den som ser en tom vit ruta i Notion vet inte att Borttagen går att ångra och kan tro att arbetet är förlorat. Raderad-läget ("Det här Projektet finns inte längre.") är rätt som det är.
  - Åtgärd: Ändra länken till "Återställ i Apogee ↗" eller lägg till "Det kan återställas i Apogee." som metarad, och visa Apogee-märket (✦) ovanför texten så att det syns varifrån meddelandet kommer.
  - Beslut: **Åtgärda**
- **P3 · Borttagen-sidan kräver ett extra steg för att återställa och tappar stjärnatlaset** (`projekt-borttagen-atervandsgrand`, /p/aekstro366 (Borttagen) · med · Borttaget Projekt @ desktop, critique)
  - Varför: Den som följer en gammal länk vill troligen ha tillbaka Projektet, men måste gå till Borttagna-listan och leta upp det där. Sidan är också naken text på mörk botten, det enda stället i Projekt-flödet utan något av Stjärnatlas-världen, i ett ögonblick som redan känns som ett tapp.
  - Åtgärd: Lägg "Återställ" som primär knapp direkt på sidan (samma kommando som i Borttagna-listan, med Signatur), och behåll länken till listan som sekundär. Visa ett tomt, dämpat gradnät med banan bakom texten som igenkänning.
  - Beslut: **Åtgärda** (rekommendation: Senare)
- **P3 · En felskriven länk får "Finns inte längre", som om något raderats** (`projekt-saknas-sager-langre`, /p/finnsinte00-x (404) · med · 404, id som aldrig funnits @ desktop, critique)
  - Varför: /p/finnsinte00-x har aldrig funnits men sidan säger "Finns inte längre" och "Det här finns inte längre." Den som fått en trasig länk börjar leta efter vem som raderade Projektet. Specen avser texten för Raderade Projekt, och servern kan inte skilja dem åt.
  - Åtgärd: Skriv en text som stämmer i båda fallen: rubrik "Hittar inte Projektet", text "Länken kan vara felskriven, eller så har Projektet raderats." och kvar länken "Till alla Funktionsområden".
  - Designregel Spec #31, user story 84: säger "As anyone following a link to something Raderad, I want a 404 "Finns inte längre"", gör "Samma text visas för id som aldrig funnits"
  - Beslut: **Åtgärda**

### Bädda in

- **P2 · "Bädda in i Notion"-panelen hamnar utanför telefonskärmen** (`badda-in-panel-overflow-phone`, /p/0qtx4cq2ev · Bädda in · med · Bädda in-dialogen öppen, audit)
  - gäller: /p/0qtx4cq2ev · Bädda in · med · Bädda in-dialogen öppen
  - Varför: Panelen är position: absolute med left: 0 från knappen "Bädda in" och 90vw bred. På 390 px börjar knappen ca 220 px in, så panelen sträcker sig till 572 px och halva innehållet, inklusive "Kopiera" och "Stäng", ligger utanför skärmen. Panelen stängs inte heller med Escape eller klick utanför.
  - Åtgärd: Placera panelen mot sidans kant på smala skärmar (position: fixed; inset-inline: 16px) eller som ett bottenark, och stäng på Escape och klick utanför med fokus tillbaka till "Bädda in".
  - Beslut: **Åtgärda**
- **P3 · Bädda in-dialogen stängs inte med Escape eller klick utanför, och tar inte fokus** (`projekt-badda-in-stangs-inte`, /p/0qtx4cq2ev · Bädda in · med · Bädda in-dialogen öppen @ desktop, critique)
  - Varför: Uppmätt: dialogen (role="dialog") ligger kvar efter Escape och efter klick i diagrammet, och fokus stannar i body. Den täcker nedräkningen och datumraden tills man hittar "Stäng" längst ner till höger.
  - Åtgärd: Stäng med Escape och klick utanför, flytta fokus till inbäddningsfältet när den öppnas och tillbaka till "Bädda in" när den stängs. Samma beteende för andra popovers på sidan.
  - Beslut: **Åtgärda** — En modal bör också ge lite suddig overlay bakom sig.

### Embed: tema och storlek

- **P2 · Embedden är alltid ljus och ignorerar både ?tema och sparat tema** (`embed-alltid-dag`, Embed: över vyerna, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Embed.svelte anropar tema.visa("dag") och .ap hårdkodar en egen kopia av dag-tokens, så ?tema=dag är verkningslös och "apogee.tema" = "natt" ger också ljust (testat). Det är avsiktligt enligt spec story 88, och vitt smälter in i Notions ljusa sida. Men i Notion i mörkt läge blir embedden en vit ruta på #191919, och den låsta Stjärnatlas-riktningen (natthimmel) syns aldrig där flest ser Apogee. Den kopierade tokenuppsättningen i .ap kan också glida isär från app.css.
  - Åtgärd: Välj beteende i frågan om embed-tema. Oavsett val: läs tokens från app.css [data-theme="dag"] och låt .ap bara åsidosätta --bg (#fff), i stället för en egen kopia.
  - Designregel Spec #31 story 30 och 88: säger "dag-temat finns för ljusa ytor som Notion; embedden visar kullen i dag", gör "Följer regeln, men Notions mörka läge täcks inte och tokens är duplicerade"
  - Avgörs av Q2
  - Beslut: **Åtgärda**
- **P2 · Högre embed sträcker bara kullen till en spira** (`embed-hog-ruta-stracks`, Embed: över vyerna, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Den som drar Notion-blocket högre för att se bättre får ingen ny information: vid 720×600 och 400×600 blir kullen en smal spira (kompaktRuta fyller hela höjden), listan får 300 px tomrum och etiketterna i bred läge visas fortfarande inte. Vid 720×200 blir kullen däremot platt men läsbar. Höjden används som skalning, inte som utrymme.
  - Åtgärd: Begränsa kullens höjd till ungefär 0,45 × bredden och centrera den vertikalt; använd överskottet till axeltexterna och till att visa alla etiketter som får plats (t.ex. från ca 420 px höjd även i bred läge).
  - Avgörs av Q3
  - Beslut: **Åtgärda**
- **P3 · Att Appetiten nästan är slut syns inte** (`embed-appetit-slut-syns-inte`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320 @ embed-bred, critique)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: "4 dagar kvar av 8 veckor" med en nästan full stapel ser likadan ut som "7 veckor kvar": samma --mid-grå. Tidstrycket blir synligt först när Projektet är Över tid och stapeln blir röd. Med 2 av 5 Scopes fortfarande uppför och Acceptanstest om 4 dagar är det just nu samtalet borde handla om tid.
  - Åtgärd: Låt stapelns fyllnad gå över i den nya orangeröda accenten under sista ca 15 % av Appetiten (texten förblir --mid), och behåll full röd text för Över tid.
  - Avgörs av Q1
  - Beslut: **Åtgärda**
- **P3 · Smalt huvud tar en fjärdedel av höjden** (`embed-smal-huvud-tar-plats`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320 @ embed-smal, critique)
  - Varför: I 400×320 staplar huvudet namn, "4 dagar kvar av 8 veckor", stapel och "◆ Acceptanstest om 4 dagar" på tre rader (ca 80 px), så kullen får knappt 240 px och etiketterna trängs. Prototypens smala huvud visade bara nedräkningstexten.
  - Åtgärd: I smal läge: namn och nedräkning på en rad, Milstolpen bara om nedräkningen saknas, ingen stapel (eller en 2 px hårlinje under huvudet som i variant A).
  - Designregel origin/prototype/embed variant B, smal: säger "Under 520 px visar huvudet namn och nedräkningstext", gör "Visar namn, nedräkning, Appetit-stapel och Milstolpe på tre rader"
  - Avgörs av Q20
  - Beslut: **Åtgärda**

### Hill chart: etiketter

- **P2 · Etiketter trängs vid krönet och vid 95–100, och stilla-texten räknas inte som hinder** (`projekt-etiketter-trangs`, /p/0qtx4cq2ev · Historik, Visa · med · Visa-förhandsvisning av en äldre Uppdatering @ desktop, critique)
  - gäller: /p/0qtx4cq2ev · Historik, Visa · med · Visa-förhandsvisning av en äldre Uppdatering, /p/59rz6gw74a (Betalningar v2) · med · Över tid, en Scope vars Ägare lämnats över
  - Varför: I Visa står Tillgänglighetsgranskning 45 och Lösenordsåterställning 55 vid krönet; den andra etiketten trycks ner på banan och nuddar den streckade ringen. I Betalningar v2 ligger "Kortbetalning 95" och "Kvitton 100" tätt ovanpå banan vid baslinjen. placeraEtiketter tar hänsyn till andra etiketter och stjärnkärnor, men inte till texten "Ingen rörelse på N dagar" med dess ledarlinje, så en etikett kan hamna ovanpå den.
  - Åtgärd: Lägg stilla-textens ruta och ledarlinje som hinder i placeraEtiketter, och lägg banans linje närmast stjärnan som hinder för etiketter under stjärnan. Vid krönet: föredra att stapla uppåt med ledarlinje framför att lägga etiketten under. Lägg till en trängd testprojekt-fixture (två Scopes på 45/55, två på 95/100, en stilla nära) och titta på den i båda teman.
  - Designregel Spec #31, user story 29 och Known open points: säger "Labels of stars that sit close together should not collide", gör "Etiketter ligger på banan och mot ringar vid krönet och vid 95–100"
  - Beslut: **Åtgärda**
- **P2 · Etiketter längst till vänster klipps av kartans kant** (`stjarnkarta-etikett-klipps`, /person/9p2wfr02el (Stjärnkarta) · med · populated, critique)
  - Varför: På Elin Sjös Stjärnkarta står två Scopes nära Läge 0; etiketten för "B Export till PDF 0" hamnar utanför vänsterkanten och syns bara som "till PDF 0", både på desktop och telefon. Story 74 lovar att trånga etiketter staplas med ledarlinjer så att kartan förblir läsbar.
  - Åtgärd: Låt placeraEtiketter hålla etiketten inom viewBox: vid Läge nära 0 förankra texten till höger om stjärnan (text-anchor start) eller stapla den uppåt med ledarlinje, och spegla samma regel vid Läge 100.
  - Beslut: **Åtgärda**
- **P3 · Inget markerar när en Scope passerar krönet eller når 100** (`projekt-inga-hojdpunkter-vid-kron-och-mal`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), critique)
  - Varför: Krönet (Läge 50, "krön") är det viktigaste ögonblicket i en Hill chart: från att lista ut till att genomföra. När en stjärna dras över krönet eller ner till 100 händer ingenting extra; stjärnan blir bara större. Det är toppen och slutet i Ägarens uppgift, där en liten belöning gör mest nytta.
  - Åtgärd: När ett släpp korsar 50 eller landar på 100: en kort (300–400 ms) glimt i stjärnans sken och, vid 100, en tunn ring som tonar ut. Respektera prefers-reduced-motion. Ingen ljudeffekt, ingen konfetti.
  - Beslut: **Åtgärda** (rekommendation: Senare)

### Personer-sidan

- **P2 · Lastraden läses som en förloppsstapel** (`personer-lastrad-som-forlopp`, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik @ desktop, critique)
  - Varför: Varje Persons Scopes ritas som prickar på en rak linje 0–100 utan kulle, mittmarkering eller skala. Formen säger "hur långt har de kommit", inte "uppför eller nedför", och prickar på samma Läge ritas ovanpå varandra (Elin Sjö: 0 och 5). Ledaren som ska se last och fastnat arbete (story 78) får en förloppsbild i stället för en Hill chart.
  - Åtgärd: Rita en liten kulle (samma form som startsidans mini-himlar) och lägg prickarna på kurvan, med en tunn markering vid toppen. Gör hela raden till länk till Stjärnkartan.
  - Designregel PRODUCT.md › Product Principles 2: säger "Position means uncertainty, not progress: never turn Läge into a percentage bar", gör "Läge ritas som prickar på en rak 0–100-linje utan kulle"
  - Beslut: **Åtgärda**
- **P2 · Att namnet leder till Stjärnkartan syns inte** (`personer-namn-syns-inte-som-lank`, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik @ desktop, critique)
  - Varför: Namnen är länkar men har ingen understrykning och samma färg som vanlig text; bara en title-text avslöjar "Stjärnkarta för …". Personer är den enda vägen till en annan Persons Stjärnkarta utanför Projekt-sidan, så ledaren som ser "1 stilla" hittar inte vidare. Övriga länkar i appen (nyckelns Projekt) är understrukna.
  - Åtgärd: Visa länken som länk (understrykning eller pil "Stjärnkarta →"), och låt lastraden vara en del av samma klickyta.
  - Beslut: **Åtgärda**
- **P3 · Personer-historik är nästan helt fetstil** (`personer-historik-allt-fetstilt`, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik @ desktop, critique)
  - Varför: I varje rad är båda namnen fetstilta och bara verbet vanligt ("Anna Lind lade till Hana Kim"), så tio rader blir en vägg av fetstil där det ovanliga – en borttagning eller ett namnbyte – inte sticker ut. Historiken finns för att upptäcka missbruk (story 44).
  - Åtgärd: Gör den som utförde ändringen vanlig vikt och bara den berörda Personen fetstil; ge "tog bort" och "bytte namn på" en diskret markering så att de syns bland "lade till".
  - Beslut: **Åtgärda**

### Responsiv layout

- **P2 · Knappar och rader är för små att träffa på telefon** (`personer-knappar-for-sma-telefon`, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik @ phone, critique)
  - gäller: /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik, /person/9p2wfr02el (Stjärnkarta) · med · populated
  - Varför: "Byt namn" och "Ta bort" är 27 px höga med 4 px mellanrum, "Visa inaktiva (1)" 27 px och namnlänkarna 18 px. I Stjärnkartans nyckel är Scope-namnen knappar utan utfyllnad, ca 18 px. På telefon blir det feltryck, och nyckeln är där tummen borde välja Scope när kartan är liten.
  - Åtgärd: Ge knappar och nyckelns rader minst 44 px träffyta på smala skärmar (padding, inte större text), och mer avstånd mellan "Byt namn" och "Ta bort".
  - Avgörs av Q17
  - Beslut: **Åtgärda**
- **P2 · Hill charten krymper till 325 px mellan 901 och 1280 px** (`projekt-chart-squeezed-midwidth`, Hela appen, audit)
  - gäller: /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/0qtx4cq2ev · dag · dag · populated, ljust tema, /p/0qtx4cq2ev · Scope vald · med · en Scope markerad i listan, /person/9p2wfr02el (Stjärnkarta) · med · populated
  - Varför: Över brytpunkten 900 px tar sidokolumnerna 236 + 340 px, så mittkolumnen blir ca 325 px vid 901 px och 450 px vid 1024 px. Etiketterna är då 5–7 px (13 px först vid 1280 px). En bärbar dator eller en delad skärm i ett halvt fönster får en mindre chart än telefonen.
  - Åtgärd: Flytta brytpunkten för tre kolumner till ca 1200 px, och visa Funktionsområdets andra Projekt under charten (som på telefon) mellan 900 och 1200 px.
  - Beslut: **Åtgärda**

### Scope-listan

- **P2 · Ägare-cellen blir två rader med ett oförklarat ✦** (`projekt-agare-cell-tva-rader`, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning) @ desktop, critique)
  - gäller: /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /p/0qtx4cq2ev · Scope vald · med · en Scope markerad i listan, /p/59rz6gw74a (Betalningar v2) · med · Över tid, en Scope vars Ägare lämnats över
  - Varför: Ägaren är en genomskinlig select med pil, och länken till Stjärnkartan är ett ensamt "✦" som bryts ner på egen rad under namnet. Vad ✦ gör står bara i title, som inte syns på pekskärm. Varje rad blir dubbelt så hög, och ✦ bidrar till att listan inte får plats i sin kolumn.
  - Åtgärd: Gör Ägarens namn till länken till Stjärnkartan och byt Ägare via en liten "Byt" i vald rads åtgärdsrad (bredvid Byt namn och Ta bort), eller behåll selecten och flytta "✦ Stjärnkarta" som text till åtgärdsraden. En rad per Scope.
  - Avgörs av Q10
  - Beslut: **Åtgärda**
- **P2 · Ny Scope-formuläret får inte fokus, stängs inte med Escape och saknar rubrik** (`projekt-ny-scope-utan-fokus`, /p/0qtx4cq2ev · Ny Scope · med · formuläret Ny Scope öppet @ desktop, critique)
  - Varför: Uppmätt: efter klick på "Ny Scope" stannar fokus på knappen (autofocus i Namn tar inte), och Escape lämnar formuläret öppet. Fälten "Namn" och "Ägare" står utan rubrik högst upp i sidopanelen, så det ser ut som ett filter. På telefon öppnas formuläret ca 720 px under knappen och tangentbordet kommer inte upp. Den avstängda "Lägg till" blir en grumlig mörkröd, och "Ny Scope" lyser fortfarande rött medan formuläret är öppet.
  - Åtgärd: Flytta fokus till Namn efter att formuläret renderats (tick() och sedan focus()), stäng med Escape, ge formuläret rubriken "Ny Scope", scrolla det i vy på telefon. Visa avstängd primärknapp som kontur i stället för halvgenomskinlig röd, och ge Ny Scope tryckt läge (aria-pressed) medan formuläret är öppet.
  - Beslut: **Åtgärda**

### Tokens och tema

- **P2 · Inbäddningen har en egen hårdkodad kopia av dag-tokens** (`embed-tokens-duplicated`, /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320 @ embed-bred, audit)
  - gäller: /p/<id>/embed · utan · populated, bred 720×320 och smal 400×320, /p/<id>/embed?tema=dag · dag · populated, bred 720×320, Signatur ihågkommen
  - Varför: Embed.svelte definierar om 13 färger (--bg, --tx, --red, --orbit …) med hex-värden i .ap i stället för att använda [data-theme="dag"] från app.css, som tema.visa('dag') redan sätter. När accenten görs orangeröd eller dag-rampen och kanterna justeras följer inbäddningen inte med, och Notion visar en annan röd än appen.
  - Åtgärd: Ta bort blocket i .ap och låt inbäddningen ärva dag-tokens; behåll bara --bg: #ffffff som en avsiktlig avvikelse (Notions vita sida).
  - Beslut: **Åtgärda**
- **P3 · Platshållartext använder webbläsarens grå** (`placeholder-untokenized`, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik @ desktop, audit)
  - Varför: Ingen ::placeholder-regel finns, så "Namn" i "Lägg till en Person" och "t.ex. Acceptanstest" blir Chromes #757575: 3,9:1 mot --panel i natt och en grå som inte hör till paletten i något tema.
  - Åtgärd: Lägg till input::placeholder { color: var(--dim); } i app.css (6,6:1 i natt, 5,1:1 i dag).
  - Beslut: **Åtgärda**

### Översiktens Projektceller

- **P2 · Avslutade Projekt står mitt bland Pågående i bokstavsordning** (`avslutade-blandas-med-pagaende`, /f/4djnni9x4g (Plattform) · med · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated
  - Varför: "Gammal API-gateway" (Avslutat) står mellan "Betalningar v2" och "Loggning och övervakning". Den nedtonade cellen bryter raden som ögat skannar och tar en lika stor plats som de Projekt som behöver uppmärksamhet. När ett Funktionsområde samlat många Avslutade Projekt drunknar de pågående.
  - Åtgärd: Sortera Pågående Projekt först och Avslutade sist inom varje Funktionsområde (samma ordning som Stjärnkartan redan använder). Överväg att visa Avslutade som en kompakt rad ("Avslutade: Gammal API-gateway, Onboarding-guide") under rutnätet i stället för fulla celler.
  - Avgörs av Q4
  - Beslut: **Åtgärda** — Avslutades stjärnkarta behöver inte synas alls. De kan istället vara en lista med avslutade samt en ljusblå stjärna vid. Ge förslag på detta.
- **P2 · Texten i Avslutade celler har för låg kontrast** (`avslutat-for-lag-kontrast`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated, /p/0qtx4cq2ev (Ny inloggning) · med · populated (stilla Scope, Milstolpe, nedräkning), /person/9p2wfr02el (Stjärnkarta) · med · populated
  - Varför: Hela cellen tonas till opacity 0.55. Metaraden "Avslutat · 3 Scopes" blir då ungefär #525d79 på #081026, cirka 2,9:1, under 4,5:1 som krävs för 13 px text. På en delad skärm i ett mötesrum går den inte att läsa.
  - Åtgärd: Tona bara miniatyrkartan (opacity 0.45) och färga namnet med --dim och metaraden med --dim i stället för att tona hela cellen; behåll kontrasten över 4,5:1.
  - Designregel PRODUCT.md §Accessibility & Inclusion: säger "Baseline: sensible contrast and keyboard/touch support", gör "Metatexten i Avslutade celler ligger kring 2,9:1 mot bakgrunden"
  - flaggat även av: Impeccable audit
  - Avgörs av Q11
  - Beslut: **Åtgärda** — Avslutades stjärnkarta behöver inte synas alls. De kan istället vara en lista med avslutade samt en ljusblå stjärna vid. Ge förslag på detta.
- **P3 · Projektcellerna saknar överkant och ser avklippta ut** (`celler-oppna-upptill`, /f/4djnni9x4g (Plattform) · med · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden
  - Varför: Rutnätet ritar bara vänster-, höger- och nederkant. När en nedräkning står mellan rubriken och cellerna (Kundupplevelse, Plattform) eller när det inte finns någon rubrik alls (Funktionsområdessidan) står cellerna öppna upptill, och hover-bakgrunden slutar i tomma luften.
  - Åtgärd: Ge .cells en border-top: 1px solid var(--line), eller låt varje cell rita alla fyra kanter med negativ marginal så att linjerna inte dubbleras.
  - Beslut: **Åtgärda**
- **P3 · Funktionsområdets rubrik ser inte ut som en länk** (`fo-rubrik-ser-inte-klickbar-ut`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated
  - Varför: "Ekonomi", "Kundupplevelse" och "Plattform" är länkar till Funktionsområdessidan, men de ser ut som vanliga rubriker och understryks först vid hover. På telefon finns ingen hover, så vägen till Funktionsområdessidan (där man skapar Projekt) är dold.
  - Åtgärd: Lägg till en diskret pil efter namnet ("Plattform ›") eller "Öppna" i högerkanten intill räkningen, i --dim, som blir --tx vid hover.
  - Beslut: **Åtgärda**
- **P3 · Tre Scopes syns som två prickar när de står på samma Läge** (`minihill-prickar-overlappar`, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden
  - Varför: "Budgetverktyg" har "3 Scopes" men kartan visar två prickar, eftersom Scopes på samma Läge ritas ovanpå varandra. Det är vanligast precis i början, när alla står på 0, och får det nya Projektet att se felräknat ut.
  - Åtgärd: Förskjut prickar som ligger inom 2 Läge från varandra ett par pixlar i sidled eller lodrätt (en liten stapel), som på den stora Hill charten.
  - Beslut: **Åtgärda** (rekommendation: Senare)

### Felsidor och tillstånd

- **P3 · Live-anslutning öppnas för Projekt som saknas eller är avslutade** (`live-socket-errors`, /p/finnsinte00-x (404) · med · 404, id som aldrig funnits @ desktop, audit)
  - gäller: /p/finnsinte00-x (404) · med · 404, id som aldrig funnits, /p/yrexpob6yl (Gammal API-gateway) · med · markerat Avslutat
  - Varför: På /p/finnsinte00-x hämtas Projektet (404) och samtidigt öppnas WebSocket /api/projekt/finnsinte00/live två gånger, som båda misslyckas med 404 i konsolen. På ett avslutat Projekt stängs anslutningen innan den hunnit öppnas (varning). Sidan visar rätt "Finns inte längre", men felen gör konsolen brusig och servern får onödiga anslutningar.
  - Åtgärd: Starta live-följningen först när första hämtningen lyckats och Projektet är pågående, och stäng den utan att öppna om sidan byter tillstånd.
  - Beslut: **Åtgärda** (rekommendation: Senare)
- **P3 · 404-sidan är korrekt men känns inte som Apogee** (`saknas-ingen-karaktar`, /finns-inte · med · 404 @ desktop, critique)
  - Varför: En återvändsgränd är ett slut på en uppgift, och där minns man tonen. "Finns inte" och "Sidan finns inte." på en tom natthimmel är rakt men anonymt, och sidan erbjuder bara en väg tillbaka.
  - Åtgärd: Lägg en tom miniatyrkarta (kullen utan stjärnor) ovanför rubriken och en rad i samma ton som appen, t.ex. "Här finns inga stjärnor.", följt av länken "Till alla Funktionsområden". Visa länken som knapp så att den är lätt att träffa på telefon.
  - Beslut: **Åtgärda** (rekommendation: Senare)

### Ord och benämningar

- **P3 · Fel böjning i räknade ord** (`antal-bojning`, /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik @ desktop, critique)
  - gäller: /installningar/personer (Visa inaktiva på) · med · Visa inaktiva på, med Personer-historik, /person/9p2wfr02el (Stjärnkarta) · med · populated
  - Varför: "7 Personer, 1 inaktiva" på Personer och "1 avslutade" i Stjärnkartans siffror. Dessutom säger "avslutade" inte vad som är avslutat (Projekt).
  - Åtgärd: Böj efter antal: "1 inaktiv" / "2 inaktiva", och skriv "1 avslutat Projekt" / "2 avslutade Projekt".
  - Beslut: **Åtgärda**
- **P3 · Hjälptexten under kartan är grammatiskt fel** (`stjarnkarta-hint-grammatik`, /person/9p2wfr02el (Stjärnkarta) · med · populated @ desktop, critique)
  - Varför: "Dra en stjärna för att ändra Läge. Ändringen hamnar i det Projektets Historik." – "i det Projektets" är inte svenska och gör det otydligt att ändringen sparas i Scopets eget Projekt. Det är den enda hjälp vyn ger.
  - Åtgärd: Skriv t.ex. "Dra en stjärna för att ändra Läge. Ändringen sparas i Scopets Projekt och syns i dess Historik."
  - Beslut: **Åtgärda**
- **P3 · Ingen förklaring av färg och storlek på stjärnorna** (`stjarnkarta-ingen-forklaring-storlek`, /person/9p2wfr02el (Stjärnkarta) · med · populated @ desktop, critique)
  - Varför: Stjärnans storlek betyder hur nyligen den flyttades och färgen följer Läge, men Stjärnkartan förklarar ingetdera; Projekt-sidan har en förklaring (story 5). Den som kommer via "Mina Scopes" ser en stor och en liten stjärna utan att veta varför.
  - Åtgärd: Lägg samma korta förklaring som på Projekt-sidan under kartan eller i nyckelns fot, t.ex. "Större stjärna = flyttad nyligen" med färgrampen.
  - Beslut: **Åtgärda**

### Stjärnkarta

- **P3 · Projekt-bokstaven är brus med ett Projekt och svag i nyckeln** (`stjarnkarta-bokstaver-svaga`, /person/9p2wfr02el (Stjärnkarta) · med · populated @ desktop, critique)
  - Varför: Med bara ett Projekt (Anna Lind) står ett "A" framför varje etikett utan att skilja något. Med flera Projekt är bokstaven bindningen mellan stjärna och nyckel, men i nyckeln är den 11 px och dämpad (--dim) medan den i kartan är 15 px – blicken hittar inte "C" i nyckeln.
  - Åtgärd: Visa bokstäver först när fler än ett Projekt syns. I nyckeln: ge bokstaven samma storlek som Projektnamnet, gärna som en liten markering (ruta eller ring) så att den läses som en etikett.
  - Beslut: **Åtgärda**
- **P3 · Draget slutar utan att stjärnan bekräftar** (`stjarnkarta-drag-avslut`, /person/9p2wfr02el (Stjärnkarta) · med · populated, critique)
  - Varför: Draget är vyns höjdpunkt, men när det sparas händer inget på stjärnan; bekräftelsen är en loggrad i toasten ("BankID-flöde flyttad 80 → 85 · Uppdatering i Ny inloggning"). Efter "Ångra" stängs toasten utan någon kvittens. Slutet på uppgiften känns tekniskt.
  - Åtgärd: Låt stjärnan få en kort ljuspuls när Uppdateringen är sparad (respektera prefers-reduced-motion), och låt toasten säga "Ångrat" en sekund efter Ångra.
  - Beslut: **Åtgärda** (rekommendation: Senare)
- **P3 · Filtret visar en ensam knapp när inga Projekt är avslutade** (`stjarnkarta-filter-ett-val`, /person/9p2wfr02el (Stjärnkarta) · med · populated @ desktop, critique)
  - Varför: Utan avslutade Projekt (Elin Sjö) står "Visar" följt av en enda, redan vald knapp "Pågående Projekt" – en kontroll som inte går att använda men ser tryckbar ut.
  - Åtgärd: Dölj hela filterraden när det inte finns några avslutade Projekt.
  - Avgörs av Q12
  - Beslut: **Åtgärda** — Avslutade projekt behöver aldrig visas här.
- **P3 · Projektnamn bryts på två rader i nyckeln** (`stjarnkarta-nyckel-namn-bryts`, /person/9p2wfr02el (Stjärnkarta) · med · populated @ desktop, critique)
  - Varför: När nedräkningen har stapel och Milstolpe trycks namnet ihop: "Ny / inloggning" och "Mina / sidor" står på två rader, fetstilt och understruket, medan "Betalningar v2" står på en. Nyckelns rubriker får ojämn rytm och länken ser trasig ut.
  - Åtgärd: Lägg nedräkningen på egen rad under Projektnamnet (som en meta-rad) i stället för bredvid, så att namnet alltid får hela bredden.
  - Beslut: **Åtgärda**

### Tidsplan och nedräkning

- **P3 · "Ändra datum" när det står "Inga datum"** (`fo-andra-datum-nar-inga-finns`, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden @ desktop, critique)
  - Varför: Man kan inte ändra något som inte finns; "Inga datum" följt av "Ändra datum" läses som ett fel. Det gäller både Funktionsområden och Projekt (samma Tidsplan-komponent).
  - Åtgärd: Visa "Sätt datum" när varken Startdatum eller Slutdatum finns, och "Ändra datum" annars.
  - Beslut: **Åtgärda**
- **P3 · Nedräkningen blandar dagar och veckor i samma rad** (`nedrakning-blandade-enheter`, / · utan · populated @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/4djnni9x4g (Plattform) · med · populated
  - Varför: "4 dagar kvar av 8 veckor" står bredvid "64 dagar kvar av 88 dagar". Läsaren måste räkna om veckor till dagar för att jämföra, och om Appetiten råkar gå jämnt upp i veckor eller inte avgör vilken enhet som visas.
  - Åtgärd: Skriv alltid samma enhet på båda sidor ("4 dagar kvar av 56"), eller låt stapeln bära helheten och skriv bara "4 dagar kvar". Formuleringen står i specen, så ägaren bör bekräfta.
  - Avgörs av Q6
  - Beslut: **Åtgärda**
- **P3 · Tom framstegsstapel under "Startar om 11 dagar"** (`nedrakning-tom-stapel-fore-start`, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden @ desktop, critique)
  - gäller: / · utan · populated, / (med Signatur) · med · populated, /f/w4dhss972v (Ekonomi) · med · ett Projekt som startar i framtiden
  - Varför: Under "Startar om 11 dagar" ritas Appetitstapeln utan fyllning. En tom stapel läses som "0 % klart" eller som något som inte laddat, och den drar ögat utan att säga något som texten inte redan sagt.
  - Åtgärd: Dölj stapeln när Projektet inte har börjat, eller rita den streckad som "inte påbörjad".
  - Beslut: **Åtgärda**
