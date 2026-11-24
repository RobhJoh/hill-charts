# Glossary

Terms are the Swedish words used in the app.

**Funktionsområde**: An area of the organization that groups Projekt. Contains many Projekt.

**Projekt**: A piece of work the organization tracks. Belongs to exactly one Funktionsområde (and can be moved to another). Has exactly one Hill chart.
_Avoid_: Project

**Avslutat Projekt**: A Projekt that is done: every one of its Scopes is at Läge 100 (or it has none), or someone has marked it Avslutat. A marked Projekt stays Avslutat until someone reopens it; one that is Avslutat only through Läge is ongoing again as soon as a Scope moves back.
_Avoid_: Klart, Stängt

**Hill chart**: The visual of one Projekt: a hill on which each of its Scopes is placed. Uphill (left) is figuring it out; downhill (right) is making it happen.
_Avoid_: Backdiagram, Kullediagram

**Scope**: One part of a Projekt's work, shown as a dot on the Projekt's Hill chart.
_Avoid_: Del, Delområde

**Ägare**: The person responsible for a Scope. Every Scope has exactly one, named by free text; names that differ only in letter case are the same person. Renaming an Ägare changes every Scope they own, as one Uppdatering per Projekt; renaming to an existing Ägare merges the two.
_Avoid_: Owner

**Läge**: Where a Scope sits on the hill, from 0 (start of uphill) to 100 (bottom of downhill, done).
_Avoid_: Position

**Uppdatering**: One recorded edit to a Hill chart, such as a Scope changing Läge, or a Scope being added, renamed or removed. Records what changed, when, and optionally the name of whoever made it.
_Avoid_: Move, Change

**Historik**: All Uppdateringar of one Hill chart, oldest to newest. Never edited or shortened; the Hill chart is what you get by applying them in order.
_Avoid_: Log, Versioner

**Återställning**: An Uppdatering that puts the whole Hill chart back to how it looked right after an earlier Uppdatering. Everything since then is undone in one step, and still stays in the Historik.
_Avoid_: Rollback, Revert

**Ångra**: An Uppdatering that takes back one earlier Uppdatering and leaves later ones in place. Not possible if something it changed has been changed again since.
_Avoid_: Undo (in the UI)

**Borttagen**: A Projekt or Funktionsområde that someone has taken away (Ta bort). Hidden, but kept whole and can be restored. A Funktionsområde can only be taken away when all its Projekt are Avslutade, and they go and come back together with it.
_Avoid_: Raderad, Arkiverad

**Radera**: Erasing a Borttagen Projekt or Funktionsområde for good. Cannot be undone. Erasing a Funktionsområde erases every Projekt in it.
_Avoid_: Ta bort (which can be restored)
