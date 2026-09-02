# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Frontend for **tag2now** — a live info dashboard for **Tekken Tag Tournament 2 (TTT2)**. Shows active online rooms, leaderboard rankings, player activity statistics, and a community board, all sourced from the `tag2now-BE` API.

UI text is in Korean. The visual style is a black + red arcade theme.

## Commands

```bash
npm run dev          # dev server on :5173 (host 0.0.0.0), proxies /api
npm run build        # production build → dist/
npm test             # vitest run (unit/component, once)
npm run test:watch   # vitest watch mode
npm run test:coverage  # v8 coverage
npm run typecheck    # tsc --noEmit
npm run test:e2e     # playwright (auto-starts the dev server)
npm run test:e2e:ui  # playwright UI mode
npm run test:e2e:update-snapshots  # refresh visual baselines
```

Run a single unit test file:
```bash
npx vitest run src/match/Rooms.test.tsx
```

Run a single E2E spec:
```bash
npx playwright test e2e/specs/rooms.spec.ts
```

### Dev proxy target

`vite.config.ts` proxies `/api` to **production by default** (`https://match.tag2now.click/api`). To hit a local backend, set `BE=local`:

```bash
BE=local npm run dev
```

The proxy strips the `/api` prefix before forwarding.

## Stack

React 19 + TypeScript + Vite 8 (rolldown) + Tailwind CSS 4. No router — a single page with tab state. No global state library; state lives in hooks.

Key dependencies: `recharts` (statistics charts), `react-hot-toast` (notifications).

The `@` alias resolves to `src/` and is configured in both `vite.config.ts` and `tsconfig.json`. Prefer `@/shared/util/api` over relative paths.

## Architecture

**Feature-folder layout.** Each feature owns its components, hooks, types, and API calls; `shared/` holds what crosses features.

```
src/
  App.tsx              tab state and layout; the only place tabs are assembled
  main.tsx             root render, Toaster, global unhandledrejection handler
  index.css            Tailwind 4 @theme design tokens
  config/              tabConfig, patchNotes, test-setup
  overview/            landing summary — useOverview, Overview, KPI and top-five cards
  match/               rooms — useRooms, Rooms, RankMatchTable, PlayerMatchTable
  reservation/         appointments — Reservation, reservationApi, reservationLabels
  community/           board — useCommunity, communityApi, post/comment components
  stat/                statistics — useStats, useWeeklyTop, Stats
  shared/              api util, Leaderboard, hooks, components, colors, formatters
```

A feature folder holds `<Feature>.tsx` (container), `use<Feature>.ts` (state), `types.ts`, and a `component/` subfolder with an `index.ts` barrel re-export.

### Data flow

`shared/util/api.ts` is the only place `fetch` is called. `GET`/`POST`/`DELETE` prepend the base URL, send `credentials: 'include'` (required for the community identity cookie), and throw on non-2xx.

The base URL is `window.__ENV__?.API_BASE ?? '/api'`, letting a deployed build override the endpoint at runtime without a rebuild.

**Polling** is centralised in `shared/hooks/usePolledData.ts`. It returns `{ data, loading, refreshing, error, refresh, lastUpdated }` and distinguishes first load (`loading`) from background refresh (`refreshing`) so the UI does not blank out on every poll. Feature hooks are thin wrappers:

```ts
export default function useRooms(): PolledState<RoomsData> {
  return usePolledData(fetchRoomsAll, ROOMS_REFRESH_INTERVAL)  // 5s
}
```

Pass `null` as the interval to fetch once without polling.

`App.tsx` owns `useLeaderboard()` and `useRooms()` and passes `{ data, loading, error, onRefresh }` down. Both data sets stay fresh regardless of the active tab — switching tabs is display-only.

### Overview (the landing tab)

A summary of the other tabs, and the entry point rather than a replacement for
them: every card links to the tab it summarises.

**It fetches almost nothing of its own.** Rooms and the leaderboard arrive as
props — `App.tsx` already polls both — so the overview adds four one-shot
requests: daily stats, weekly top, recent posts, open reservations. Do not add a
`useRooms()` or `useLeaderboard()` call here; that would double the traffic for
data the page already holds.

`useOverview` batches those four with `Promise.allSettled`, and a rejected
source degrades to an empty list. One failing endpoint therefore costs its own
card, not the page. It polls with a `null` interval — a snapshot with a manual
refresh, since only the room figures are genuinely live and those stay fresh
through App's poll.

**Two joins worth knowing:**

- The weekly-top endpoint reports match counts, not characters. Portraits are
  joined in from the leaderboard by npid, the same pairing the stats tab makes;
  a player outside the leaderboard renders dashes rather than dropping columns.
- `fetchRoomsAll` deliberately shuffles group order, so the "활성 방" hint reads
  the groups back in `GROUP_ORDER`. Without that the KPI reorders itself on
  every 5s poll.

`MiniCharCell` is the row-sized counterpart to `shared/components/CharCell`:
same portrait and rank badge, no win/loss column. Below 760px the row wraps to
two lines and positions the two characters by **source order**
(`:nth-of-type`), so main must render before sub — `Overview.test.tsx` pins
that.

### Tabs

The tab strip is **fixed layout, not derived from the response**: `overview` first, then one tab per key in `GROUP_ORDER` (`config/tabConfig.ts`) — always rendered, even before rooms load or after the fetch fails — plus any unknown group the API returns appended after them, followed by the fixed `reservation`, `leaderboard`, `community`, and `stats` tabs. `tab` state is `string | null`; when null or stale it falls back to the first tab, which is therefore always `overview`.

`FIXED_TABS` in `App.tsx` names the non-room tabs in one place; `isRoomTab` is its negation. Adding a tab that is not a room group means adding it there too, or it will be handed the rooms panel.

Room data affects only the **count in the label**, never which tabs exist. Until the first successful load the count renders as `(—)` rather than `(0)`, so a pending or failed fetch is not mistaken for "no rooms"; afterwards a group the payload omits is genuinely `(0)`.

Do not gate room tabs on the rooms response. Doing so made the tab strip shift during load, silently moved the default tab to `reservation`, and required a fallback that rendered the rooms error panel on top of unrelated tabs.

The tab bar implements the ARIA tabs pattern — `role="tablist"`/`tab`/`tabpanel`, roving `tabIndex`, and Arrow Left/Right navigation. Preserve this when touching the nav.

### Community identity

Not authentication. The username is stored in a cookie (`shared/util/cookie.ts`) and registered with the backend via `useIdentity().ensureIdentity()`, which POSTs to `/community/identity` once per session (guarded by a `useRef`) before any write. Callers must `await ensureIdentity()` before posting; it throws a Korean error message if no username is set.

### Reservation ownership

Reservations use **capability tokens in `localStorage`**, not the community cookie identity. Creating one stores `reservation-owner-{id}`; joining stores `reservation-participant-{id}`. Both are sent back as `X-Reservation-Token` on the matching `DELETE`, and the backend authorises by comparing token hashes — there is no account to check against.

`isOwner(id)` / `hasParticipation(id)` therefore answer "does this browser hold the token", not "is this the same person". Clearing site data or switching browsers loses the ability to delete a reservation, and nothing in the UI can recover it. Treat that as a known limitation of the token model rather than a bug to patch around.

Editing (`PATCH /reservations/{id}`) is refused once anyone has joined: participants agreed to the conditions as they stood, and letting the host move the time underneath them would bind people to an appointment they never accepted. The host cancels and re-posts instead. The edit button is disabled once `participant_count > 0` so the host sees the restriction before acting, but the server stays the authority — a participant arriving while the editor is already open is caught by the 400, not by the disabled state. The create modal doubles as the edit form — same fields, same validation — so a rule cannot drift between posting and editing.

Cancelling is a soft delete (`status = 'cancelled'`) that also releases every participant. `GET /reservations` returns only `open` and `matched`, so a cancelled reservation disappears on the next poll without any client-side removal.

Match-type labels and the KST time format live in `reservationLabels.ts`, not
`reservationApi.ts`: the overview needs them too, and `Reservation.test.tsx`
replaces the whole API module with a mock, so anything the UI reads at import
time has to sit outside it.

### Error handling

`main.tsx` registers a global `unhandledrejection` handler that shows a toast and calls `preventDefault()`. Rejected promises therefore surface to the user without a try/catch at every call site — but a caller that wants inline error state (as feature hooks do) must catch and store `e.message` itself.

`shared/util/panelStatus.tsx` renders shared loading/error/empty panel states.

## Styling

Tailwind CSS 4 with the CSS-first config — there is no `tailwind.config.js`. Design tokens are declared in an `@theme` block in `src/index.css` and become utilities automatically (`--color-primary` → `bg-primary`, `text-primary`, `border-primary`).

`.app-layout` caps the page at `min(1360px, 100% - 32px)` — sidebar plus main
column, so it sets the width of **every** tab. Changing it re-renders every
visual baseline, not just the tab that prompted the change.

Use tokens rather than raw hex or arbitrary values. **Pretendard** backs both
`--font-sans` and `--font-display`, imported as an npm package in `main.tsx`
(`pretendard/…/pretendardvariable-dynamic-subset.css`) — not from Google Fonts.

`--color-txt-faint` is the floor for tertiary text: it is the dimmest grey that
still clears 4.5:1 on every surface in play, the `#1b1b1f` input fill included.
Reach for it rather than inventing another hex — several of the greys it
replaced sat at 4.0–4.3, and the 7–10px sizes this text uses get no large-text
exemption. The one deliberate holdout is `.input-base:disabled`, where WCAG
exempts inactive controls anyway.

Rank/tier and medal colours live in `shared/tierColors.ts` and `shared/medalColors.ts`; character art paths in `shared/characterImage.ts`.

Recharts renders SVG attributes, which cannot read CSS custom properties, so
`shared/components/chartTheme.ts` mirrors the relevant `@theme` tokens as JS
constants — keep the two in step when a token moves. `shared/components/DailyChart.tsx`
is shared by the stats tab and the overview; its `axisGutter` prop exists because
the stats panel is narrow enough for a negative left margin while the overview's
wider chart clips its tick labels at the same value.

Not every rank the API reports has artwork under `public/ranks/` — `Tekken Lord`
and `Initiate` among them. `RankImage` removes itself on the load error rather
than leaving the browser's broken-image glyph, and keys that failure to the rank
**name**: React reuses the element across list rows, so a bare boolean would
blank the next rank that does have art.

### Brand assets

`public/favicon.svg` and `public/og-image.png` both carry the black-and-red
palette; keep them in step with `--color-primary` when it moves.

The 1200×630 share card is generated, not hand-drawn — edit
`scripts/og-image.html` and re-render:

```bash
node scripts/generate-og-image.mjs
```

It renders through the Chromium that Playwright already installs, so it needs
no extra dependency. Commit the regenerated PNG; a raster is required because
Discord and KakaoTalk ignore SVG in `og:image`.

## Tests

Two independent suites.

**Unit / component — Vitest + Testing Library.** Tests sit beside the code they cover (`src/**/*.test.tsx`), jsdom environment, globals enabled, `src/config/test-setup.ts` imports `@testing-library/jest-dom`. `vitest.config.ts` merges `vite.config.ts`, so the `@` alias works in tests.

Component tests are prop-driven and need no mocks. `App.test.tsx` mocks the feature hooks. When testing polling, use `vi.useFakeTimers()` and always restore with `vi.useRealTimers()` in `afterEach`, so a mid-test failure cannot corrupt later tests.

**E2E — Playwright**, in `e2e/`, against two projects: `chromium` (Desktop Chrome) and `mobile` (Pixel 5). The config starts `npm run dev` automatically and reuses a running server outside CI.

- `e2e/helpers/mock-api.ts` — route interception; E2E does not hit a real backend.
  `mockAllApis` must route every endpoint the landing tab calls, the overview's
  history/community/reservation reads included; anything unrouted reaches
  whatever the dev server proxies to, which is **production** by default.
- `e2e/specs/` — behavioural specs per feature.
- `e2e/visual/screenshots.spec.ts` — visual regression against committed baselines.

Helpers worth reaching for: `goToMatchTab` (the overview is the landing tab, so
a rooms spec has to navigate first — there is no router to deep-link with),
`dismissPatchNotes` (closes the dialog), and `skipPatchNotes` (marks it seen
before load, for specs that cannot afford the paint at all — it reads
`LATEST_PATCH_VERSION` so a version bump cannot silently stop suppressing it).

**Do not wait out a poll in real time.** Install `page.clock` before the first
navigation and use `fastForward`, not `runFor`: `runFor` replays every timer
callback along the way, which measured 2.7s of the rooms auto-refresh test on
its own. `fastForward` jumps to the target instant — that test went 5.6s → 1.6s.

Visual baselines are environment-sensitive: snapshots rendered on Windows will not match CI's Linux. Refresh them with the `Update Visual Baselines` workflow (`workflow_dispatch`) and commit the artifact rather than regenerating locally.

**Parallelism.** `workers` matches the core count — 4 on CI (`ubuntu-latest`),
unset locally — with `retries: 1` on CI only. It was 1 on CI, the Playwright
scaffold's default and never a response to an observed problem, which left three
cores idle. Do not put it back, and do not reserve a core for the dev server:
it only serves static files, since every backend call is intercepted. Locally
there are no retries, so a full run flakes occasionally on an unrelated spec;
re-run the single spec before believing it.

## Custom commands

`.claude/commands/` provides `/a11y-audit`, `/design-audit`, and `/design-review`.

## Deployment

Docker multi-stage: `node:24-alpine` builds the SPA, `nginx:alpine` serves `dist/`. `nginx.conf.template` is rendered by nginx's envsubst with `BACKEND_URL` (filtered to the `BACKEND` prefix), proxying `/api/` to the backend.

Caching in nginx: hashed `/assets/` are immutable for a year; `index.html` is `no-cache` so deploys take effect immediately.

Images go to ECR (`864573346741.dkr.ecr.ap-northeast-2.amazonaws.com/tag2-now/fe`). Production is a **single AWS Lightsail instance** running docker compose alongside the backend and its datastores — not ECS.

The site is served at **`match.tag2now.click`**, which fronts both the SPA and
`/api` through CloudFront — responses on both carry a `Via: … cloudfront.net`
header. The bare `tag2now.click` has no address record and serves nothing, so
absolute URLs (`og:url`, `canonical`) must use the `match.` host.

| Workflow | Trigger | Does |
|----------|---------|------|
| `test.yml` | PR to `dev`/`master` | unit tests + typecheck, then E2E |
| `deploy.yml` | `v*` tag | full test suite, build and push to ECR, then deploy to production over SSH |
| `update-snapshots.yml` | manual | regenerate visual baselines, upload as artifact |

### Versioning

There is no `APP_VERSION` constant. `src/config/patchNotes.ts` is the single
source of truth: `PATCH_NOTES[0].version` is exported as `LATEST_PATCH_VERSION`,
which drives both the version shown in the header and the "seen" marker that
decides whether the patch-notes dialog reappears. Adding an entry to the top of
that array is therefore the whole version bump — there is no second constant to
remember, which is what previously let the header, the dialog, and the tags
drift apart.

The one pairing still done by hand is the release tag: tag `v{version}` to match
the new top entry.

**Release is automatic on a `v*` tag.** The `deploy` job SSHes into Lightsail,
writes `FE_IMAGE_TAG` into the instance's `.env.prod`, and restarts **only
`fe`** — `be` and the datastores are left alone, and are released independently
by the backend repo.

`compose.prod.yml` lives in **tag2now-BE** and describes the whole stack,
including this service's image. A change to how `fe` runs in production belongs
in that repo.

The SSH and ECR settings are **org-level** secrets/variables on the `tag2now`
org, shared with tag2now-BE; this repo defines only `ECR_REPOSITORY`
(`tag2-now/fe`) and its own `production` environment. See
[aws-setup.md](../tag2now-BE/docs/aws-setup.md#actions-configuration).

## Analytics

Google Analytics (`G-S4Y67MPNPR`) is loaded via a gtag snippet in `index.html`. Device category and OS are collected automatically by Enhanced Measurement — no per-event code. Check *Reports → Tech → Tech details* before adding custom tracking.

Because the SPA has no router, GA4 records one `page_view` per load; tab switches are not tracked.

The CloudFront distribution is on the **Free plan**, where standard and real-time access logging are locked behind paid tiers, so the S3 → Athena pipeline described in `aws-setup.md` cannot currently be enabled. GA4 is the only source actually collecting.
