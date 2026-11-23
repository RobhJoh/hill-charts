# Could Notion Custom Blocks host an editable Hill chart?

Research for issue #12. Researched 2026-11-23. Follows on from §7 of the [Notion embed findings](https://github.com/RobhJoh/hill-charts/blob/research/notion-embed/docs/research/notion-embed.md).

**Question:** Could a Notion Custom Block host an editable Hill chart instead of, or alongside, a plain `/embed` iframe? This covers availability, per-workspace setup, how a block is built and hosted, interaction including the mobile apps, how it talks to our server, auth, limits and roadmap.

**Short answer:** Not as the v1 path. Custom Blocks are still in **private alpha**: definition creation is gated per workspace, there is no public waitlist, no plan list, and no GA date. A block is deployed as a Notion **Worker**, and Workers need a **Business or Enterprise** plan. Each block belongs to one workspace, and a workspace owner must also allowlist our server's origin. Technically the model fits: an ordinary web app in a sandboxed iframe that can `fetch` our HTTPS API, with no OAuth needed. But the blocks are tied to the workspace, not to "anyone with the link". Mobile rendering and touch are not documented anywhere. A plain `/embed` stays the only option that works for any Notion user today. A Custom Block could be added later as an extra for one org that is on Business or Enterprise and has alpha access.

Legend: **[verified]** = stated by a Notion primary source (quoted or linked). **[unverified]** = no primary source found; the reason is given.

> Note: every Custom Blocks doc page carries the line "Do not discuss publicly or share with anyone outside your workspace." That condition binds alpha participants. This file only summarises Notion's public developer docs, and we are not in the alpha, but keep it in mind if we join. This repo is public.

---

## 1. What Custom Blocks are, and availability

- **[verified]** These are "interfaces built with access to live Notion data" that run in sandboxed iframes. The same capability has three form factors: an inline **custom block**, a **custom view** (a database view tab), and a **custom page**. Notion's examples include a chart over a data source, an org chart, a whiteboard canvas and a scheduling grid. Source: [Custom blocks overview](https://developers.notion.com/custom-blocks/overview).
- **[verified]** Status is **private alpha**. "Access must be enabled per workspace. Installing the SDK does not grant access." APIs "may experience breaking changes without notice." Source: [overview](https://developers.notion.com/custom-blocks/overview), [quickstart](https://developers.notion.com/custom-blocks/quickstart).
- **[verified]** On 2026-09-30 the developer changelog said the markdown API and Notion MCP can now *read* custom blocks, and "Definition creation remains in private alpha." Source: [Developer changelog](https://developers.notion.com/page/changelog).
- **[verified]** Custom blocks are a *Worker capability*. Workers are in **public beta** and need a **Business or Enterprise** plan. The `ntn` CLI and Developer Mode are available on all plans. Workers use the same credit system as Custom Agents and were "free through August" (2026). Sources: [Notion blog, Introducing the developer platform (2026-05-13)](https://www.notion.com/blog/introducing-developer-platform), [Notion Help, What is the Notion Developer Platform?](https://www.notion.com/help/what-is-the-notion-developer-platform).
- **[unverified]** How to get alpha access. No waitlist form, plan requirement or pricing for Custom Blocks themselves was found. The Developer Platform help page lists waitlists for the External Agents API and Agent SDK but does not mention Custom Blocks. Presumably access goes through a Notion contact.

## 2. What a workspace must do to use one

- **[verified]** The workspace must be enabled for the alpha (§1), and on a plan that allows Workers (§1).
- **[verified]** A developer with workspace access runs `ntn login`, `ntn workers new <name> --template custom`, then `ntn workers deploy`. Deploying builds and uploads the frontend, and there is no separate block deploy step. Source: [quickstart](https://developers.notion.com/custom-blocks/quickstart).
- **[verified]** "Workspace owners control who can create Workers." The Worker is then shared from the Developer portal. "Can connect" lets members insert its blocks. "Full access" also allows code changes, deploys, sharing and secrets. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **[verified]** For our server to be reachable, a workspace owner adds our origin under "Settings → Workers → Custom block external network access", and the block must declare it as a `network.fetch` grant (§5). Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **[verified]** Users insert a block with `/custom` (or the block's own `slashCommand`) on desktop or web. "The registered slash command does not appear on mobile." Sources: [quickstart](https://developers.notion.com/custom-blocks/quickstart), [Worker capability](https://developers.notion.com/custom-blocks/workers/capability).
- **Implication:** This is a one-time setup *per Notion workspace*, by someone who has both developer access and owner rights. A Worker is not a public, installable app. A second organisation or workspace would need its own alpha access, its own deploy and its own allowlist entry. No Notion source describes a marketplace or a cross-workspace install.

## 3. How a block is built and hosted

- **[verified]** There are two parts. A Worker declaration (`src/index.ts`, `@notionhq/workers`) calls `worker.customBlock(key, { path, command, output, dataSources, grants, … })`. The block app is an ordinary web app that uses `@notionhq/custom-blocks` (`blocks/<name>/src/index.tsx`). The templates use React and Vite, but "any frontend framework" works through `initCustomBlock()`. Source: [quickstart](https://developers.notion.com/custom-blocks/quickstart).
- **[verified]** **Notion hosts the bundle.** It is served from `https://<definition-id>.notion-custom.com` in a sandboxed iframe, one origin per definition. Our own server would serve only data, not the UI. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **[verified]** At startup the block runs a `connect` → `init` → `initResult` message handshake with the host, which times out after 15 s. Opening the block outside Notion throws `NotInIframeError`. Source: [Lifecycle](https://developers.notion.com/custom-blocks/guides/lifecycle).
- **[verified]** The SDK supplies the theme and design tokens, the current user, the containing page, and **auto-resize to content**. That auto-resize is something the plain embed lacks (embed findings §4). Source: [overview](https://developers.notion.com/custom-blocks/overview), [quickstart](https://developers.notion.com/custom-blocks/quickstart).
- **[verified]** Blocked in the sandbox: external navigation, runtime scripts from external CDNs, browser workers, `<object>`/`<embed>`, web app manifests, **forms**, and `<base>`. Everything must be bundled. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **Implication:** We could not reuse our site's page as-is. We would build and maintain a second bundle of the Hill chart (the same SVG and drag code is fine) against the Notion SDK, deployed with `ntn`.

## 4. Rendering, drag and touch, mobile apps

- **[verified]** A block renders arbitrary web UI (DOM, SVG, canvas). Notion's own templates include a `whiteboard`, which implies pointer interaction works on desktop and web. Source: [quickstart](https://developers.notion.com/custom-blocks/quickstart).
- **[unverified]** **Whether custom blocks render in the Notion iOS and Android apps at all, and whether touch drag works there.** No Notion doc page mentions mobile rendering or touch. The only mobile statement is that the slash command is not shown on mobile (§2). One third-party npm README (`ncblock`, self-described "extreme alpha") claims its views run on iOS, Android and desktop. That is not a primary source. *Test:* this needs alpha access. Insert a block on desktop, open the page in both mobile apps, and run the same pointer-event probe as in the embed findings §8.
- **[verified]** "Custom blocks do not render on Notion Sites", so pages published to the web will not show the chart. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **Implication:** For our hard requirement ("editable there, including on phones"), Custom Blocks are no better documented than `/embed`. Mobile is an open question for both.

## 5. Data: talking to our server, storage, auth

- **[verified]** Network access: "Blocks can reach only origins they declare as `network.fetch` grants". An example declaration is `{ action: "network.fetch", resource: "https://hill.example.se" }`, which is an HTTPS origin with no path, and `*.` wildcards cover subdomains. The origin must also be on the workspace allowlist (§2). Up to 50 origins per block. Sources: [Grants](https://developers.notion.com/custom-blocks/guides/grants), [Worker capability](https://developers.notion.com/custom-blocks/workers/capability).
- **[verified]** "For `fetch` and `XMLHttpRequest`, the API must allow the block's iframe origin in its CORS response." Our API would need CORS for `https://<definition-id>.notion-custom.com`. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **[unverified]** WebSocket and SSE to our server. The security page's network table groups an unnamed set of connection types under "the block's origin and workspace-approved HTTPS origins". It does not name WebSocket or `EventSource` explicitly. The embed findings (§7) summarised it as covering `fetch`, `XMLHttpRequest` and `WebSocket`. It is also unconfirmed whether a `wss:` URL matches an `https:` allowlist entry. *Test:* this needs alpha access.
- **[verified]** Viewer approval of grants "is still rolling out". Where it is enabled, each viewer approves the block's grants for themselves before it loads, and dismissing the request leaves the block unloaded. Source: [Grants](https://developers.notion.com/custom-blocks/guides/grants).
- **[verified]** Storage: `localStorage` is shared across all instances of a definition in a browser profile, and is separate from Notion and other definitions. Source: [Security](https://developers.notion.com/custom-blocks/guides/security). **[unverified]** Whether it persists in Safari or iOS. `notion-custom.com` is still a third-party origin under `notion.so`, so the partitioning and ITP findings in embed findings §5 probably apply.
- **Auth:** **[verified]** No OAuth is needed to call our server. The block is just an allowlisted, CORS-enabled HTTPS client, so our unauthenticated "anyone with the link" API works. Block code never receives the viewer's Notion credentials, and "anyone who can view a block can inspect its delivered JavaScript", so no secrets go in the bundle. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **Bonus we would not need:** **[verified]** The block knows the current Notion user (`user.read` / `current_user`). That could prefill the optional "name" and remove the storage problem from the embed findings §5. Source: [Grants](https://developers.notion.com/custom-blocks/guides/grants).
- **Alternative data model:** **[verified]** A block can instead bind to a Notion data source and read and write its rows (`useDataSource`, `item.updateByKey`, `dataSources.create`). Writes use the viewer's own Notion permissions, so view-only users cannot write. Snapshots arrive by subscription, with up to 32 subscriptions, and `limit` up to 999. Source: [SDK: data sources](https://developers.notion.com/custom-blocks/sdk/data-sources). **[unverified]** Whether edits by *other* users push live updates to a subscription. This route would split the source of truth between Notion and our site, so it does not fit our design.

## 6. Limits

- **[verified]** `name` up to 128 chars, `description` up to 1,024, `slashCommand` 1–64 chars, up to 256 grants, up to 50 network origins (2,048 chars as JSON). A removed definition is kept for 30 days. Source: [Worker capability](https://developers.notion.com/custom-blocks/workers/capability).
- **[verified]** A new deploy updates every existing instance immediately. Open instances may keep the old code until they reload. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **[verified]** Corporate firewalls and remote browser isolation may need exceptions for `notion-custom.com`. Source: [Security](https://developers.notion.com/custom-blocks/guides/security).
- **[unverified]** Bundle size limits, rate limits, and Worker credit cost after the free period. None are documented.

## 7. Roadmap

- **[verified]** Viewer approval of grants and `Connection-Allowlist` enforcement are "rolling out". Notion "may require `grants` in a future release". The `not_granted` error code is reserved for later. Sources: [Grants](https://developers.notion.com/custom-blocks/guides/grants), [Security](https://developers.notion.com/custom-blocks/guides/security).
- **[unverified]** Any date for beta or GA, any plan for cross-workspace distribution (a marketplace), or any plan for mobile. Notion has published none.

## 8. Related: HTML blocks (Notion 3.6, July 2026)

- **[verified]** You can upload an `.html` file and attach it to an embed through `embed.file_upload`. Notion then renders it "interactively in a sandboxed iframe" (changelog 2026-07-03; [Block reference](https://developers.notion.com/reference/block)).
- **[unverified]** Whether scripts can make network calls to our server, and how it behaves on mobile. Notion documents neither. Third-party write-ups disagree, and one says external API calls are blocked. Being a static snapshot, it is not obviously useful for live shared data. It is mentioned only so that it isn't confused with Custom Blocks.

## 9. Custom Block vs plain `/embed` for our case

| | Plain `/embed` iframe | Custom Block |
|---|---|---|
| Availability | Any Notion user, any plan, today | Private alpha, per-workspace enablement, Workers need Business/Enterprise |
| Setup per workspace | None, just paste the URL | Developer deploys a Worker, owner allowlists our origin, members get "Can connect" |
| "Anyone with the link" | Yes. Same URL as our site | No. Bound to one workspace. Each new workspace needs its own deploy |
| Who hosts the UI | Our site, one codebase | Notion hosts a separate bundle built against their SDK |
| Talking to our API | Same-origin, as on our site | Cross-origin `fetch` plus CORS. WebSocket/SSE unconfirmed |
| Auth | None | None for our API. Optional Notion user identity available |
| Sizing | Manual drag, no auto-height | SDK auto-resize, Notion theme tokens |
| Remembered name | Partitioned `localStorage`, ephemeral on Safari/iOS | Could use the Notion user instead |
| Mobile render and touch drag | Undocumented, needs a test | Undocumented, and testing needs alpha access. Cannot be inserted from mobile |
| Public Notion Sites | Embeds generally render | Do not render |
| Stability | Stable feature | Breaking changes without notice |

**Trade-offs to weigh (no decision made here):**

- `/embed` fits the "unlisted URL, no sign-in, anyone" model and costs almost nothing extra. Its open risks (mobile touch, storage) are testable today with the probe in embed findings §8.
- A Custom Block adds nicer integration (auto-height, theme, Notion identity for the name) but makes Notion's alpha, the customer's plan and a workspace owner part of our deployment path. It also doubles the front-end surface, and it does not settle the mobile question.
- If the single target organisation is on Business or Enterprise and can get alpha access, a Custom Block could be a later, optional add-on next to `/embed`. Our server would need nothing beyond CORS and an origin allowlist entry. It should not be the v1 dependency until Notion documents mobile support and leaves alpha.
