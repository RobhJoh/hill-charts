# What comes from Notion, what is changed in Apogee

Notion owns the structure and Apogee owns the Hill charts ([ADR 0003](adr/0003-notion-owns-structure.md)). The sync reads Notion one way and never writes back.

- **Notion**: synced from Notion and read-only in Apogee, with a link to the item in Notion. Never in Historik.
- **Apogee**: changed only in Apogee.
- **Derived**: worked out by Apogee and never typed in by anyone.

Historik contains only what happens in Apogee: Scopes and Milstolpar.

## Funktionsområde

| Data | Owner | Source / rule |
|---|---|---|
| Whether it exists in Apogee | Derived | Present while at least one of its Projekt is synced. Otherwise Borttagen, and back when a Projekt returns |
| Namn | Notion | `Namn` |
| Startdatum, Slutdatum | Notion | `Datum`. A single date becomes Slutdatum |
| Funktionsansvarig | Notion | `Funktionsansvarig` |
| Notion-status | Notion | `Status`, shown exactly as in Notion. It drives nothing in Apogee |
| Status (Inte påbörjat / Pågående / Avslutat) | Derived | From its Projekt that are not Borttagna: all Inte påbörjat, all Avslutat, otherwise Pågående |
| Milstolpar | Apogee | Not in Historik, as before |
| Över tid | Derived | From Slutdatum and its Projekt |
| Radera (when Borttagen) | Apogee | – |

Not synced: `Alternativt datum`, `Deltagare`, `Initiativ`, `Produkter`. The "Avtalsmilstolpe – …" rows have no Projekt, so they never appear.

## Projekt

| Data | Owner | Source / rule |
|---|---|---|
| Whether it is synced | Notion | The `Apogee` checkbox |
| Namn | Notion | `Name` |
| Funktionsområde | Notion | The `Funktionsområde` relation. If it is empty, the Projekt is listed under Utan funktionsområde |
| Startdatum, Slutdatum | Notion | `Datum`. A single date becomes Slutdatum |
| Notion-status | Notion | `Status`, shown exactly as in Notion. It drives nothing in Apogee |
| Status (Inte påbörjat / Pågående / Avslutat) | Derived | From the Scopes' Läge: all at 0 (or no Scopes), at least one above 0, all at 100. Cannot be marked by hand |
| Över tid | Derived | Slutdatum passed without being Avslutat |
| Projektledare | Notion | `Projektledare`. Empty if it is empty in Notion |
| Milstolpar | Apogee | In Historik, with a Signatur |
| Borttagen | Notion | Unticked, trashed or gone in Notion. Comes back if it returns |
| Radera (when Borttaget) | Apogee | Ticking it again later in Notion gives a new, empty Hill chart |

Not synced: `Ursprungligt datum`, `Deltagare`, hours, `Produkter`, `Initiativ` and the other relations.

## Scope

Everything about a Scope is Apogee data: Namn, Läge and Ägare, all recorded in Historik with a Signatur. When a Scope is added, the Projektledare is the suggested Ägare. If there is no Projektledare, no Ägare is suggested.

## Person

| Data | Owner | Rule |
|---|---|---|
| Created | Notion or Apogee | Every Projektledare and Funktionsansvarig in Notion becomes a Person. The sync first matches by name, ignoring case, and otherwise creates a new Person. After that the link holds by the person's id in Notion. Anyone else is added in Apogee |
| Namn, Ta bort, reactivate | Apogee | The sync never makes a Person inaktiv. Handing over their Scopes needs a human choice |

## Historik, Ångra, Återställning

These belong to Apogee and cover only Scopes and Milstolpar. Values from Notion are never recorded, so they can never be undone or restored.

## The sync

- It runs every 5 minutes and from a **Hämta från Notion nu** button.
- If Notion cannot be reached, Apogee keeps working with what it last fetched, shows "Senast hämtat från Notion: <tid>" and a warning, and changes nothing.
