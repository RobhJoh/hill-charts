# Glossary

Terms are the Swedish words used in the app.

**Funktionsområde**: An area of the organization that groups Projekt. Contains many Projekt. It is Inte påbörjat when all its Projekt are, Avslutat when all are, and Pågående otherwise; Borttagna Projekt do not count.

**Projekt**: A piece of work the organization tracks. Belongs to at most one Funktionsområde (and can be moved to another, or out of any). Has exactly one Hill chart.
_Avoid_: Project

**Utan funktionsområde**: Where the Projekt that belong to no Funktionsområde are listed. Not a Funktionsområde: it has no dates, no Funktionsansvarig, no status, is never Över tid and cannot be taken away.

**Inte påbörjat Projekt**: A Projekt whose Scopes are all at Läge 0, or that has none yet.
_Avoid_: Ej startat, Planerat, Not started

**Pågående Projekt**: A Projekt with at least one Scope above Läge 0 that is not Avslutat.
_Avoid_: Aktiv, Öppen

**Avslutat Projekt**: A Projekt whose Scopes are all at Läge 100. A Projekt with no Scopes is never Avslutat, and nobody can mark one Avslutat: it follows Läge alone, so it is Pågående again as soon as a Scope moves back.
_Avoid_: Klart, Stängt

**Notion-status**: The status a Projekt or Funktionsområde has in Notion, shown exactly as it is there. It decides nothing in Apogee and is separate from whether it is Inte påbörjat, Pågående or Avslutat; the two may disagree.
_Avoid_: Status (on its own)

**Hill chart**: The visual of one Projekt: a hill on which each of its Scopes is placed. Uphill (left) is figuring it out; downhill (right) is making it happen.
_Avoid_: Backdiagram, Kullediagram

**Scope**: One part of a Projekt's work, shown as a dot on the Projekt's Hill chart.
_Avoid_: Del, Delområde

**Ägare**: The Person responsible for a Scope. Every Scope has exactly one. When a Person is removed, every Scope they own in a Projekt that is not Avslutat is handed to another Person; in Avslutade Projekt the removed Person stays Ägare. Not the same as the Projektledare or the Funktionsansvarig.
_Avoid_: Owner

**Projektledare**: The Person who leads a Projekt as a whole. A Projekt has at most one. Separate from the Ägare of its Scopes, though the Projektledare is the suggested Ägare when a Scope is added.
_Avoid_: Projektägare, Projektansvarig, Ägare

**Funktionsansvarig**: The Person responsible for a Funktionsområde as a whole. A Funktionsområde has at most one.
_Avoid_: Områdesägare, Ägare

**Läge**: Where a Scope sits on the hill, from 0 (start of uphill) to 100 (bottom of downhill, done).
_Avoid_: Position

**Stilla**: A Scope whose Läge has not changed for more than 14 days. A Scope at Läge 100, or in an Avslutat Projekt, is never Stilla. Written "1 stilla" when counted and "stilla i 21 d" for one Scope; spelled out as "Ingen rörelse på 21 dagar" only on the Hill chart.
_Avoid_: Fastnad, Inaktiv, Pausad

**Uppdatering**: One recorded edit made in Apogee to a Projekt's Hill chart or its Milstolpar, such as a Scope changing Läge, a Scope being added, renamed or removed, or a Milstolpe changing. What comes from Notion is never an Uppdatering. Records what changed, when, and the Signatur of whoever made it.
_Avoid_: Move, Change

**Person**: Someone on the organization's managed list of people (Personer). Every Ägare and every Signatur is a Person. Known by a name that no other Person has, regardless of letter case; renaming a Person changes that name everywhere, earlier Uppdateringar included. A removed Person becomes inaktiv: never erased and still named where they appear, but cannot be chosen until reactivated.
_Avoid_: Användare, Medlem, Konto

**Signatur**: The Person who says they are making an edit, so each Uppdatering shows who made it. Required for every Uppdatering, chosen from Personer, and remembered per device and browser. Separate from Ägare: the Signatur says who made an edit, the Ägare who is responsible for a Scope.
_Avoid_: Användare, Konto, Inloggning

**Historik**: All Uppdateringar of one Hill chart, oldest to newest. Never edited or shortened; the Hill chart is what you get by applying them in order.
_Avoid_: Log, Versioner

**Återställning**: An Uppdatering that puts the whole Hill chart back to how it looked right after an earlier Uppdatering. Everything since then is undone in one step, and still stays in the Historik.
_Avoid_: Rollback, Revert

**Ångra**: An Uppdatering that takes back one earlier Uppdatering and leaves later ones in place. Not possible if something it changed has been changed again since.
_Avoid_: Undo (in the UI)

**Borttagen**: A Projekt or Funktionsområde that has been taken away. Hidden, but kept whole and comes back by itself. A Projekt is Borttaget once it no longer comes from Notion, and a Funktionsområde once none of its Projekt does; either is back as soon as it does again.
_Avoid_: Raderad, Arkiverad

**Radera**: Erasing a Borttagen Projekt or Funktionsområde for good. Cannot be undone. Erasing a Funktionsområde erases every Projekt in it.
_Avoid_: Ta bort (which can be restored)

**Appetit**: The fixed time a Projekt or Funktionsområde is given, from its Startdatum to its Slutdatum. It is a budget, not an estimate. A Projekt or Funktionsområde may have none.
_Avoid_: Estimat, Deadline, Tidsram

**Milstolpe**: A named date within a Projekt or Funktionsområde, such as an acceptance test. It has only a name and a date.
_Avoid_: Delmål, Checkpoint

**Över tid**: A Projekt whose Slutdatum has passed without it being Avslutat, or a Funktionsområde whose Slutdatum has passed while any of its Projekt is not Avslutat. Passing the Slutdatum never makes it Avslutat on its own.
_Avoid_: Försenad, Sen
