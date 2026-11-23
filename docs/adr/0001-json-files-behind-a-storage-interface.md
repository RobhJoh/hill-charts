# JSON files behind a storage interface, no database and no platform in the core

The organization has not yet approved any hosting, and v1 must be developed fully locally and cost nothing to run. So the core is plain TypeScript that reaches storage only through a domain-level `interface` (fetch/save a Projekt, append an Uppdatering, read history, list Funktionsområden), and never assumes files. v1 ships one adapter: a single Node process writing one JSON document per Projekt plus an append-only Uppdatering log, with live sync over WebSockets for the open Hill chart only. The host is chosen at deploy time.

## Considered options

- **A database (SQLite, Postgres, D1)**: more robust, but an extra moving part that tens of users don't need. It stays a later adapter behind the same interface: a new implementation plus a one-off JSON-to-rows import.
- **Cloudflare Workers + one Durable Object**: free and zero-ops, and the preferred deploy target if the organization accepts Cloudflare. Not built until then, so nothing in the code depends on Cloudflare.
- **Supabase, Convex, a hosted SQLite server**: ruled out by "free is a must", "no ops", or tying the code to one vendor.

## Consequences

- Writes are serialized by running exactly one server process; scaling out needs a different adapter.
- The adapter must make writes crash-safe itself (write to a temp file, then rename; skip a half-written last log line).
- Each document carries a format version and is upgraded on read, since there are no migrations.
- Queries across Projekt are done in memory, which is fine at this size and the reason to add a database adapter if that changes.
