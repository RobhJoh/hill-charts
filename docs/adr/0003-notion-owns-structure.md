# Notion owns the structure, Apogee owns the Hill charts

The organization already plans its Funktionsområden and Projekt in Notion, with names, dates, status and who leads them. Apogee therefore reads that structure from Notion one way and never writes back. Notion is the only place to create, rename, date, move or take away a Projekt or Funktionsområde. Apogee keeps what Notion has no notion of: Scopes, Läge, Milstolpar and Historik. The two statuses are kept apart. Notion's status is shown as it is, as Notion-status. Apogee's status is derived from Läge alone. A Projekt is synced when its `Apogee` checkbox in Notion is ticked. A Funktionsområde is synced while at least one of its Projekt is. Which data lives where, field by field, is in [notion-sync.md](../notion-sync.md).

## Considered options

- **Apogee may also hold its own Projekt alongside the synced ones**: rejected. It would give two places to create the same thing.
- **Two-way sync**: rejected. It needs conflict handling and write access to Notion, which makes it a project of its own.
- **A checkbox on Funktionsområden too**: rejected. A Funktionsområde follows its Projekt, so there is only one thing to tick in Notion.

## Consequences

- Fields that come from Notion are read-only in Apogee and link to Notion. Ta bort for Projekt and Funktionsområden is gone from Apogee. Radera of what is already Borttaget stays, since the Hill chart and Historik exist only in Apogee.
- The sync never erases anything. A Projekt that leaves the sync (unticked, trashed, or no longer present) becomes Borttaget, and comes back if it returns. A failed fetch changes nothing.
- A Projekt may now belong to no Funktionsområde ("Utan funktionsområde"), because Notion allows it.
- Values from Notion never enter Historik. Historik, Ångra and Återställning cover only what happens in Apogee, so nothing can undo a value that Notion owns.
- A Projekt can no longer be marked Avslutat. Notion's "Completed" and Apogee's Avslutat may disagree, and both are shown.
- The sync polls Notion rather than using webhooks, because webhooks need a public address and no host has been chosen yet (ADR 0001).
