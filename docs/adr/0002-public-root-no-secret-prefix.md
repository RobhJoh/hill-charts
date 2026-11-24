# Public root, no secret URL prefix

Apogee has no sign-in, and its start page lists every Funktionsområde, so whoever reaches the domain can see and edit the whole organization. We still serve the start page at the bare root (`apogeechart.com/`) rather than hiding everything behind an unguessable organization prefix. "Unlisted" means only that the site stays out of search engines (`X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`). The safety net is Historik and Återställning, plus whatever [Is anything beyond Historik needed against vandalism?](https://github.com/RobhJoh/hill-charts/issues/28) adds.

## Considered options

- **Secret organization prefix** (`/o/<secret>/…`, with a bare root that reveals nothing): this keeps out scanners and passers-by who find the domain through certificate-transparency logs. It was rejected in favour of plain, shareable URLs.
- **A secret per Projekt with no browsable index**: this breaks the start page → Funktionsområden → Projekt structure.

## Consequences

- Adding a secret prefix later would break every shared link and every Notion embed. That is why this is recorded.
- Expect bots and strangers to reach the start page. Protection must come from the server (see the vandalism ticket), not from obscurity.
