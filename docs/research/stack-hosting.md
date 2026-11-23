# Research: stack and hosting options for v1

Issue: #4, "Which stack and hosting options fit live sync, history and embedding?"
Researched: 2026-11-23, against official docs and pricing pages (links inline). Prices are USD list prices on that date.

## What v1 needs

- A small Swedish-language site. Funktionsområden contain Projekt, and each Projekt has one Hill chart with Scopes (Namn, Läge 0-100, Ägare).
- No sign-in. Anyone with the unlisted URL can view and edit.
- Every edit (Uppdatering) is recorded, and a chart can be restored to an earlier state.
- Charts are embedded and editable inside Notion through an iframe, on phones too.
- Live sync between simultaneous viewers is nice to have.
- One organization, tens of users. Cheap and low-ops is preferred.

Load is tiny on every option: a few thousand writes a month and kilobytes to megabytes of data. Every option below fits in a free tier or the cheapest paid tier. The real differences are operational shape, free-tier caveats, and how well each one handles history and anonymous writes.

## Shortlist

1. **A. Static/SSR frontend + Supabase** (Postgres + Realtime)
2. **B. A single small server with SQLite** (Fly.io or Railway), pushing updates over SSE or WebSockets
3. **C. Cloudflare Workers + Durable Objects** (SQLite-backed), optionally with D1
4. **D. A sync-engine service**: Convex (main candidate) or Liveblocks

InstantDB was considered and **dropped**. Its site says "Instant is sunsetting. Services will continue until August 31st, 2027", and its pricing page says new signups are closed and cloud apps shut down on 2027-08-31 ([instantdb.com](https://www.instantdb.com/), [pricing](https://www.instantdb.com/pricing)).

---

## A. Frontend + Supabase

**Cost.** The Free plan covers 500 MB of database per project, 5 GB of egress, 200 concurrent Realtime connections, 2M Realtime messages a month, and 2 active free projects. **Free projects are "paused after 1 week of inactivity."** Pro starts at $25/month and includes $10 of compute credit, enough for one Micro instance; Pro projects are never paused ([pricing](https://supabase.com/pricing)). The frontend is hosted separately, for example as a static site on Cloudflare, Netlify or Vercel, usually for free.

- The pause matters here: a chart that nobody touches for a week would stop working inside Notion until someone unpauses the project. Realistically v1 needs either Pro at $25/month or a keep-alive workaround.

**Realtime.** Three built-in features: Broadcast, Presence, and Postgres Changes ([docs](https://supabase.com/docs/guides/realtime)). Supabase calls Broadcast "the recommended method for scalability and security". Postgres Changes is simpler but "does not scale as well" ([docs](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)), which doesn't matter at this scale. Free-plan limits are 200 concurrent connections, 100 messages/s and 100 joins/s ([limits](https://supabase.com/docs/guides/realtime/limits)).

**History and restore.** A very natural fit. Postgres gives you an append-only `uppdatering` table, written in the same transaction as each change or by a trigger. Restore becomes "write a new Uppdatering that sets the chart back to state X", which keeps the log append-only. All of this is plain SQL.

**Anonymous writes and abuse.** The browser talks to Supabase directly with the public anon/publishable key, so security rests entirely on Row Level Security. Policies are written per operation, so you can, for example, grant `anon` INSERT only on a table ([RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)). With no sign-in, though, RLS can't tell a legitimate editor from anyone else holding the key, and anyone can call the REST API directly with arbitrary payloads. In practice, writes should go through a Postgres function (RPC) or an Edge Function that validates input and always appends history. I did not find a built-in per-IP rate limiter for the data API in the pages reviewed; throttling would have to be custom, in the function or in the database.

**Iframe.** Embedding is controlled by the frontend host's response headers, not by Supabase. Supabase is only called from JavaScript. No sign-in means no session cookie is needed, so third-party cookie blocking isn't a factor (see the cross-cutting section).

**Operations.** Low: a managed database, backups on Pro (daily, kept 7 days), and no server to patch. You do depend on a vendor plus a frontend host, and the schema and RLS policies need migration discipline.

---

## B. A single small server with SQLite (Fly.io or Railway)

**Cost.**
- **Fly.io:** a shared-cpu-1x Machine costs $2.19/month at 256 MB or $3.69/month at 512 MB (in the cheapest regions). Volumes cost $0.15/GB-month, shared IPv4 is free, and TLS certificates are free for the first 10 hostnames. New accounts get $1 of credit without a card, and after adding a card, "$5 of usage per month" ([pricing](https://docs.fly.io/about/pricing)). Stockholm (`arn`) is an available region ([regions](https://docs.fly.io/reference/regions/)). In practice: roughly $0-5/month.
- **Railway:** Hobby costs $5/month and includes $5 of usage. Memory runs about $10/GB-month and volumes about $0.15/GB-month ([pricing](https://railway.com/pricing)). The only EU region is Amsterdam ([regions](https://docs.railway.com/reference/regions)). In practice: about $5/month.

**Realtime.** You build it yourself: SSE or WebSockets from your own process, fanned out to the viewers of a chart. That is trivial on a single instance. Fly can stop or suspend idle Machines and restart them on request. Restarting from stopped takes "about 2 seconds or more", while resuming from suspended takes "a few hundred milliseconds" ([autostop](https://docs.fly.io/launch/autostop-autostart/)). The docs don't say how open SSE or WebSocket connections interact with autostop. The simplest setup is to keep one Machine always running, which at these prices costs little.

**History and restore.** The same natural fit as option A: SQL tables and transactions, all in one process with no network hop. Backups are your own job. Litestream continuously streams SQLite changes to cloud storage and can recover to the "most recent replicated transaction" ([litestream.io](https://litestream.io/)). Fly volume snapshots are free for the first 10 GB a month ([pricing](https://docs.fly.io/about/pricing)).

**Anonymous writes and abuse.** Full control. All writes go through your own API, so validation, per-IP rate limiting, payload caps and hard limits such as "max N Uppdateringar per chart per minute" are ordinary middleware. A CDN or WAF in front (for example Cloudflare's free plan) is optional.

**Iframe.** Full control over headers (see the cross-cutting section).

**Operations.** The highest of the four, though still small: you own the runtime, deploys, OS and image updates, backups (Litestream or snapshots), and monitoring. It is a single region and a single instance, which is fine at this scale. SQLite rules out horizontal scaling, but v1 doesn't need it.

---

## C. Cloudflare Workers + Durable Objects (+ D1)

**Cost.** The Workers Free plan allows 100,000 requests/day with 10 ms of CPU per invocation, and static asset requests are "free and unlimited" ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). Durable Objects are available on Free, but **only with the SQLite storage backend**. Free-tier limits are 100k requests/day, 13,000 GB-s/day, 5M rows read/day, 100k rows written/day and 5 GB stored; going over a limit makes those operations fail. The Paid plan has a $5/month minimum and generous inclusions ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)). D1 is also free up to 5 GB, 5M rows read/day and 100k rows written/day. In practice: $0, or $5/month for headroom and no hard failures.

**Realtime.** A natural fit. One Durable Object per Hill chart acts as the "room". It holds the WebSocket connections and the SQLite data for that chart. The Hibernation API lets the object sleep while clients stay connected, so you aren't billed for idle duration ([WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)). On the Paid plan, incoming WebSocket messages are billed at 20:1 as requests.

**History and restore.** A good fit. Each chart's object keeps its own SQLite tables (scopes plus an append-only Uppdatering log) and serializes all writes to that chart, so history ordering is naturally consistent. Data that spans charts, such as listing all Projekt in a Funktionsområde, needs either a separate directory object or D1. That makes a slightly more distributed data model than options A and B.

**Anonymous writes and abuse.** The Worker is your own code, so validation and caps live there. The WAF rate-limiting rules on the Free plan are very limited: 1 rule, counting by IP only, with a 10-second period ([rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)). A per-chart object can also enforce its own write limits. Cloudflare's edge provides basic DDoS protection.

**Iframe.** Full control over headers from the Worker, or from a `_headers` config for static assets.

**Operations.** Low: there are no servers, deploys run through Wrangler, and it is global by default. The costs are lock-in to Cloudflare-specific APIs (Durable Objects aren't portable), local development through Wrangler or Miniflare, and a programming model that is less familiar than "one server + one database". DO storage billing for SQLite was scheduled to start in January 2026, and the free tier still includes 5 GB.

---

## D. Sync-engine service (Convex, Liveblocks)

### Convex

**Cost.** The Free/Starter plan includes 1M function calls a month, 0.5 GB of database storage, 1 GB of egress, and a limit of 40 deployments; Starter is pay-as-you-go beyond that. Professional costs $25 per developer per month ([pricing](https://www.convex.dev/pricing)). I didn't verify whether free deployments get paused for inactivity. The frontend is hosted separately.

**Realtime.** Built in and the core selling point. Queries are reactive, and Convex "pushes updates to subscribed clients" with consistent snapshots ([realtime](https://docs.convex.dev/realtime)). You get live sync essentially for free.

**History and restore.** A good fit. Convex is a document database with transactional mutations, so an append-only `uppdateringar` table written in the same mutation is straightforward, and restore is a mutation that appends a new Uppdatering.

**Anonymous writes and abuse.** All writes go through your own server functions (mutations), so you validate there. Convex provides a rate-limiter component (token bucket or fixed window, keyed per user, IP or custom key), and it runs in the same transaction as the business logic ([rate limiter](https://www.convex.dev/components/rate-limiter)). It is listed in Convex's component directory, with source in the `convex` GitHub org.

**Operations.** Low: managed, with TypeScript functions deployed by CLI. You are locked in to Convex's programming model, but it is open source and can be self-hosted.

### Liveblocks

**Cost.** The Free plan allows 500 monthly active rooms, 10 simultaneous connections per room, 3,000 anonymous connections a month, and 1 GB of realtime data, with **version history kept for only 24 hours**. Pro costs $30/month ($25/month billed annually) ([pricing](https://liveblocks.io/pricing)).

**Realtime.** Excellent: CRDT-style rooms and presence.

**History and restore.** A poor fit on the free tier, which keeps only 24 hours of version history. A durable Uppdatering log would need your own database alongside it, for example through webhooks. That makes two systems.

**Anonymous writes and abuse.** Rooms can be made public with `defaultAccesses: ["*:write"]`, but public-key access is "intended only for prototyping and public applications". Production should use an auth endpoint, meaning your own server ([auth docs](https://liveblocks.io/docs/authentication)).

**Verdict for this project.** Liveblocks is built for collaborative documents with presence, and history is the main requirement here, so it fits worse than Convex.

---

## Cross-cutting: iframe embedding in Notion

- **Headers.** Do not send `X-Frame-Options: DENY/SAMEORIGIN`. Send `Content-Security-Policy: frame-ancestors ...` that allows Notion's origins, or allows any origin. `frame-ancestors` **cannot be set with a `<meta>` tag**; it has to be an HTTP response header ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)). If it is absent, embedding is allowed. So every option works as long as the frontend host doesn't add a blocking header by default. Exactly which origins the Notion mobile apps embed from was not verified; `frame-ancestors *`, or simply not setting the header, avoids the question.
- **Notion's embed block.** `/embed` accepts an https URL. Sites that block framing show "Failed to Load". "Embeds that require logging in to an external site" don't work in the desktop or mobile apps ([Notion help](https://www.notion.com/help/embed-and-connect-other-apps)). No sign-in is therefore an advantage.
- **Third-party cookies and storage.** Inside Notion, the chart is a third-party iframe. Safari blocks all third-party cookies by default, and partitions third-party localStorage and IndexedDB per top-level site, which also makes them ephemeral ([WebKit tracking prevention](https://webkit.org/tracking-prevention/)). Chrome decided on 2025-04-22 to keep its current third-party cookie approach (allowed by default, user-controllable) and not to add a standalone prompt ([Privacy Sandbox blog](https://privacysandbox.google.com/blog/privacy-sandbox-next-steps)). **Implication:** the design must not depend on cookies or durable localStorage inside the embed. Put the chart identity in the URL. A remembered "Ägare" name, if one is wanted, is best-effort only. This applies equally to all four options.

## Comparison

| | A. Supabase | B. Server + SQLite | C. Workers + DO | D. Convex |
|---|---|---|---|---|
| Cost at this scale | $0 but pauses after 1 week idle; realistically $25/mo Pro | ~$2-5/mo (Fly), ~$5/mo (Railway) | $0 (hard daily caps) or $5/mo | $0 (Starter); $25/dev/mo Pro |
| Realtime | Built-in (Broadcast/Postgres Changes) | DIY SSE/WS, simple on one instance | Built-in pattern: one DO per chart, WS hibernation | Built-in, automatic |
| History + restore | Natural (SQL, triggers) | Natural (SQL) | Natural per chart; cross-chart data needs D1 or a directory DO | Natural (transactional mutations) |
| Anonymous-abuse controls | Weakest by default (public key + RLS); route writes through RPC/Edge Functions; no built-in per-IP limiter found | Full control in own middleware | Own Worker code + very limited free WAF rule (1 rule, IP, 10 s) | Server mutations + official rate-limiter component |
| Iframe/headers | Depends on frontend host | Full control | Full control | Depends on frontend host |
| Ops effort | Low | Highest (backups, updates, monitoring), still small | Low, but Cloudflare-specific model | Low, vendor-specific model |
| Lock-in | Low (it's Postgres) | None | High | Medium (open source, self-hostable) |

**Trade-offs by criterion.** This is not a decision; the choice belongs to the follow-up ticket.
- **Cheapest with no idle pitfalls:** C (free tier) or B on Fly.
- **Least realtime work:** D (Convex), then C.
- **Most portable and conventional:** B, then A.
- **Simplest abuse control without sign-in:** B, C or D, because all writes pass through your own code. A needs extra care because the client talks to the database directly.
- **Least ops:** A, C or D.
- **Avoid:** InstantDB (sunsetting), and Liveblocks as the primary store (only 24 hours of history on the free tier).

## Open points not verified

- Whether Convex free deployments are paused after inactivity.
- Whether Supabase has any built-in per-IP rate limiting for the data API.
- Which origins the Notion mobile app's embed webview presents to `frame-ancestors`.
- How Fly autostop treats long-lived SSE/WebSocket connections.
