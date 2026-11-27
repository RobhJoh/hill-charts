# hill-charts

A tool for drawing and tracking hill charts: a simple way to show how far along each piece of work in a project really is.

> **Status:** early stage. The app is called **Apogee**; a walking skeleton (Funktionsområden and Projekt) runs, the Hill chart itself is next.

## What is a hill chart?

A hill chart, popularized by Basecamp's [Shape Up](https://basecamp.com/shapeup/3.4-chapter-13), places each piece of work on a hill:

- **Uphill (left side): figuring it out.** There are still unknowns, open questions and decisions to make.
- **Downhill (right side): making it happen.** The approach is clear, and what's left is execution.

Unlike a percentage or a task count, the position shows *uncertainty*. Something stuck near the top of the hill for a long time is a signal worth talking about.

## Goals

- Place work items (scopes) on a hill and move them as work progresses.
- Keep a history of positions so you can see how each item moved over time.
- Make it easy to share a project's current hill with the team.

## Running it

Needs Node 20.19 or newer. Everything runs as one Node process with no external services; data is stored as JSON files.

```sh
npm install
npm run dev        # API server + Vite with hot reload: http://localhost:5173
npm test           # core, storage contract and HTTP tests (Vitest)
npm run typecheck  # tsc (incl. a Node-free check of the core) + svelte-check
npm run build      # SPA to dist/web, server to dist/node
npm start          # the built app: http://127.0.0.1:3000
```

Settings for `npm start` (and the API server in `npm run dev`): `PORT` (default 3000; dev uses `API_PORT`, default 3001), `HOST` (default `127.0.0.1`), `APOGEE_DATA_DIR` (default `./data`).

### Layout

See [ADR 0001](docs/adr/0001-json-files-behind-a-storage-interface.md) for why.

- `src/core`: the domain. Plain TypeScript, web standards only; clock and ids are injected. `createApogee({ storage, now, newId })` returns its commands and queries. It reaches storage only through the `Storage` interface in `src/core/storage.ts`.
- `src/storage`: `Storage` adapters: in-memory (tests, dev) and JSON files (crash-safe writes, format version upgraded on read). `storage.contract.ts` is the suite every adapter passes.
- `src/server`: the Node process: JSON API under `/api`, the SPA for every other path, writes serialized, required headers on every response ([ADR 0002](docs/adr/0002-public-root-no-secret-prefix.md)).
- `src/web`: the Svelte 5 + Vite SPA with a small client router. Swedish UI, Stjärnatlas theme.

## Contributing

Issues are tracked in [GitHub Issues](https://github.com/RobhJoh/hill-charts/issues).
